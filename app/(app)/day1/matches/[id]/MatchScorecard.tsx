"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveRefresh } from "@/lib/client/useLiveRefresh";
import { HoleEntrySheet } from "@/components/scoring/HoleEntrySheet";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { computeDay1MatchResult } from "@/lib/scoring/day1";
import { roundHandicap } from "@/lib/scoring/handicaps";
import { toRoman, formatTeeTime } from "@/lib/utils";
import type {
  Day1MatchStateRow,
  HoleRow,
  HoleScoreRow,
  MatchRow,
  PlayerRow,
  RoundRow,
  TeamRow,
} from "@/lib/types";

type Player = PlayerRow & { team: TeamRow };

export type MatchInfo = {
  match: MatchRow;
  state: Day1MatchStateRow | null;
  player1: Player;
  player2: Player;
};

type Props = {
  matches: MatchInfo[];
  groupNumber: number | null;
  scheduledTime: string | null;
  round: RoundRow;
  holes: HoleRow[];
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
    matchId: string;
    playerId: string;
    playerLabel: string;
    initial: number | null;
    notes: string[];
  } | null>(null);

  useLiveRefresh(["hole_scores", "matches"], props.eventId);

  useEffect(() => setScores(props.initialScores), [props.initialScores]);

  const allPlayers: Player[] = props.matches.flatMap((mi) => [mi.player1, mi.player2]);

  const matchByPlayer = new Map<string, MatchRow>();
  for (const mi of props.matches) {
    matchByPlayer.set(mi.player1.id, mi.match);
    matchByPlayer.set(mi.player2.id, mi.match);
  }

  const scoresByPlayer = new Map<string, Map<number, number>>();
  for (const p of allPlayers) scoresByPlayer.set(p.id, new Map());
  scores.forEach((s) => {
    if (scoresByPlayer.has(s.player_id)) {
      scoresByPlayer.get(s.player_id)!.set(s.hole_number, s.strokes);
    }
  });

  const liveByMatch = useMemo(() => {
    const m = new Map<string, ReturnType<typeof computeDay1MatchResult>>();
    for (const mi of props.matches) {
      const p1Scores = scoresByPlayer.get(mi.player1.id) ?? new Map();
      const p2Scores = scoresByPlayer.get(mi.player2.id) ?? new Map();
      m.set(
        mi.match.id,
        computeDay1MatchResult(
          {
            p1Id: mi.player1.id,
            p2Id: mi.player2.id,
            strokeGiverId: mi.match.stroke_giver_id,
            strokesGiven: mi.match.strokes_given,
          },
          p1Scores,
          p2Scores,
        ),
      );
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, props.matches]);

  const canEnter =
    props.isAdmin || (!!props.scorerId && props.myId === props.scorerId);

  const firstEmpty = (() => {
    for (let h = 1; h <= 18; h++) {
      for (const p of allPlayers) {
        if (!scoresByPlayer.get(p.id)?.has(h)) return h;
      }
    }
    return null;
  })();

  async function saveScore(
    matchId: string,
    playerId: string,
    holeNumber: number,
    strokes: number,
  ) {
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
      body: JSON.stringify({ matchId, playerId, holeNumber, strokes }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Save failed.");
    }
    router.refresh();
  }

  function openHole(playerId: string, holeNumber: number, par: number) {
    const player = allPlayers.find((p) => p.id === playerId);
    const m = matchByPlayer.get(playerId);
    if (!player || !m) return;
    const notes: string[] = [];
    if (props.round.is_locked) notes.push("Round is locked — admin only");
    const current = scoresByPlayer.get(playerId)?.get(holeNumber) ?? null;
    setSheet({
      holeNumber,
      par,
      matchId: m.id,
      playerId,
      playerLabel: player.name,
      initial: current,
      notes,
    });
  }

  const groupLabel = (() => {
    if (props.groupNumber === null) return "MATCH";
    const time = props.scheduledTime ? formatTeeTime(props.scheduledTime) : null;
    return `TEE ${toRoman(props.groupNumber)}${time ? ` · ${time.toUpperCase()}` : ""}`;
  })();

  return (
    <div>
      {/* HERO — group header + stacked match cards */}
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
              {groupLabel} · DAY I · {props.round.course_name.toUpperCase()}
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

          <div className="mt-5 space-y-4">
            {props.matches.map((mi, idx) => (
              <MatchHeaderCard
                key={mi.match.id}
                info={mi}
                live={liveByMatch.get(mi.match.id)!}
                primary={idx === 0}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="paper-grain bg-[var(--color-cream)] pb-16 md:pb-24">
        <div className="mx-auto max-w-[1100px] px-0 md:px-8 pt-6 md:pt-10">
          <div className="px-5 md:px-0 mb-3">
            <div className="eyebrow">The card</div>
          </div>
          <table className="w-full scorecard-cell" style={{ fontSize: 13 }}>
            <thead style={{ background: "var(--color-navy)" }}>
              <tr>
                <th
                  className="py-2.5 text-left"
                  style={{
                    paddingLeft: 12,
                    color: "var(--color-cream)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
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
                    letterSpacing: "0.18em",
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
                  Par
                </th>
                {allPlayers.map((p, i) => {
                  const startsNewMatch = i > 0 && i % 2 === 0;
                  return (
                    <th
                      key={p.id}
                      className="py-2.5 text-right"
                      style={{
                        paddingRight: i === allPlayers.length - 1 ? 12 : 0,
                        color: "var(--color-cream)",
                        fontFamily: "var(--font-ui)",
                        fontSize: 10,
                        letterSpacing: "0.18em",
                        fontWeight: 500,
                        textTransform: "uppercase",
                        borderLeft: startsNewMatch
                          ? "1px solid rgba(165,136,89,0.5)"
                          : undefined,
                      }}
                    >
                      {p.name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {props.holes.map((h, idx) => {
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
                        paddingLeft: 12,
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
                    {allPlayers.map((p, i) => {
                      const s = scoresByPlayer.get(p.id)?.get(h.hole_number);
                      const startsNewMatch = i > 0 && i % 2 === 0;
                      return (
                        <td
                          key={p.id}
                          className={`py-2 text-right ${canEnter && !props.round.is_locked ? "cursor-pointer hover:bg-[var(--color-cream)]" : ""}`}
                          style={{
                            paddingRight: i === allPlayers.length - 1 ? 12 : 0,
                            color: "var(--color-navy)",
                            borderLeft: startsNewMatch
                              ? "1px solid var(--color-rule)"
                              : undefined,
                          }}
                          onClick={() =>
                            canEnter &&
                            !props.round.is_locked &&
                            openHole(p.id, h.hole_number, h.par)
                          }
                        >
                          {s ?? "·"}
                        </td>
                      );
                    })}
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
                  const missing = allPlayers.find(
                    (p) => !scoresByPlayer.get(p.id)?.has(firstEmpty),
                  );
                  if (!missing) return;
                  openHole(missing.id, firstEmpty, h.par);
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
              saveScore(sheet.matchId, sheet.playerId, sheet.holeNumber, strokes)
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

function MatchHeaderCard({
  info,
  live,
  primary,
}: {
  info: MatchInfo;
  live: ReturnType<typeof computeDay1MatchResult>;
  primary: boolean;
}) {
  const { match, player1, player2 } = info;
  const p1Strokes = match.stroke_giver_id === player1.id ? match.strokes_given : 0;
  const p2Strokes = match.stroke_giver_id === player2.id ? match.strokes_given : 0;

  const banner =
    live.status === "final"
      ? "FINAL"
      : live.status === "in_progress"
        ? `THRU ${live.holesBothPlayed}`
        : "PENDING";

  const headline = (() => {
    if (live.status === "final") {
      if (live.winnerId === null) return "Halved";
      const winner = live.winnerId === player1.id ? player1 : player2;
      const margin = Math.abs((live.p1TotalNet ?? 0) - (live.p2TotalNet ?? 0));
      return `${winner.name} by ${margin}`;
    }
    if (live.status === "in_progress") {
      if (live.netDiff === 0) return "All square";
      return live.netDiff > 0
        ? `${player1.name} −${live.netDiff}`
        : `${player2.name} −${Math.abs(live.netDiff)}`;
    }
    return "—";
  })();

  return (
    <div
      style={{
        padding: "16px 18px",
        border: primary
          ? "1px solid var(--color-gold)"
          : "1px solid rgba(165,136,89,0.3)",
        background: primary ? "rgba(165,136,89,0.08)" : "transparent",
      }}
    >
      <div className="flex items-baseline justify-between mb-2">
        <span
          className="font-ui uppercase"
          style={{
            fontSize: 9,
            letterSpacing: "0.28em",
            color: "var(--color-gold)",
            fontWeight: 500,
          }}
        >
          MATCH {toRoman(match.match_number)}
        </span>
        {live.status === "in_progress" ? (
          <span
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
            {banner}
          </span>
        ) : (
          <span
            className="font-ui uppercase"
            style={{
              fontSize: 9,
              letterSpacing: "0.3em",
              color: "var(--color-stone)",
              fontWeight: 600,
            }}
          >
            {banner}
          </span>
        )}
      </div>
      <div
        className="grid items-center gap-3"
        style={{ gridTemplateColumns: "1fr auto 1fr" }}
      >
        <div>
          <div
            className="font-display"
            style={{
              fontSize: primary ? 32 : 24,
              lineHeight: 1,
              color: "var(--color-cream)",
            }}
          >
            {player1.name}
          </div>
          <div
            className="font-ui uppercase mt-1.5"
            style={{
              fontSize: 9,
              letterSpacing: "0.26em",
              color: "var(--color-cream)",
              opacity: 0.65,
            }}
          >
            HCP {roundHandicap(player1.handicap)}
            {p1Strokes > 0 ? ` · GETS ${p1Strokes}` : ""}
          </div>
        </div>
        <div
          className="font-body-serif italic text-center"
          style={{ fontSize: 13, color: "var(--color-cream)", opacity: 0.5 }}
        >
          vs.
        </div>
        <div className="text-right">
          <div
            className="font-display"
            style={{
              fontSize: primary ? 32 : 24,
              lineHeight: 1,
              color: "var(--color-cream)",
            }}
          >
            {player2.name}
          </div>
          <div
            className="font-ui uppercase mt-1.5"
            style={{
              fontSize: 9,
              letterSpacing: "0.26em",
              color: "var(--color-cream)",
              opacity: 0.65,
            }}
          >
            HCP {roundHandicap(player2.handicap)}
            {p2Strokes > 0 ? ` · GETS ${p2Strokes}` : ""}
          </div>
        </div>
      </div>
      <div
        className="font-mono text-center mt-2"
        style={{
          fontSize: primary ? 22 : 18,
          color: "var(--color-gold)",
        }}
      >
        {headline}
      </div>
    </div>
  );
}
