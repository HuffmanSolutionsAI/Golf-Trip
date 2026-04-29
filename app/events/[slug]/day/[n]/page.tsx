import Link from "next/link";
import { notFound } from "next/navigation";
import { getEventById, runWithEvent } from "@/lib/repo/events";
import { getRoundByDay } from "@/lib/repo/rounds";
import { listPlayers, listTeams } from "@/lib/repo/players";
import {
  listMatches,
  listScrambleEntries,
  listParticipantsForEntry,
} from "@/lib/repo/scores";
import {
  computeDay1MatchStates,
  computeDay2EntryLeaderboard,
  computeDay3EntryLeaderboard,
} from "@/lib/repo/standings";
import { listTeeGroupsWithMembers } from "@/lib/repo/teeGroups";
import { roundHandicap } from "@/lib/scoring/handicaps";
import { FORMATS, formatIdForRound } from "@/lib/formats/registry";
import { formatTeeTime, toRoman } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EventDayPage({
  params,
}: {
  params: Promise<{ slug: string; n: string }>;
}) {
  const { slug, n } = await params;
  const day = Number(n);
  if (!Number.isInteger(day) || day < 1 || day > 3) notFound();
  const event = getEventById(slug);
  if (!event) notFound();

  const data = runWithEvent(slug, () => {
    const round = getRoundByDay(day as 1 | 2 | 3);
    if (!round) return null;
    const teams = listTeams();
    const players = listPlayers();
    const groups = listTeeGroupsWithMembers().filter(
      (g) => g.round_id === round.id,
    );
    if (round.format === "singles") {
      const matches = listMatches().filter((m) => m.round_id === round.id);
      const states = computeDay1MatchStates();
      return {
        kind: "singles" as const,
        round,
        teams,
        players,
        groups,
        matches,
        states,
      };
    }
    const entries = listScrambleEntries(round.id);
    const participantsByEntry = new Map(
      entries.map((e) => [e.id, listParticipantsForEntry(e.id)]),
    );
    const ranks =
      round.format === "scramble_2man"
        ? computeDay2EntryLeaderboard()
        : computeDay3EntryLeaderboard();
    return {
      kind: "scramble" as const,
      round,
      teams,
      players,
      groups,
      entries,
      participantsByEntry,
      ranks,
    };
  });

  if (!data) {
    return (
      <div className="paper-grain">
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-12 md:py-16">
          <div
            className="font-ui uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.32em",
              color: "var(--color-gold)",
              fontWeight: 500,
            }}
          >
            DAY {toRoman(day)}
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-2"
            style={{ fontSize: 40, lineHeight: 1.05 }}
          >
            No round on this day yet.
          </h1>
        </div>
      </div>
    );
  }

  const fmt = FORMATS[formatIdForRound(data.round)];
  const { round, players, teams, groups } = data;
  const playerById = new Map(players.map((p) => [p.id, p]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  return (
    <div>
      <div
        className="paper-grain"
        style={{ borderBottom: "1px solid var(--color-gold)" }}
      >
        <div className="mx-auto max-w-[1280px] px-5 md:px-8 py-10 md:py-12">
          <div
            className="font-ui uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.32em",
              color: "var(--color-gold)",
              fontWeight: 500,
            }}
          >
            DAY {toRoman(round.day)} · {round.course_name.toUpperCase()}
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-2"
            style={{ fontSize: 44, lineHeight: 1, letterSpacing: "-0.01em" }}
          >
            {fmt.display_name}.
          </h1>
          <p
            className="font-body-serif italic mt-3"
            style={{
              fontSize: 14,
              color: "var(--color-stone)",
              opacity: 0.75,
              maxWidth: 540,
            }}
          >
            {fmt.blurb} {`Tees off ${formatTeeTime(round.tee_time)}.`}
          </p>
        </div>
      </div>

      <div className="paper-grain">
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-8 md:py-10">
          {groups.length === 0 ? (
            <p
              className="font-body-serif italic"
              style={{
                fontSize: 14,
                color: "var(--color-stone)",
                opacity: 0.7,
              }}
            >
              No tee groups assigned yet.
            </p>
          ) : (
            groups
              .slice()
              .sort((a, b) => a.group_number - b.group_number)
              .map((g) => {
                const scorer = g.scorer_player_id
                  ? playerById.get(g.scorer_player_id)
                  : null;
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
                      <span
                        className="font-ui uppercase"
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.28em",
                          color: scorer
                            ? "var(--color-gold)"
                            : "var(--color-stone)",
                          fontWeight: 500,
                        }}
                      >
                        Scored by {scorer?.name ?? "—"}
                      </span>
                    </div>
                    {data.kind === "singles"
                      ? renderMatches(
                          g.match_ids,
                          data.matches,
                          data.states,
                          playerById,
                          teamById,
                          slug,
                          round.day,
                        )
                      : renderEntries(
                          g.scramble_entry_ids,
                          data.entries,
                          data.participantsByEntry,
                          data.ranks,
                          playerById,
                          teamById,
                          round.format,
                          slug,
                          round.day,
                        )}
                  </section>
                );
              })
          )}
        </div>
      </div>
    </div>
  );
}

