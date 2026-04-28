import Link from "next/link";
import { listMatches } from "@/lib/repo/scores";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { computeDay1MatchStates } from "@/lib/repo/standings";
import { getRoundByDay } from "@/lib/repo/rounds";
import { roundHandicap } from "@/lib/scoring/handicaps";
import { toRoman, formatTeeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ROMAN_LIST = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X"];

export default function Day1IndexPage() {
  const round = getRoundByDay(1);
  const matches = listMatches();
  const states = computeDay1MatchStates();
  const players = new Map(listPlayers().map((p) => [p.id, p]));
  const teams = new Map(listTeams().map((t) => [t.id, t]));
  const stateById = new Map(states.map((s) => [s.match_id, s]));

  return (
    <div>
      <div
        className="paper-grain"
        style={{ borderBottom: "1px solid var(--color-gold)" }}
      >
        <div className="mx-auto max-w-[1280px] px-5 md:px-8 py-12 md:py-16">
          <div
            className="font-ui uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.32em",
              color: "var(--color-gold)",
              fontWeight: 500,
            }}
          >
            DAY I · {round?.course_name?.toUpperCase() ?? "PINEWILD"}
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-3"
            style={{
              fontSize: 56,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            Net stroke play.
          </h1>
          <p
            className="font-body-serif italic mt-4"
            style={{
              fontSize: 17,
              color: "var(--color-stone)",
              opacity: 0.7,
              lineHeight: 1.55,
              maxWidth: 540,
            }}
          >
            Ten matches drawn by handicap. Net stroke play, total over eighteen.
            Winner takes two points.{" "}
            {round ? `Tees off ${formatTeeTime(round.tee_time)}.` : null}
          </p>
        </div>
      </div>

      <div className="paper-grain">
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-8 md:py-10">
          {matches.map((m, idx) => {
            const state = stateById.get(m.id);
            const a = players.get(m.player1_id);
            const b = players.get(m.player2_id);
            const aTeam = a ? teams.get(a.team_id) : undefined;
            const bTeam = b ? teams.get(b.team_id) : undefined;
            const isFinal = state?.status === "final";
            const isLive = state?.status === "in_progress";
            const result = (() => {
              if (!state) return "Pending";
              if (isFinal) {
                if (state.net_diff === 0) return "Halved";
                const margin = Math.abs(state.net_diff);
                const winner =
                  state.net_diff > 0 ? a?.name : b?.name;
                return `${winner} by ${margin}`;
              }
              if (isLive) {
                if (state.net_diff === 0) return "All square";
                return state.net_diff > 0
                  ? `${a?.name} −${state.net_diff} net`
                  : `${b?.name} −${Math.abs(state.net_diff)} net`;
              }
              return "Pending";
            })();
            const subStatus = isFinal
              ? "FINAL"
              : isLive
                ? `THRU ${state?.holes_both_played ?? 0}`
                : "PENDING";
            return (
              <Link
                key={m.id}
                href={`/day1/matches/${m.id}`}
                className="grid items-center gap-3 md:gap-4 py-4 md:py-5"
                style={{
                  gridTemplateColumns:
                    "30px minmax(0,1fr) auto minmax(0,1fr) 110px",
                  borderTop: idx === 0 ? "1px solid var(--color-gold)" : 0,
                  borderBottom: "1px solid var(--color-rule-cream)",
                }}
              >
                <span
                  className="font-mono"
                  style={{
                    fontSize: 18,
                    color: "var(--color-gold)",
                  }}
                >
                  {ROMAN_LIST[idx]}
                </span>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{
                        width: 8,
                        height: 8,
                        background: aTeam?.display_color,
                      }}
                    />
                    <span
                      className="font-display text-[var(--color-navy)] truncate"
                      style={{ fontSize: 22 }}
                    >
                      {a?.name}
                    </span>
                  </div>
                  <div
                    className="font-mono mt-1"
                    style={{ fontSize: 10, color: "var(--color-stone)" }}
                  >
                    HCP {a ? roundHandicap(a.handicap) : "—"}
                    {m.stroke_giver_id === m.player1_id
                      ? ` · GETS ${m.strokes_given}`
                      : ""}
                  </div>
                </div>
                <div
                  className="font-body-serif italic text-center"
                  style={{ fontSize: 13, color: "var(--color-stone)" }}
                >
                  vs.
                </div>
                <div className="min-w-0 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span
                      className="font-display text-[var(--color-navy)] truncate"
                      style={{ fontSize: 22 }}
                    >
                      {b?.name}
                    </span>
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{
                        width: 8,
                        height: 8,
                        background: bTeam?.display_color,
                      }}
                    />
                  </div>
                  <div
                    className="font-mono mt-1"
                    style={{ fontSize: 10, color: "var(--color-stone)" }}
                  >
                    HCP {b ? roundHandicap(b.handicap) : "—"}
                    {m.stroke_giver_id === m.player2_id
                      ? ` · GETS ${m.strokes_given}`
                      : ""}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className="font-mono"
                    style={{
                      fontSize: 13,
                      color: isFinal
                        ? "var(--color-navy)"
                        : isLive
                          ? "var(--color-oxblood)"
                          : "var(--color-stone)",
                      lineHeight: 1.15,
                    }}
                  >
                    {result}
                  </div>
                  <div
                    className={`font-ui uppercase mt-1 ${isLive ? "pulse-live" : ""}`}
                    style={{
                      fontSize: 8,
                      letterSpacing: "0.25em",
                      fontWeight: 600,
                      color: isFinal
                        ? "var(--color-stone)"
                        : isLive
                          ? "var(--color-oxblood)"
                          : "var(--color-stone)",
                    }}
                  >
                    {subStatus}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
