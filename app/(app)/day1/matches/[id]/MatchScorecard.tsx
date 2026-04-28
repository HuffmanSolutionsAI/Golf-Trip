"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveRefresh } from "@/lib/client/useLiveRefresh";
import { HoleEntrySheet } from "@/components/scoring/HoleEntrySheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardEyebrow } from "@/components/ui/card";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { computeDay1MatchResult } from "@/lib/scoring/day1";
import { roundHandicap } from "@/lib/scoring/handicaps";
import type {
  Day1MatchStateRow,
  HoleRow,
  HoleScoreRow,
  MatchRow,
  PlayerRow,
  RoundRow,
  TeamRow,
} from "@/lib/types";

type Props = {
  match: MatchRow;
  round: RoundRow;
  holes: HoleRow[];
  state: Day1MatchStateRow | null;
  player1: PlayerRow & { team: TeamRow };
  player2: PlayerRow & { team: TeamRow };
  initialScores: HoleScoreRow[];
  myId: string | null;
  isAdmin: boolean;
};

export function MatchScorecard(props: Props) {
  const router = useRouter();
  const [scores, setScores] = useState<HoleScoreRow[]>(props.initialScores);
  const [sheet, setSheet] = useState<{
    holeNumber: number;
    par: number;
    playerId: string;
    playerLabel: string;
    initial: number | null;
    notes: string[];
  } | null>(null);

  useLiveRefresh(["hole_scores", "matches"]);

  useEffect(() => setScores(props.initialScores), [props.initialScores]);

  const p1Scores = new Map<number, number>();
  const p2Scores = new Map<number, number>();
  scores.forEach((s) => {
    if (s.player_id === props.player1.id) p1Scores.set(s.hole_number, s.strokes);
    else if (s.player_id === props.player2.id) p2Scores.set(s.hole_number, s.strokes);
  });

  const live = useMemo(
    () =>
      computeDay1MatchResult(
        {
          p1Id: props.player1.id,
          p2Id: props.player2.id,
          strokeGiverId: props.match.stroke_giver_id,
          strokesGiven: props.match.strokes_given,
        },
        p1Scores,
        p2Scores,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scores, props.match],
  );

  const canEnter = props.isAdmin || props.myId === props.player1.id || props.myId === props.player2.id;

  const firstEmpty = Array.from({ length: 18 }, (_, i) => i + 1).find(
    (h) => !p1Scores.has(h) || !p2Scores.has(h),
  );

  async function saveScore(playerId: string, holeNumber: number, strokes: number) {
    const placeholder: HoleScoreRow = {
      id: `optimistic-${playerId}-${holeNumber}`,
      round_id: props.round.id,
      player_id: playerId,
      scramble_entry_id: null,
      hole_number: holeNumber,
      strokes,
      entered_by: props.myId ?? "",
      entered_at: new Date().toISOString(),
    };
    setScores((prev) => {
      const without = prev.filter(
        (s) => !(s.player_id === playerId && s.hole_number === holeNumber),
      );
      return [...without, placeholder];
    });

    const res = await fetch("/api/scores/day1", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        matchId: props.match.id,
        playerId,
        holeNumber,
        strokes,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Save failed.");
    }
    router.refresh();
  }

  function openHole(playerId: string, holeNumber: number, par: number) {
    const playerLabel =
      playerId === props.player1.id ? props.player1.name : props.player2.name;
    const notes: string[] = [];
    if (props.round.is_locked) notes.push("Round is locked — admin only");
    const current =
      playerId === props.player1.id
        ? (p1Scores.get(holeNumber) ?? null)
        : (p2Scores.get(holeNumber) ?? null);
    setSheet({
      holeNumber,
      par,
      playerId,
      playerLabel,
      initial: current,
      notes,
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <Link
          href="/day1"
          className="flex items-center gap-1 text-sm font-ui text-[var(--color-navy)]"
        >
          <ChevronLeft size={16} /> Match {props.match.match_number}
        </Link>
        <div className="text-xs font-ui text-neutral-600 uppercase tracking-[0.2em]">
          {props.round.course_name}
        </div>
      </div>

      <Card>
        <CardContent className="grid grid-cols-2 gap-3">
          <PlayerHeader
            player={props.player1}
            strokes={props.match.stroke_giver_id === props.player1.id ? props.match.strokes_given : 0}
          />
          <PlayerHeader
            player={props.player2}
            strokes={props.match.stroke_giver_id === props.player2.id ? props.match.strokes_given : 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardEyebrow>
            Live status {live.status === "final" ? "· Final" : live.status === "in_progress" ? `· Thru ${live.holesBothPlayed}` : ""}
          </CardEyebrow>
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-neutral-500">{props.player1.name}</div>
              <div className="font-mono text-lg tabular-nums">
                {live.p1TotalGross} <span className="text-neutral-500">({live.p1TotalNet ?? "—"})</span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-neutral-500">Net diff</div>
              <div className="font-mono text-lg tabular-nums">
                {formatNetDiff(live.netDiff, props.player1.name, props.player2.name, live.holesBothPlayed)}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-500">{props.player2.name}</div>
              <div className="font-mono text-lg tabular-nums">
                {live.p2TotalGross} <span className="text-neutral-500">({live.p2TotalNet ?? "—"})</span>
              </div>
            </div>
          </div>
          {live.status === "final" && (
            <div className="mt-3 text-center font-display text-xl text-[var(--color-navy)]">
              {live.winnerId === null
                ? `Halved · 1 pt each`
                : live.winnerId === props.player1.id
                  ? `${props.player1.name} wins by ${Math.abs((live.p1TotalNet ?? 0) - (live.p2TotalNet ?? 0))} · +2 ${props.player1.team.name}`
                  : `${props.player2.name} wins by ${Math.abs((live.p1TotalNet ?? 0) - (live.p2TotalNet ?? 0))} · +2 ${props.player2.team.name}`}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardEyebrow>Scorecard</CardEyebrow>
          <div className="mt-2 overflow-hidden rounded-md border border-[var(--color-rule)]">
            <table className="w-full text-sm scorecard-cell">
              <thead className="bg-[var(--color-navy)] text-[var(--color-cream)]">
                <tr>
                  <th className="py-1.5 px-2 text-left text-xs font-ui font-semibold">H</th>
                  <th className="py-1.5 px-2 text-left text-xs font-ui font-semibold">Par</th>
                  <th className="py-1.5 px-2 text-right text-xs font-ui font-semibold">{props.player1.name}</th>
                  <th className="py-1.5 px-2 text-right text-xs font-ui font-semibold">{props.player2.name}</th>
                </tr>
              </thead>
              <tbody>
                {props.holes.map((h) => {
                  const s1 = p1Scores.get(h.hole_number);
                  const s2 = p2Scores.get(h.hole_number);
                  const isCurrent = h.hole_number === firstEmpty;
                  return (
                    <tr
                      key={h.hole_number}
                      className={isCurrent ? "bg-[var(--color-gold-light)]/20" : "odd:bg-[var(--color-paper)]"}
                    >
                      <td className="px-2 py-1.5">{h.hole_number}</td>
                      <td className="px-2 py-1.5">{h.par}</td>
                      <td
                        className={`px-2 py-1.5 text-right ${canEnter && !props.round.is_locked ? "cursor-pointer hover:bg-[var(--color-cream)]" : ""}`}
                        onClick={() => canEnter && !props.round.is_locked && openHole(props.player1.id, h.hole_number, h.par)}
                      >
                        {s1 ?? "·"}
                      </td>
                      <td
                        className={`px-2 py-1.5 text-right ${canEnter && !props.round.is_locked ? "cursor-pointer hover:bg-[var(--color-cream)]" : ""}`}
                        onClick={() => canEnter && !props.round.is_locked && openHole(props.player2.id, h.hole_number, h.par)}
                      >
                        {s2 ?? "·"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {firstEmpty && canEnter && !props.round.is_locked && (
        <div className="sticky bottom-16 md:bottom-0">
          <Button
            size="lg"
            variant="primary"
            className="w-full"
            onClick={() => {
              const h = props.holes.find((x) => x.hole_number === firstEmpty);
              if (!h) return;
              const missingId = !p1Scores.has(firstEmpty)
                ? props.player1.id
                : props.player2.id;
              openHole(missingId, firstEmpty, h.par);
            }}
          >
            Enter hole {firstEmpty}
          </Button>
        </div>
      )}

      {sheet && (
        <HoleEntrySheet
          open
          onClose={() => setSheet(null)}
          onSubmit={(strokes) => saveScore(sheet.playerId, sheet.holeNumber, strokes)}
          holeNumber={sheet.holeNumber}
          par={sheet.par}
          initialStrokes={sheet.initial}
          notes={sheet.notes}
          playerLabel={sheet.playerLabel}
        />
      )}
    </div>
  );
}

function PlayerHeader({
  player,
  strokes,
}: {
  player: PlayerRow & { team: TeamRow };
  strokes: number;
}) {
  return (
    <div>
      <div className="font-display text-lg text-[var(--color-navy)]">
        {player.name} <span className="text-neutral-500 text-sm">(HCP {roundHandicap(player.handicap)})</span>
      </div>
      <div className="flex items-center gap-1.5 text-xs font-ui text-neutral-700">
        <span className="inline-block w-2 h-2 rounded-full" style={{ backgroundColor: player.team.display_color }} />
        {player.team.name}
      </div>
      <div className="text-xs font-ui text-neutral-600 mt-0.5">
        {strokes === 0 ? "gets 0" : `gets ${strokes} strokes`}
      </div>
    </div>
  );
}

function formatNetDiff(diff: number, p1Name: string, p2Name: string, holesBothPlayed: number): string {
  if (holesBothPlayed === 0) return "—";
  if (diff === 0) return "Tied";
  if (diff > 0) return `${p1Name} −${diff}`;
  return `${p2Name} −${Math.abs(diff)}`;
}