function renderMatches(
  matchIds: string[],
  matches: ReturnType<typeof listMatches>,
  states: ReturnType<typeof computeDay1MatchStates>,
  playerById: Map<string, ReturnType<typeof listPlayers>[number]>,
  teamById: Map<string, ReturnType<typeof listTeams>[number]>,
  slug: string,
  day: number,
) {
  const stateById = new Map(states.map((s) => [s.match_id, s]));
  const groupMatches = matchIds
    .map((id) => matches.find((m) => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m)
    .sort((a, b) => a.match_number - b.match_number);
  return groupMatches.map((m) => {
    const a = playerById.get(m.player1_id);
    const b = playerById.get(m.player2_id);
    const aTeam = a ? teamById.get(a.team_id) : undefined;
    const bTeam = b ? teamById.get(b.team_id) : undefined;
    const state = stateById.get(m.id);
    const isFinal = state?.status === "final";
    const isLive = state?.status === "in_progress";
    const result = (() => {
      if (!state) return "Pending";
      if (isFinal) {
        if (state.net_diff === 0) return "Halved";
        const margin = Math.abs(state.net_diff);
        const winner = state.net_diff > 0 ? a?.name : b?.name;
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
        href={`/events/${slug}/day/${day}/matches/${m.id}`}
        className="grid items-center gap-3 md:gap-4 py-4 md:py-5"
        style={{
          gridTemplateColumns: "30px minmax(0,1fr) auto minmax(0,1fr) 110px",
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
              style={{ width: 8, height: 8, background: aTeam?.display_color }}
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
            {m.stroke_giver_id === m.player1_id ? ` · GETS ${m.strokes_given}` : ""}
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
              style={{ width: 8, height: 8, background: bTeam?.display_color }}
            />
          </div>
          <div
            className="font-mono mt-1"
            style={{ fontSize: 10, color: "var(--color-stone)" }}
          >
            HCP {b ? roundHandicap(b.handicap) : "—"}
            {m.stroke_giver_id === m.player2_id ? ` · GETS ${m.strokes_given}` : ""}
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
  });
}

function renderEntries(
  entryIds: string[],
  entries: ReturnType<typeof listScrambleEntries>,
  participantsByEntry: Map<string, ReturnType<typeof listParticipantsForEntry>>,
  ranks:
    | ReturnType<typeof computeDay2EntryLeaderboard>
    | ReturnType<typeof computeDay3EntryLeaderboard>,
  playerById: Map<string, ReturnType<typeof listPlayers>[number]>,
  teamById: Map<string, ReturnType<typeof listTeams>[number]>,
  format: "singles" | "scramble_2man" | "scramble_4man",
  slug: string,
  day: number,
) {
  const rankByEntry = new Map(ranks.map((r) => [r.entry_id, r]));
  const groupEntries = entryIds
    .map((id) => entries.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => !!e)
    .sort((a, b) => (a.pool ?? "").localeCompare(b.pool ?? ""));
  return groupEntries.map((e) => {
    const team = teamById.get(e.team_id);
    const r = rankByEntry.get(e.id);
    const names = (participantsByEntry.get(e.id) ?? [])
      .map((p) => playerById.get(p.player_id)?.name)
      .filter(Boolean) as string[];
    const toPar =
      r && "score_to_par" in r ? r.score_to_par : 0;
    const thru = r ? r.holes_thru : 0;
    return (
      <Link
        key={e.id}
        href={`/events/${slug}/day/${day}/entries/${e.id}`}
        className="grid items-center gap-2.5 py-3.5"
        style={{
          gridTemplateColumns: "30px minmax(0,1fr) 60px 50px 48px",
          borderBottom: "1px solid var(--color-rule-cream)",
        }}
      >
        <span
          className="font-ui uppercase"
          style={{
            fontSize: 10,
            letterSpacing: "0.22em",
            color: "var(--color-gold)",
            fontWeight: 600,
          }}
        >
          {e.pool ?? "—"}
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="inline-block rounded-full shrink-0"
              style={{
                width: 8,
                height: 8,
                background: team?.display_color,
              }}
            />
            <span
              className="font-display text-[var(--color-navy)] truncate"
              style={{ fontSize: 19 }}
            >
              {names.length > 0 ? names.join(" & ") : team?.name}
            </span>
          </div>
          {names.length > 0 && (
            <div
              className="font-body-serif italic mt-1 truncate"
              style={{ fontSize: 12, color: "var(--color-stone)" }}
            >
              {team?.name}
            </div>
          )}
        </div>
        <span
          className="font-mono text-right"
          style={{
            fontSize: 20,
            color: thru === 0 ? "var(--color-stone)" : fmtColor(toPar),
          }}
        >
          {thru === 0 ? "—" : fmtPar(toPar)}
        </span>
        <span
          className="font-mono text-right"
          style={{ fontSize: 11, color: "var(--color-stone)" }}
        >
          {thru === 0 ? "—" : `thru ${thru}`}
        </span>
        <span
          className="font-ui uppercase text-right"
          style={{
            fontSize: 9,
            letterSpacing: "0.22em",
            color: "var(--color-stone)",
          }}
        >
          {r && "rank_in_pool" in r
            ? `#${r.rank_in_pool}`
            : r && "rank" in r
              ? `#${r.rank}`
              : "—"}
        </span>
      </Link>
    );
  });
}

function fmtPar(n: number): string {
  if (n === 0) return "E";
  if (n < 0) return `${n}`;
  return `+${n}`;
}

function fmtColor(n: number): string {
  if (n < 0) return "var(--color-oxblood)";
  if (n > 0) return "var(--color-stone)";
  return "var(--color-navy)";
}
