import Link from "next/link";
import { listMatches } from "@/lib/repo/scores";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { computeDay1MatchStates } from "@/lib/repo/standings";
import { getRoundByDay } from "@/lib/repo/rounds";
import { listTeeGroupsWithMembers } from "@/lib/repo/teeGroups";
import { roundHandicap } from "@/lib/scoring/handicaps";
import { toRoman, formatTeeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function Day1IndexPage() {
  const round = getRoundByDay(1);
  if (!round) return null;

  const matches = listMatches();
  const states = computeDay1MatchStates();
  const players = new Map(listPlayers().map((p) => [p.id, p]));
  const teams = new Map(listTeams().map((t) => [t.id, t]));
  const stateById = new Map(states.map((s) => [s.match_id, s]));
  const matchById = new Map(matches.map((m) => [m.id, m]));

  const groups = listTeeGroupsWithMembers().filter(
    (g) => g.round_id === round.id,
  );

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
            DAY I · {round.course_name.toUpperCase()}
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-3"
            style={{ fontSize: 56, lineHeight: 1, letterSpacing: "-0.01em" }}
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
            Five tee times. Two matchups per group. Net stroke play, total
            over eighteen. Winner takes two points.{" "}
            {`Tees off ${formatTeeTime(round.tee_time)}.`}
          </p>
        </div>
      </div>

      <div className="paper-grain">
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-8 md:py-10">
          {groups.map((g) => {
            const groupMatches = g.match_ids
              .map((id) => matchById.get(id))
              .filter((m): m is NonNullable<typeof m> => !!m)
              .sort((a, b) => a.match_number - b.match_number);
            return (
              <section key={g.id} className="mb-10">
                <div
                  className="flex items-baseline justify-between flex-wrap gap-2 pb-2.5 mb-2"
                  style={{ borderBottom: "1px solid var(--color-gold)" }}
                >
                  <div className="flex items-baseline gap-3">
                    <span
                      className="font-mono"
                      style={{ fontSize: 22, color: "var(--color-gold)" }}
                    >
                      {toRoman(g.group_number)}
                    </span>
                    {g.scheduled_time && (
                      <span
                        className="font-display text-[var(--color-navy)]"
                        style={{ fontSize: 26 }}
                      >
                        {formatTeeTime(g.scheduled_time)}
                      </span>
                    )}
                  </div>
                </div>
                {groupMatches.map((m) => {
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
                        borderBottom: "1px solid var(--color-rule-cream)",
                      }}
                    >
                      <span
                        className="font-mono"
                        style={{ fontSize: 14, color: "var(--color-stone)" }}
                      >
                        {toRoman(m.match_number)}
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
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
