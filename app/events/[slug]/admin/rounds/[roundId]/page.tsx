import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { runWithEvent } from "@/lib/repo/events";
import { getRound } from "@/lib/repo/rounds";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { listMatches, listScrambleEntries, listParticipantsForEntry } from "@/lib/repo/scores";
import { listTeeGroupsWithMembers } from "@/lib/repo/teeGroups";
import { FORMATS, formatIdForRound } from "@/lib/formats/registry";
import { roundHandicap } from "@/lib/scoring/handicaps";
import { formatTeeTime, toRoman } from "@/lib/utils";
import { MatchForm, TeeGroupForm, ScorerSelect } from "./RoundAdminForms";

export const dynamic = "force-dynamic";

export default async function RoundAdminPage({
  params,
}: {
  params: Promise<{ slug: string; roundId: string }>;
}) {
  const { slug, roundId } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    if (guard.status === 401) {
      redirect(
        `/auth/sign-in?next=${encodeURIComponent(`/events/${slug}/admin/rounds/${roundId}`)}`,
      );
    }
    if (guard.status === 404) redirect("/dashboard");
    return <ForbiddenScreen />;
  }

  const data = runWithEvent(slug, () => {
    const round = getRound(roundId);
    if (!round) return null;
    const matches = listMatches().filter((m) => m.round_id === roundId);
    const entries = listScrambleEntries(roundId);
    const players = listPlayers();
    const teams = listTeams();
    const groups = listTeeGroupsWithMembers().filter(
      (g) => g.round_id === roundId,
    );
    const participantsByEntry = new Map(
      entries.map((e) => [e.id, listParticipantsForEntry(e.id)]),
    );
    return {
      round,
      matches,
      entries,
      players,
      teams,
      groups,
      participantsByEntry,
    };
  });
  if (!data) notFound();

  const { round, matches, entries, players, teams, groups, participantsByEntry } =
    data;
  const fmt = FORMATS[formatIdForRound(round)];
  const playerById = new Map(players.map((p) => [p.id, p]));
  const teamById = new Map(teams.map((t) => [t.id, t]));

  const matchedPlayerIds = new Set<string>();
  for (const m of matches) {
    matchedPlayerIds.add(m.player1_id);
    matchedPlayerIds.add(m.player2_id);
  }
  const unmatchedPlayers = players.filter((p) => !matchedPlayerIds.has(p.id));

  const groupedMatchIds = new Set<string>();
  const groupedEntryIds = new Set<string>();
  for (const g of groups) {
    for (const id of g.match_ids) groupedMatchIds.add(id);
    for (const id of g.scramble_entry_ids) groupedEntryIds.add(id);
  }
  const ungroupedMatches = matches.filter((m) => !groupedMatchIds.has(m.id));
  const ungroupedEntries = entries.filter((e) => !groupedEntryIds.has(e.id));

  return (
    <div className="paper-grain min-h-[100dvh]">
      <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-10 md:py-14">
        <Link
          href={`/events/${slug}/admin`}
          className="font-ui uppercase"
          style={{
            fontSize: 10,
            letterSpacing: "0.24em",
            color: "var(--color-stone)",
          }}
        >
          ← All rounds
        </Link>
        <div className="mt-3">
          <div
            className="font-ui uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.32em",
              color: "var(--color-gold)",
              fontWeight: 500,
            }}
          >
            DAY {toRoman(round.day)} · {fmt.short_label.toUpperCase()}
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-2"
            style={{ fontSize: 36, lineHeight: 1.05, letterSpacing: "-0.01em" }}
          >
            {round.course_name}.
          </h1>
          <p
            className="font-body-serif italic mt-2"
            style={{
              fontSize: 14,
              color: "var(--color-stone)",
              opacity: 0.75,
            }}
          >
            {round.date} · {formatTeeTime(round.tee_time)} · par {round.total_par}
          </p>
        </div>

        {round.format === "singles" && (
          <Section title="Pairings" count={matches.length}>
            {matches.length > 0 && (
              <ul className="mt-2">
                {matches.map((m) => {
                  const a = playerById.get(m.player1_id);
                  const b = playerById.get(m.player2_id);
                  const giver =
                    m.stroke_giver_id === m.player1_id
                      ? a?.name
                      : m.stroke_giver_id === m.player2_id
                        ? b?.name
                        : null;
                  return (
                    <li
                      key={m.id}
                      className="grid items-center gap-3 py-2.5"
                      style={{
                        gridTemplateColumns: "30px minmax(0,1fr) auto",
                        borderBottom: "1px solid var(--color-rule-cream)",
                      }}
                    >
                      <span
                        className="font-mono"
                        style={{ fontSize: 13, color: "var(--color-gold)" }}
                      >
                        {toRoman(m.match_number)}
                      </span>
                      <div className="min-w-0">
                        <div
                          className="font-display text-[var(--color-navy)] truncate"
                          style={{ fontSize: 17 }}
                        >
                          {a?.name} <span style={{ color: "var(--color-stone)" }}>vs.</span>{" "}
                          {b?.name}
                        </div>
                        <div
                          className="font-mono mt-0.5"
                          style={{ fontSize: 11, color: "var(--color-stone)" }}
                        >
                          HCP {a ? roundHandicap(a.handicap) : "—"} /{" "}
                          {b ? roundHandicap(b.handicap) : "—"}
                          {giver && m.strokes_given > 0
                            ? ` · ${giver} gets ${m.strokes_given}`
                            : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
            {unmatchedPlayers.length >= 2 && (
              <div className="mt-5">
                <MatchForm slug={slug} roundId={roundId} unmatched={unmatchedPlayers} />
              </div>
            )}
            {unmatchedPlayers.length < 2 && matches.length > 0 && (
              <p
                className="font-body-serif italic mt-3"
                style={{
                  fontSize: 13,
                  color: "var(--color-stone)",
                  opacity: 0.7,
                }}
              >
                All players are paired.
              </p>
            )}
          </Section>
        )}

        {round.format !== "singles" && (
          <Section title="Entries" count={entries.length}>
            {entries.length > 0 && (
              <ul className="mt-2">
                {entries.map((e) => {
                  const team = teamById.get(e.team_id);
                  const ps =
                    participantsByEntry
                      .get(e.id)
                      ?.map((p) => playerById.get(p.player_id)?.name)
                      .filter(Boolean) ?? [];
                  return (
                    <li
                      key={e.id}
                      className="grid items-center gap-3 py-2.5"
                      style={{
                        gridTemplateColumns: "30px minmax(0,1fr)",
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
                        <div
                          className="font-display text-[var(--color-navy)] truncate"
                          style={{ fontSize: 17 }}
                        >
                          {team?.name}
                        </div>
                        <div
                          className="font-body-serif italic mt-0.5"
                          style={{
                            fontSize: 12,
                            color: "var(--color-stone)",
                          }}
                        >
                          {ps.join(" · ")}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Section>
        )}

        <Section title="Tee groups" count={groups.length}>
          {groups.length > 0 && (
            <ul className="mt-2">
              {groups.map((g) => {
                const memberLabels: string[] = [];
                for (const mid of g.match_ids) {
                  const m = matches.find((x) => x.id === mid);
                  if (!m) continue;
                  memberLabels.push(
                    `${playerById.get(m.player1_id)?.name ?? "?"} vs. ${
                      playerById.get(m.player2_id)?.name ?? "?"
                    }`,
                  );
                }
                for (const eid of g.scramble_entry_ids) {
                  const e = entries.find((x) => x.id === eid);
                  if (!e) continue;
                  const team = teamById.get(e.team_id);
                  memberLabels.push(
                    e.pool ? `${team?.name ?? "?"} (${e.pool})` : team?.name ?? "?",
                  );
                }
                return (
                  <li
                    key={g.id}
                    className="grid items-start gap-3 py-3"
                    style={{
                      gridTemplateColumns: "40px minmax(0,1fr) 220px",
                      borderBottom: "1px solid var(--color-rule-cream)",
                    }}
                  >
                    <span
                      className="font-mono"
                      style={{ fontSize: 16, color: "var(--color-gold)" }}
                    >
                      {toRoman(g.group_number)}
                    </span>
                    <div className="min-w-0">
                      <div
                        className="font-display text-[var(--color-navy)]"
                        style={{ fontSize: 17, lineHeight: 1.15 }}
                      >
                        {g.scheduled_time
                          ? formatTeeTime(g.scheduled_time)
                          : "Time TBD"}
                      </div>
                      <div
                        className="font-body-serif italic mt-0.5"
                        style={{
                          fontSize: 12,
                          color: "var(--color-stone)",
                        }}
                      >
                        {memberLabels.length > 0
                          ? memberLabels.join(" · ")
                          : "No members yet"}
                      </div>
                    </div>
                    <ScorerSelect
                      slug={slug}
                      groupId={g.id}
                      players={players}
                      currentScorerId={g.scorer_player_id ?? null}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          {(ungroupedMatches.length > 0 || ungroupedEntries.length > 0) && (
            <div className="mt-5">
              <TeeGroupForm
                slug={slug}
                roundId={roundId}
                ungroupedMatches={ungroupedMatches.map((m) => ({
                  id: m.id,
                  label: `${toRoman(m.match_number)} · ${
                    playerById.get(m.player1_id)?.name ?? "?"
                  } vs. ${playerById.get(m.player2_id)?.name ?? "?"}`,
                }))}
                ungroupedEntries={ungroupedEntries.map((e) => ({
                  id: e.id,
                  label: e.pool
                    ? `${teamById.get(e.team_id)?.name ?? "?"} (${e.pool})`
                    : teamById.get(e.team_id)?.name ?? "?",
                }))}
                players={players}
                nextGroupNumber={
                  Math.max(0, ...groups.map((g) => g.group_number)) + 1
                }
              />
            </div>
          )}
          {ungroupedMatches.length === 0 &&
            ungroupedEntries.length === 0 &&
            groups.length > 0 && (
              <p
                className="font-body-serif italic mt-3"
                style={{
                  fontSize: 13,
                  color: "var(--color-stone)",
                  opacity: 0.7,
                }}
              >
                Everything is in a group.
              </p>
            )}
        </Section>
      </div>
    </div>
  );
}

function ForbiddenScreen() {
  return (
    <div className="paper-grain min-h-[100dvh] flex items-center justify-center px-5">
      <div className="text-center">
        <div
          className="font-ui uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.32em",
            color: "var(--color-oxblood)",
          }}
        >
          Forbidden
        </div>
        <div
          className="font-display text-[var(--color-navy)] mt-2"
          style={{ fontSize: 28 }}
        >
          Commissioner access only.
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  children,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <div
        className="flex items-baseline justify-between pb-2"
        style={{ borderBottom: "1px solid var(--color-gold)" }}
      >
        <h2
          className="font-ui uppercase"
          style={{
            fontSize: 11,
            letterSpacing: "0.28em",
            color: "var(--color-navy)",
            fontWeight: 600,
          }}
        >
          {title}
        </h2>
        <span
          className="font-mono"
          style={{ fontSize: 12, color: "var(--color-stone)" }}
        >
          {count}
        </span>
      </div>
      {children}
    </section>
  );
}
