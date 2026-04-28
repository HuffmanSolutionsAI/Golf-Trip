"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveRefresh } from "@/lib/client/useLiveRefresh";
import { HoleEntrySheet } from "@/components/scoring/HoleEntrySheet";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { computeDay1MatchResult } from "@/lib/scoring/day1";
import { roundHandicap } from "@/lib/scoring/handicaps";
import { toRoman } from "@/lib/utils";
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

  const p1Strokes = props.match.stroke_giver_id === props.player1.id ? props.match.strokes_given : 0;
  const p2Strokes = props.match.stroke_giver_id === props.player2.id ? props.match.strokes_given : 0;
  const matchRoman = toRoman(props.match.match_number);

  const liveBanner =
    live.status === "final"
      ? "FINAL"
      : live.status === "in_progress"
        ? `LIVE · THRU ${live.holesBothPlayed}`
        : "PENDING";

  return (
    <div className="paper-grain min-h-screen">
      <div
        className="navy-grain text-[var(--color-cream)] px-4 pt-3 pb-5"
        style={{ borderBottom: "1px solid rgba(165,136,89,0.4)" }}
      >
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center justify-between">
            <Link
              href="/day1"
              className="flex items-center gap-1 text-sm font-ui"
              style={{ color: "var(--color-cream)", opacity: 0.85 }}
            >
              <ChevronLeft size={16} />
              <span
                className="eyebrow-cream"
                style={{ opacity: 1, fontSize: 10 }}
              >{`MATCH ${matchRoman} · DAY I · ${props.round.course_name.toUpperCase()}`}</span>
            </Link>
          </div>

          <div className="mt-3 grid items-center gap-2" style={{ gridTemplateColumns: "1fr auto 1fr" }}>
            <div>
              <div
                className="font-display"
                style={{ fontSize: 24, lineHeight: 1, color: "var(--color-cream)" }}
              >
                {props.player1.name}
              </div>
              <div className="eyebrow-cream mt-1.5" style={{ fontSize: 8, opacity: 0.7 }}>
                HCP {roundHandicap(props.player1.handicap)} · {props.player1.team.name.toUpperCase()}
                {p1Strokes > 0 ? ` · GETS ${p1Strokes}` : ""}
              </div>
            </div>
            <div
              className="font-body-serif italic text-[11px]"
              style={{ color: "var(--color-cream)", opacity: 0.55 }}
            >
              versus
            </div>
            <div className="text-right">
              <div
                className="font-display"
                style={{ fontSize: 24, lineHeight: 1, color: "var(--color-cream)" }}
              >
                {props.player2.name}
              </div>
              <div className="eyebrow-cream mt-1.5" style={{ fontSize: 8, opacity: 0.7 }}>
                HCP {roundHandicap(props.player2.handicap)} · {props.player2.team.name.toUpperCase()}
                {p2Strokes > 0 ? ` · GETS ${p2Strokes}` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
        <div
          className="text-center py-4"
          style={{ borderBottom: "1px solid var(--color-rule)" }}
        >
          <div className="eyebrow">{liveBanner}</div>
          <div
            className="font-display text-[var(--color-navy)] mt-1.5"
            style={{ fontSize: 28, lineHeight: 1 }}
          >
            {liveStatusHeadline(live, props.player1, props.player2)}
          </div>
          <div className="font-body-serif italic text-[12px] text-[var(--color-stone)] mt-1">
            {liveStatusSub(live)}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3 text-sm">
          <div>
            <div className="eyebrow-stone" style={{ fontSize: 9 }}>
              {props.player1.name.toUpperCase()}
            </div>
            <div className="font-mono text-lg tabular-nums text-[var(--color-navy)] mt-0.5">
              {live.p1TotalGross}{" "}
              <span className="text-[var(--color-stone)]">({live.p1TotalNet ?? "—"})</span>
            </div>
          </div>
          <div className="text-center">
            <div className="eyebrow-stone" style={{ fontSize: 9 }}>
              NET DIFF
            </div>
            <div className="font-mono text-lg tabular-nums text-[var(--color-navy)] mt-0.5">
              {formatNetDiff(live.netDiff, props.player1.name, props.player2.name, live.holesBothPlayed)}
            </div>
          </div>
          <div className="text-right">
            <div className="eyebrow-stone" style={{ fontSize: 9 }}>
              {props.player2.name.toUpperCase()}
            </div>
            <div className="font-mono text-lg tabular-nums text-[var(--color-navy)] mt-0.5">
              {live.p2TotalGross}{" "}
              <span className="text-[var(--color-stone)]">({live.p2TotalNet ?? "—"})</span>
            </div>
          </div>
        </div>

        <div className="pt-2">
          <div className="eyebrow mb-2">The card</div>
          <div className="overflow-hidden border border-[var(--color-rule)]">
            <table className="w-full text-sm scorecard-cell">
              <thead className="bg-[var(--color-navy)] text-[var(--color-cream)]">
                <tr>
                  <th className="py-2 px-3 text-left text-[10px] font-ui font-medium uppercase tracking-[0.2em]">H</th>
                  <th className="py-2 px-3 text-left text-[10px] font-ui font-medium uppercase tracking-[0.2em]">Par</th>
                  <th className="py-2 px-3 text-right text-[10px] font-ui font-medium uppercase tracking-[0.2em]">
                    {props.player1.name}
                  </th>
                  <th className="py-2 px-3 text-right text-[10px] font-ui font-medium uppercase tracking-[0.2em]">
                    {props.player2.name}
                  </th>
                </tr>
              </thead>
              <tbody>
                {props.holes.map((h, idx) => {
                  const s1 = p1Scores.get(h.hole_number);
                  const s2 = p2Scores.get(h.hole_number);
                  const isCurrent = h.hole_number === firstEmpty;
                  return (
                    <tr
                      key={h.hole_number}
                      style={{
                        background: isCurrent
                          ? "rgba(165,136,89,0.12)"
                          : idx % 2
                            ? "var(--color-paper)"
                            : "transparent",
                        borderBottom: "1px solid var(--color-rule)",
                      }}
                    >
                      <td className="px-3 py-1.5 text-[var(--color-navy)]">{h.hole_number}</td>
                      <td className="px-3 py-1.5 text-[var(--color-stone)]">{h.par}</td>
                      <td
                        className={`px-3 py-1.5 text-right text-[var(--color-navy)] ${canEnter && !props.round.is_locked ? "cursor-pointer hover:bg-[var(--color-cream)]" : ""}`}
                        onClick={() => canEnter && !props.round.is_locked && openHole(props.player1.id, h.hole_number, h.par)}
                      >
                        {s1 ?? "·"}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right text-[var(--color-navy)] ${canEnter && !props.round.is_locked ? "cursor-pointer hover:bg-[var(--color-cream)]" : ""}`}
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
        </div>

        {firstEmpty && canEnter && !props.round.is_locked && (
          <div className="sticky bottom-16 md:bottom-0">
            <button
              className="w-full bg-[var(--color-navy)] text-[var(--color-cream)] py-4 font-ui font-medium uppercase text-[11px] tracking-[0.3em]"
              onClick={() => {
                const h = props.holes.find((x) => x.hole_number === firstEmpty);
                if (!h) return;
                const missingId = !p1Scores.has(firstEmpty)
                  ? props.player1.id
                  : props.player2.id;
                openHole(missingId, firstEmpty, h.par);
              }}
            >
              Enter hole {toRoman(firstEmpty)}
            </button>
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
    </div>
  );
}

function liveStatusHeadline(
  live: { status: string; netDiff: number; winnerId: string | null; p1TotalNet: number | null; p2TotalNet: number | null },
  p1: { id: string; name: string; team: { name: string } },
  p2: { id: string; name: string; team: { name: string } },
): string {
  if (live.status === "final") {
    if (live.winnerId === null) return "Halved";
    const winner = live.winnerId === p1.id ? p1 : p2;
    const margin = Math.abs((live.p1TotalNet ?? 0) - (live.p2TotalNet ?? 0));
    return `${winner.name} wins by ${margin}`;
  }
  if (live.status === "in_progress") {
    if (live.netDiff === 0) return "All square";
    return live.netDiff > 0 ? `${p1.name} −${live.netDiff}` : `${p2.name} −${Math.abs(live.netDiff)}`;
  }
  return "Awaiting first score";
}

function liveStatusSub(live: { status: string; winnerId: string | null }) {
  if (live.status === "final") {
    return live.winnerId === null ? "1 pt each." : "+2 to the winning team.";
  }
  if (live.status === "in_progress") {
    return "Net match — total strokes decide.";
  }
  return "The round has not begun.";
}

function formatNetDiff(diff: number, p1Name: string, p2Name: string, holesBothPlayed: number): string {
  if (holesBothPlayed === 0) return "—";
  if (diff === 0) return "Tied";
  if (diff > 0) return `${p1Name} −${diff}`;
  return `${p2Name} −${Math.abs(diff)}`;
}
