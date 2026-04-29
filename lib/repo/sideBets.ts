import "server-only";
import { getDb, genId } from "@/lib/db";
import { getCurrentEventId } from "@/lib/repo/events";
import type {
  SideBetCalcuttaLotRow,
  SideBetEntryRow,
  SideBetPayoutRow,
  SideBetRow,
  SideBetType,
} from "@/lib/types";

// Wagering ledger. (Plan A · Phase 4a)
//
// All side bets are scoped to an event. Settled bets are immutable —
// no entries added, no buy-in changes; only delete-and-recreate is
// allowed (and only by the commissioner).

export function listSideBets(): SideBetRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM side_bets WHERE event_id = ? ORDER BY status, created_at DESC`,
    )
    .all(getCurrentEventId()) as SideBetRow[];
}

export function getSideBet(id: string): SideBetRow | null {
  return (
    (getDb()
      .prepare(`SELECT * FROM side_bets WHERE id = ? AND event_id = ?`)
      .get(id, getCurrentEventId()) as SideBetRow) ?? null
  );
}

export function listEntries(sideBetId: string): SideBetEntryRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM side_bet_entries WHERE side_bet_id = ? ORDER BY joined_at`,
    )
    .all(sideBetId) as SideBetEntryRow[];
}

export function listPayouts(sideBetId: string): SideBetPayoutRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM side_bet_payouts WHERE side_bet_id = ? ORDER BY created_at`,
    )
    .all(sideBetId) as SideBetPayoutRow[];
}

export type CreateSideBetInput = {
  type: SideBetType;
  name: string;
  description?: string | null;
  buy_in_cents: number;
  round_id?: string | null;
  rules_json?: string | null;
};

export function createSideBet(
  eventId: string,
  input: CreateSideBetInput,
): SideBetRow {
  const id = genId("sb");
  getDb()
    .prepare(
      `INSERT INTO side_bets
         (id, event_id, type, name, description, buy_in_cents, round_id, rules_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      id,
      eventId,
      input.type,
      input.name,
      input.description ?? null,
      input.buy_in_cents,
      input.round_id ?? null,
      input.rules_json ?? null,
    );
  return (
    getDb()
      .prepare(`SELECT * FROM side_bets WHERE id = ?`)
      .get(id) as SideBetRow
  );
}

export function addPlayerEntry(
  sideBetId: string,
  playerId: string,
): SideBetEntryRow {
  const id = genId("sbe");
  getDb()
    .prepare(
      `INSERT INTO side_bet_entries (id, side_bet_id, player_id) VALUES (?, ?, ?)`,
    )
    .run(id, sideBetId, playerId);
  return (
    getDb()
      .prepare(`SELECT * FROM side_bet_entries WHERE id = ?`)
      .get(id) as SideBetEntryRow
  );
}

export function addTeamEntry(
  sideBetId: string,
  teamId: string,
): SideBetEntryRow {
  const id = genId("sbe");
  getDb()
    .prepare(
      `INSERT INTO side_bet_entries (id, side_bet_id, team_id) VALUES (?, ?, ?)`,
    )
    .run(id, sideBetId, teamId);
  return (
    getDb()
      .prepare(`SELECT * FROM side_bet_entries WHERE id = ?`)
      .get(id) as SideBetEntryRow
  );
}

export function removePlayerEntry(
  sideBetId: string,
  playerId: string,
): boolean {
  const result = getDb()
    .prepare(
      `DELETE FROM side_bet_entries WHERE side_bet_id = ? AND player_id = ?`,
    )
    .run(sideBetId, playerId);
  return result.changes > 0;
}

export function removeTeamEntry(
  sideBetId: string,
  teamId: string,
): boolean {
  const result = getDb()
    .prepare(
      `DELETE FROM side_bet_entries WHERE side_bet_id = ? AND team_id = ?`,
    )
    .run(sideBetId, teamId);
  return result.changes > 0;
}

export type PayoutInput = {
  recipient_player_id?: string | null;
  recipient_team_id?: string | null;
  amount_cents: number;
  note?: string | null;
};

