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
  scorerId: string | null;
  scorerName: string | null;
  eventId?: string;
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

  useLiveRefresh(["hole_scores", "matches"], props.eventId);

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

  const canEnter =
    props.isAdmin ||
    (!!props.scorerId && props.myId === props.scorerId);

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
        ? `THRU ${live.holesBothPlayed}`
        : "PENDING";

  const liveHeadline = (() => {
    if (live.status === "final") {
      if (live.winnerId === null) return "Halved";
      const winner = live.winnerId === props.player1.id ? props.player1 : props.player2;
      const margin = Math.abs((live.p1TotalNet ?? 0) - (live.p2TotalNet ?? 0));
      return `${winner.name} by ${margin}`;
    }
    if (live.status === "in_progress") {
      if (live.netDiff === 0) return "All square";
      return live.netDiff > 0
        ? `${props.player1.name} −${live.netDiff}`
        : `${props.player2.name} −${Math.abs(live.netDiff)}`;
    }
    return "—";
  })();

  return (
    <div>
      {/* HERO — navy field with the matchup */}
      <div
        className="navy-grain text-[var(--color-cream)]"
        style={{ borderBottom: "1px solid var(--color-gold)" }}
      >
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-7 md:py-10">
          <Link
            href="/day1"
            className="inline-flex items-center gap-1 text-[var(--color-cream)]"
            style={{ opacity: 0.85 }}
          >
            <ChevronLeft size={16} />
            <span
              className="font-ui uppercase"
              style={{
                fontSize: 10,
                letterSpacing: "0.32em",
                color: "var(--color-gold)",
                fontWeight: 500,
              }}
            >
              MATCH {matchRoman} · DAY I · {props.round.course_name.toUpperCase()}
            </span>
          </Link>
          {props.scorerName && (
            <div
              className="font-ui uppercase mt-2"
              style={{
                fontSize: 9,
                letterSpacing: "0.28em",
                color: canEnter ? "var(--color-gold)" : "var(--color-stone)",
                fontWeight: 500,
              }}
            >
              Scored by {props.scorerName}
              {!canEnter ? " · read only" : ""}
            </div>
          )}
          <div
            className="grid items-center gap-4 mt-5"
            style={{ gridTemplateColumns: "1fr auto 1fr" }}
          >
            <div>
              <div
                className="font-display"
                style={{
                  fontSize: 56,
                  lineHeight: 1,
                  color: "var(--color-cream)",
                }}
              >
                {props.player1.name}
              </div>
              <div
                className="font-ui uppercase mt-2"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.3em",
                  color: "var(--color-cream)",
                  opacity: 0.7,
                }}
              >
                HCP {roundHandicap(props.player1.handicap)} · {props.player1.team.name.toUpperCase()}
                {p1Strokes > 0 ? ` · GETS ${p1Strokes}` : ""}
              </div>
            </div>
            <div className="text-center">
              {live.status === "in_progress" ? (
                <div
                  className="pulse-live inline-flex items-center gap-1.5"
                  style={{
                    fontFamily: "var(--font-ui)",
                    fontSize: 9,
                    letterSpacing: "0.3em",
                    color: "var(--color-oxblood)",
                    fontWeight: 600,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: "var(--color-oxblood)",
                    }}
                  />
                  {liveBanner}
                </div>
              ) : (
                <div
                  className="font-ui uppercase"
                  style={{
                    fontSize: 9,
                    letterSpacing: "0.3em",
                    color: "var(--color-stone)",
                    fontWeight: 600,
                  }}
                >
                  {liveBanner}
                </div>
              )}
              <div
                className="font-mono mt-2"
                style={{
                  fontSize: 32,
                  color: "var(--color-gold)",
                }}
              >
                {liveHeadline}
              </div>
            </div>
            <div className="text-right">
              <div
                className="font-display"
                style={{
                  fontSize: 56,
                  lineHeight: 1,
                  color: "var(--color-cream)",
                }}
              >
                {props.player2.name}
              </div>
              <div
                className="font-ui uppercase mt-2"
                style={{
                  fontSize: 9,
                  letterSpacing: "0.3em",
                  color: "var(--color-cream)",
                  opacity: 0.7,
                }}
              >
                HCP {roundHandicap(props.player2.handicap)} · {props.player2.team.name.toUpperCase()}
                {p2Strokes > 0 ? ` · GETS ${p2Strokes}` : ""}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="paper-grain bg-[var(--color-cream)] pb-16 md:pb-24">
        <div className="mx-auto max-w-[1100px] px-0 md:px-8 pt-6 md:pt-10">
          <div className="px-5 md:px-0 mb-3">
            <div className="eyebrow">The card</div>
          </div>
          <table className="w-full scorecard-cell" style={{ fontSize: 14 }}>
            <thead style={{ background: "var(--color-navy)" }}>
              <tr>
                <th
                  className="py-2.5 text-left"
                  style={{
                    paddingLeft: 18,
                    color: "var(--color-cream)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
                  H
                </th>
                <th
                  className="py-2.5"
                  style={{
                    color: "var(--color-cream)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
                  Par
                </th>
                <th
                  className="py-2.5 text-right"
                  style={{
                    color: "var(--color-cream)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
                  {props.player1.name}
                </th>
                <th
                  className="py-2.5 text-right"
                  style={{
                    paddingRight: 18,
                    color: "var(--color-cream)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
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
                        ? "rgba(165,136,89,0.14)"
                        : idx % 2
                          ? "var(--color-paper)"
                          : "transparent",
                      borderBottom: "1px solid var(--color-rule)",
                    }}
                  >
                    <td
                      className="py-2"
                      style={{
                        paddingLeft: 18,
                        color: "var(--color-navy)",
                      }}
                    >
                      {h.hole_number}
                    </td>
                    <td
                      className="py-2"
                      style={{ color: "var(--color-stone)" }}
                    >
                      {h.par}
                    </td>
                    <td
                      className={`py-2 text-right ${canEnter && !props.round.is_locked ? "cursor-pointer hover:bg-[var(--color-cream)]" : ""}`}
                      style={{ color: "var(--color-navy)" }}
                      onClick={() =>
                        canEnter &&
                        !props.round.is_locked &&
                        openHole(props.player1.id, h.hole_number, h.par)
                      }
                    >
                      {s1 ?? "·"}
                    </td>
                    <td
                      className={`py-2 text-right ${canEnter && !props.round.is_locked ? "cursor-pointer hover:bg-[var(--color-cream)]" : ""}`}
                      style={{
                        paddingRight: 18,
                        color: "var(--color-navy)",
                      }}
                      onClick={() =>
                        canEnter &&
                        !props.round.is_locked &&
                        openHole(props.player2.id, h.hole_number, h.par)
                      }
                    >
                      {s2 ?? "·"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="px-5 md:px-0 pt-6 flex gap-2.5">
            {firstEmpty && canEnter && !props.round.is_locked && (
              <button
                className="flex-1 bg-[var(--color-navy)] text-[var(--color-cream)] font-ui font-medium uppercase"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.3em",
                  padding: "16px 0",
                }}
                onClick={() => {
                  const h = props.holes.find((x) => x.hole_number === firstEmpty);
                  if (!h) return;
                  const missingId = !p1Scores.has(firstEmpty)
                    ? props.player1.id
                    : props.player2.id;
                  openHole(missingId, firstEmpty, h.par);
                }}
              >
                Enter Hole {firstEmpty}
              </button>
            )}
            <Link
              href="/day1"
              className="flex-1 text-center text-[var(--color-navy)] font-ui font-medium uppercase"
              style={{
                fontSize: 11,
                letterSpacing: "0.3em",
                padding: "16px 0",
                border: "1px solid var(--color-navy)",
              }}
            >
              All Matches
            </Link>
          </div>
        </div>

        {sheet && (
          <HoleEntrySheet
            open
            onClose={() => setSheet(null)}
            onSubmit={(strokes) =>
              saveScore(sheet.playerId, sheet.holeNumber, strokes)
            }
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

