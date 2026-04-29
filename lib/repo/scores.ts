import "server-only";
import { getDb, genId, nowIso } from "@/lib/db";
import { getCurrentEventId } from "@/lib/repo/events";
import type {
  HoleScoreRow,
  MatchRow,
  ScrambleEntryRow,
  ScrambleParticipantRow,
} from "@/lib/types";

export function listScoresByRound(roundId: string): HoleScoreRow[] {
  return getDb()
    .prepare("SELECT * FROM hole_scores WHERE round_id = ?")
    .all(roundId) as HoleScoreRow[];
}

export function listScoresForPlayerOnRound(playerId: string, roundId: string): HoleScoreRow[] {
  return getDb()
    .prepare("SELECT * FROM hole_scores WHERE round_id = ? AND player_id = ?")
    .all(roundId, playerId) as HoleScoreRow[];
}

export function listScoresForScrambleEntry(entryId: string): HoleScoreRow[] {
  return getDb()
    .prepare("SELECT * FROM hole_scores WHERE scramble_entry_id = ?")
    .all(entryId) as HoleScoreRow[];
}

export function listAllScores(): HoleScoreRow[] {
  return getDb()
    .prepare(
      `SELECT hs.* FROM hole_scores hs
         JOIN rounds r ON r.id = hs.round_id
         WHERE r.event_id = ?`,
    )
    .all(getCurrentEventId()) as HoleScoreRow[];
}

export function upsertPlayerScore(args: {
  roundId: string;
  playerId: string;
  holeNumber: number;
  strokes: number;
  enteredBy: string;
}): { inserted: boolean; scoreId: string } {
  const db = getDb();
  const existing = db
    .prepare(
      "SELECT id FROM hole_scores WHERE round_id = ? AND player_id = ? AND hole_number = ?",
    )
    .get(args.roundId, args.playerId, args.holeNumber) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      "UPDATE hole_scores SET strokes = ?, entered_by = ?, entered_at = ? WHERE id = ?",
    ).run(args.strokes, args.enteredBy, nowIso(), existing.id);
    return { inserted: false, scoreId: existing.id };
  }
  const id = genId("hs");
  db.prepare(
    "INSERT INTO hole_scores (id, round_id, player_id, scramble_entry_id, hole_number, strokes, entered_by) VALUES (?, ?, ?, NULL, ?, ?, ?)",
  ).run(id, args.roundId, args.playerId, args.holeNumber, args.strokes, args.enteredBy);
  return { inserted: true, scoreId: id };
}

export function upsertScrambleScore(args: {
  roundId: string;
  scrambleEntryId: string;
  holeNumber: number;
  strokes: number;
  enteredBy: string;
}): { inserted: boolean; scoreId: string } {
  const db = getDb();
  const existing = db
    .prepare(
      "SELECT id FROM hole_scores WHERE scramble_entry_id = ? AND hole_number = ?",
    )
    .get(args.scrambleEntryId, args.holeNumber) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      "UPDATE hole_scores SET strokes = ?, entered_by = ?, entered_at = ? WHERE id = ?",
    ).run(args.strokes, args.enteredBy, nowIso(), existing.id);
    return { inserted: false, scoreId: existing.id };
  }
  const id = genId("hs");
  db.prepare(
    "INSERT INTO hole_scores (id, round_id, player_id, scramble_entry_id, hole_number, strokes, entered_by) VALUES (?, ?, NULL, ?, ?, ?, ?)",
  ).run(id, args.roundId, args.scrambleEntryId, args.holeNumber, args.strokes, args.enteredBy);
  return { inserted: true, scoreId: id };
}

export function deleteScore(id: string) {
  getDb().prepare("DELETE FROM hole_scores WHERE id = ?").run(id);
}

// --- Matches / scramble entries ---

export function listMatches(): MatchRow[] {
  return getDb()
    .prepare(
      `SELECT m.* FROM matches m
         JOIN rounds r ON r.id = m.round_id
         WHERE r.event_id = ?
         ORDER BY m.match_number`,
    )
    .all(getCurrentEventId()) as MatchRow[];
}

export function getMatch(id: string): MatchRow | null {
  const row = getDb().prepare("SELECT * FROM matches WHERE id = ?").get(id) as MatchRow | undefined;
  return row ?? null;
}

export function listScrambleEntries(roundId?: string): ScrambleEntryRow[] {
  if (roundId) {
    return getDb()
      .prepare("SELECT * FROM scramble_entries WHERE round_id = ?")
      .all(roundId) as ScrambleEntryRow[];
  }
  return getDb()
    .prepare(
      `SELECT se.* FROM scramble_entries se
         JOIN rounds r ON r.id = se.round_id
         WHERE r.event_id = ?`,
    )
    .all(getCurrentEventId()) as ScrambleEntryRow[];
}

export function getScrambleEntry(id: string): ScrambleEntryRow | null {
  const row = getDb()
    .prepare("SELECT * FROM scramble_entries WHERE id = ?")
    .get(id) as ScrambleEntryRow | undefined;
  return row ?? null;
}

export function listScrambleParticipants(): ScrambleParticipantRow[] {
  return getDb()
    .prepare(
      `SELECT sp.* FROM scramble_participants sp
         JOIN scramble_entries se ON se.id = sp.scramble_entry_id
         JOIN rounds r ON r.id = se.round_id
         WHERE r.event_id = ?`,
    )
    .all(getCurrentEventId()) as ScrambleParticipantRow[];
}

export function listParticipantsForEntry(entryId: string): ScrambleParticipantRow[] {
  return getDb()
    .prepare("SELECT * FROM scramble_participants WHERE scramble_entry_id = ?")
    .all(entryId) as ScrambleParticipantRow[];
}

export function listEntriesForPlayer(playerId: string): ScrambleParticipantRow[] {
  return getDb()
    .prepare("SELECT * FROM scramble_participants WHERE player_id = ?")
    .all(playerId) as ScrambleParticipantRow[];
}