// Atomically: insert all payouts and flip the bet to 'settled'.
export function settleSideBet(
  sideBetId: string,
  payouts: PayoutInput[],
): void {
  const db = getDb();
  const insPayout = db.prepare(
    `INSERT INTO side_bet_payouts
       (id, side_bet_id, recipient_player_id, recipient_team_id, amount_cents, note)
       VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const flipStatus = db.prepare(
    `UPDATE side_bets SET status = 'settled', updated_at = datetime('now') WHERE id = ?`,
  );
  const tx = db.transaction(() => {
    for (const p of payouts) {
      insPayout.run(
        genId("sbp"),
        sideBetId,
        p.recipient_player_id ?? null,
        p.recipient_team_id ?? null,
        p.amount_cents,
        p.note ?? null,
      );
    }
    flipStatus.run(sideBetId);
  });
  tx();
}

export function deleteSideBet(sideBetId: string): void {
  // Cascades entries + payouts via FK ON DELETE CASCADE.
  getDb().prepare(`DELETE FROM side_bets WHERE id = ?`).run(sideBetId);
}

// ---- Calcutta lots (Plan A · Phase 4d) ----

export function listLots(sideBetId: string): SideBetCalcuttaLotRow[] {
  return getDb()
    .prepare(
      `SELECT * FROM side_bet_calcutta_lots WHERE side_bet_id = ? ORDER BY created_at`,
    )
    .all(sideBetId) as SideBetCalcuttaLotRow[];
}

export function upsertLot(args: {
  sideBetId: string;
  teamId: string;
  bidderPlayerId: string;
  bidCents: number;
}): SideBetCalcuttaLotRow {
  const db = getDb();
  const existing = db
    .prepare(
      `SELECT id FROM side_bet_calcutta_lots WHERE side_bet_id = ? AND team_id = ?`,
    )
    .get(args.sideBetId, args.teamId) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE side_bet_calcutta_lots
         SET bidder_player_id = ?, bid_cents = ?
         WHERE id = ?`,
    ).run(args.bidderPlayerId, args.bidCents, existing.id);
    return db
      .prepare(`SELECT * FROM side_bet_calcutta_lots WHERE id = ?`)
      .get(existing.id) as SideBetCalcuttaLotRow;
  }
  const id = genId("sbl");
  db.prepare(
    `INSERT INTO side_bet_calcutta_lots
       (id, side_bet_id, team_id, bidder_player_id, bid_cents)
       VALUES (?, ?, ?, ?, ?)`,
  ).run(
    id,
    args.sideBetId,
    args.teamId,
    args.bidderPlayerId,
    args.bidCents,
  );
  return db
    .prepare(`SELECT * FROM side_bet_calcutta_lots WHERE id = ?`)
    .get(id) as SideBetCalcuttaLotRow;
}

export function deleteLot(sideBetId: string, teamId: string): boolean {
  const result = getDb()
    .prepare(
      `DELETE FROM side_bet_calcutta_lots WHERE side_bet_id = ? AND team_id = ?`,
    )
    .run(sideBetId, teamId);
  return result.changes > 0;
}

export function updateSideBet(
  sideBetId: string,
  patch: {
    name?: string;
    description?: string | null;
    buy_in_cents?: number;
    round_id?: string | null;
  },
): void {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push("name = ?");
    values.push(patch.name);
  }
  if (patch.description !== undefined) {
    sets.push("description = ?");
    values.push(patch.description);
  }
  if (patch.buy_in_cents !== undefined) {
    sets.push("buy_in_cents = ?");
    values.push(patch.buy_in_cents);
  }
  if (patch.round_id !== undefined) {
    sets.push("round_id = ?");
    values.push(patch.round_id);
  }
  if (sets.length === 0) return;
  sets.push("updated_at = datetime('now')");
  values.push(sideBetId);
  getDb()
    .prepare(`UPDATE side_bets SET ${sets.join(", ")} WHERE id = ?`)
    .run(...values);
}
