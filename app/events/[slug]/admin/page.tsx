import Link from "next/link";
import { redirect } from "next/navigation";
import { checkCommissioner } from "@/lib/auth/eventPermissions";
import { runWithEvent } from "@/lib/repo/events";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { listRounds } from "@/lib/repo/rounds";
import { listMatches, listScrambleEntries } from "@/lib/repo/scores";
import { listCourses } from "@/lib/repo/courses";
import { formatIdForRound, FORMATS } from "@/lib/formats/registry";
import { formatTeeTime, toRoman } from "@/lib/utils";
import { getDb } from "@/lib/db";
import {
  TeamForm,
  PlayerForm,
  RoundForm,
  AutoFillButton,
  RoleInviteForm,
  RevokeRoleButton,
  TeamRow,
  PlayerRow,
  RoundDeleteButton,
} from "./AdminForms";
import {
  SideBetCreateForm,
  SideBetParticipantManager,
  SideBetSettleButton,
  SideBetDeleteButton,
} from "./SideBetForms";
import {
  listEntries as listSideBetEntries,
  listPayouts as listSideBetPayouts,
  listSideBets,
} from "@/lib/repo/sideBets";

type RoleListing = {
  user_id: string;
  email: string;
  display_name: string | null;
  role: "commissioner" | "scorer" | "player" | "spectator";
  is_bootstrap: boolean;
};

function listRoleGrants(slug: string, bootstrapUserId: string | null): RoleListing[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT er.user_id, er.role, u.email, u.display_name
         FROM event_roles er
         JOIN users u ON u.id = er.user_id
         WHERE er.event_id = ?
         ORDER BY
           CASE er.role
             WHEN 'commissioner' THEN 0
             WHEN 'scorer' THEN 1
             WHEN 'player' THEN 2
             ELSE 3
           END,
           u.email`,
    )
    .all(slug) as Array<{
    user_id: string;
    role: RoleListing["role"];
    email: string;
    display_name: string | null;
  }>;
  const seen = new Set(rows.map((r) => r.user_id));
  const out: RoleListing[] = rows.map((r) => ({
    ...r,
    is_bootstrap: r.user_id === bootstrapUserId,
  }));
  if (bootstrapUserId && !seen.has(bootstrapUserId)) {
    const u = db
      .prepare("SELECT id, email, display_name FROM users WHERE id = ?")
      .get(bootstrapUserId) as
      | { id: string; email: string; display_name: string | null }
      | undefined;
    if (u) {
      out.unshift({
        user_id: u.id,
        email: u.email,
        display_name: u.display_name,
        role: "commissioner",
        is_bootstrap: true,
      });
    }
  }
  return out;
}

export const dynamic = "force-dynamic";

export default async function EventAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guard = await checkCommissioner(slug);
  if (!guard.ok) {
    if (guard.status === 401) {
      redirect(`/auth/sign-in?next=${encodeURIComponent(`/events/${slug}/admin`)}`);
    }
    if (guard.status === 404) redirect("/dashboard");
    // 403 — show a minimal forbidden page rather than mid-render throw.
    return (
      <div className="paper-grain min-h-[100dvh] flex items-center justify-center px-5">
        <div className="text-center">
          <div
            className="font-ui uppercase"
            style={{
              fontSize: 11,
              letterSpacing: "0.32em",
              color: "var(--color-oxblood)",
              fontWeight: 500,
            }}
          >
            Forbidden
          </div>
          <div
            className="font-display text-[var(--color-navy)] mt-2"
            style={{ fontSize: 28, lineHeight: 1.05 }}
          >
            Commissioner access only.
          </div>
        </div>
      </div>
    );
  }

  const { event } = guard;
  const { teams, players, rounds, allMatches, allEntries, sideBets, sideBetEntries, sideBetPayouts } = runWithEvent(
    slug,
    () => {
      const sb = listSideBets();
      const entries: Record<string, ReturnType<typeof listSideBetEntries>> = {};
      const payouts: Record<string, ReturnType<typeof listSideBetPayouts>> = {};
      for (const b of sb) {
        entries[b.id] = listSideBetEntries(b.id);
        payouts[b.id] = listSideBetPayouts(b.id);
      }
      return {
        teams: listTeams(),
        players: listPlayers(),
        rounds: listRounds(),
        allMatches: listMatches(),
        allEntries: listScrambleEntries(),
        sideBets: sb,
        sideBetEntries: entries,
        sideBetPayouts: payouts,
      };
    },
  );
  const courses = listCourses();
  const usedDays = new Set(rounds.map((r) => r.day));
  const matchCountByRound = new Map<string, number>();
  for (const m of allMatches) {
    matchCountByRound.set(
      m.round_id,
      (matchCountByRound.get(m.round_id) ?? 0) + 1,
    );
  }
  const entryCountByRound = new Map<string, number>();
  for (const e of allEntries) {
    entryCountByRound.set(
      e.round_id,
      (entryCountByRound.get(e.round_id) ?? 0) + 1,
    );
  }

  const playersByTeam = new Map<string, typeof players>();
  for (const p of players) {
    const arr = playersByTeam.get(p.team_id) ?? [];
    arr.push(p);
    playersByTeam.set(p.team_id, arr);
  }
  for (const arr of playersByTeam.values()) {
    arr.sort((a, b) => a.team_slot.localeCompare(b.team_slot));
  }

  const roleGrants = listRoleGrants(slug, guard.event.commissioner_user_id);

  return (
    <div className="paper-grain min-h-[100dvh]">
      <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-10 md:py-14">
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <div>
            <div
              className="font-ui uppercase"
              style={{
                fontSize: 11,
                letterSpacing: "0.32em",
                color: "var(--color-gold)",
                fontWeight: 500,
              }}
            >
              {event.name.toUpperCase()} · ADMIN
            </div>
            <h1
              className="font-display text-[var(--color-navy)] mt-2"
              style={{ fontSize: 40, lineHeight: 1, letterSpacing: "-0.01em" }}
            >
              Set up your event.
            </h1>
          </div>
          <Link
            href={`/events/${slug}`}
            className="font-ui uppercase"
            style={{
              fontSize: 10,
              letterSpacing: "0.24em",
              color: "var(--color-stone)",
            }}
          >
            View public page →
          </Link>
        </div>

        <p
          className="font-body-serif italic mt-3"
          style={{
            fontSize: 14,
            color: "var(--color-stone)",
            opacity: 0.75,
            lineHeight: 1.6,
            maxWidth: 620,
          }}
        >
          Add the teams in the field, then the players on each team. Rounds
          and pairings come next; for now the public event page lists the
          roster you build here.
        </p>

        <Section
          title="Teams"
          count={teams.length}
          empty="No teams yet. Add the first one below."
        >
          {teams.length > 0 && (
            <div className="mt-2">
              {teams.map((t) => (
                <TeamRow
                  key={t.id}
                  slug={slug}
                  team={t}
                  sortOrder={t.sort_order}
                />
              ))}
            </div>
          )}
          <div className="mt-4">
            <TeamForm slug={slug} />
          </div>
        </Section>

        <Section
          title="Players"
          count={players.length}
          empty={
            teams.length === 0
              ? "Add at least one team before adding players."
              : "No players yet. Add the first one below."
          }
        >
          {teams.length > 0 && players.length > 0 && (
            <div className="mt-2">
              {teams.map((t) => {
                const ps = playersByTeam.get(t.id) ?? [];
                if (ps.length === 0) return null;
                return (
                  <div key={t.id} className="mt-3">
                    <div className="flex items-center gap-2 pb-1">
                      <span
                        className="inline-block rounded-full"
                        style={{
                          width: 8,
                          height: 8,
                          background: t.display_color,
                        }}
                      />
                      <span
                        className="font-ui uppercase"
                        style={{
                          fontSize: 10,
                          letterSpacing: "0.24em",
                          color: "var(--color-stone)",
                          fontWeight: 600,
                        }}
                      >
                        {t.name}
                      </span>
                    </div>
                    {ps.map((p) => (
                      <PlayerRow
                        key={p.id}
                        slug={slug}
                        player={p}
                        teams={teams}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {teams.length > 0 && (
            <div className="mt-5">
              <PlayerForm slug={slug} teams={teams} />
            </div>
          )}
        </Section>

        <Section
          title="Rounds"
          count={rounds.length}
          empty={
            usedDays.size >= 3
              ? "All three days are scheduled."
              : "No rounds yet. Pick a course and a format to add the first."
          }
        >
          {rounds.length > 0 && (
            <ul className="mt-2">
              {rounds.map((r) => {
                const fmt = FORMATS[formatIdForRound(r)];
                const isScramble = fmt.unit !== "individual";
                const count = isScramble
                  ? entryCountByRound.get(r.id) ?? 0
                  : matchCountByRound.get(r.id) ?? 0;
                const countLabel = isScramble
                  ? `${count} ${count === 1 ? "entry" : "entries"}`
                  : `${count} ${count === 1 ? "match" : "matches"}`;
                return (
                  <li
                    key={r.id}
                    className="grid items-center gap-3 py-3"
                    style={{
                      gridTemplateColumns:
                        "30px minmax(0,1fr) auto auto auto auto",
                      borderBottom: "1px solid var(--color-rule-cream)",
                    }}
                  >
                    <span
                      className="font-mono"
                      style={{ fontSize: 14, color: "var(--color-gold)" }}
                    >
                      {toRoman(r.day)}
                    </span>
                    <Link
                      href={`/events/${slug}/admin/rounds/${r.id}`}
                      className="min-w-0 block"
                    >
                      <div
                        className="font-display text-[var(--color-navy)] truncate"
                        style={{ fontSize: 18, lineHeight: 1.15 }}
                      >
                        {r.course_name}
                      </div>
                      <div
                        className="font-body-serif italic mt-0.5"
                        style={{
                          fontSize: 12,
                          color: "var(--color-stone)",
                        }}
                      >
                        {fmt.short_label} · par {r.total_par} · {r.date} ·{" "}
                        {formatTeeTime(r.tee_time)}
                      </div>
                    </Link>
                    <Link
                      href={`/events/${slug}/admin/rounds/${r.id}`}
                      className="font-mono text-right"
                      style={{
                        fontSize: 11,
                        color:
                          count === 0
                            ? "var(--color-oxblood)"
                            : "var(--color-stone)",
                      }}
                    >
                      {countLabel} →
                    </Link>
                    {isScramble && count === 0 && teams.length > 0 ? (
                      <AutoFillButton slug={slug} roundId={r.id} />
                    ) : (
                      <span />
                    )}
                    <RoundDeleteButton
                      slug={slug}
                      roundId={r.id}
                      day={r.day}
                      courseName={r.course_name}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          {usedDays.size < 3 && courses.length > 0 && (
            <div className="mt-5">
              <RoundForm
                slug={slug}
                courses={courses}
                usedDays={Array.from(usedDays)}
              />
            </div>
          )}
        </Section>

        <Section
          title="Side bets"
          count={sideBets.length}
          empty={
            players.length === 0
              ? "Add players first, then bets."
              : "No bets yet. Create one below."
          }
        >
          {sideBets.length > 0 && (
            <ul className="mt-2">
              {sideBets.map((b) => {
                const ents = sideBetEntries[b.id] ?? [];
                const pays = sideBetPayouts[b.id] ?? [];
                const pot = b.buy_in_cents * ents.length;
                const round =
                  b.round_id && rounds.find((r) => r.id === b.round_id);
                return (
                  <li
                    key={b.id}
                    className="grid items-start gap-3 py-3"
                    style={{
                      gridTemplateColumns:
                        "minmax(0,1fr) auto auto auto auto",
                      borderBottom: "1px solid var(--color-rule-cream)",
                    }}
                  >
                    <div className="min-w-0">
                      <div
                        className="font-display text-[var(--color-navy)]"
                        style={{ fontSize: 18, lineHeight: 1.15 }}
                      >
                        {b.name}
                      </div>
                      <div
                        className="font-body-serif italic mt-0.5"
                        style={{
                          fontSize: 12,
                          color: "var(--color-stone)",
                        }}
                      >
                        {round
                          ? `Day ${round.day} · ${round.course_name}`
                          : "Event-wide"}
                      </div>
                      <div className="mt-2">
                        <SideBetParticipantManager
                          slug={slug}
                          bet={b}
                          participants={ents
                            .filter((e) => e.player_id)
                            .map((e) => ({ player_id: e.player_id! }))}
                          rosterPlayers={players}
                        />
                      </div>
                      {b.status === "settled" && pays.length > 0 && (
                        <div
                          className="mt-2 font-body-serif"
                          style={{
                            fontSize: 12,
                            color: "var(--color-stone)",
                          }}
                        >
                          Payouts:{" "}
                          {pays
                            .map((p) => {
                              const r = players.find(
                                (x) => x.id === p.recipient_player_id,
                              );
                              return `${r?.name ?? "?"} $${(
                                p.amount_cents / 100
                              ).toFixed(2)}`;
                            })
                            .join(" · ")}
                        </div>
                      )}
                    </div>
                    <span
                      className="font-mono text-right"
                      style={{
                        fontSize: 12,
                        color: "var(--color-stone)",
                      }}
                    >
                      ${(b.buy_in_cents / 100).toFixed(2)} ea
                    </span>
                    <span
                      className="font-mono text-right"
                      style={{
                        fontSize: 12,
                        color:
                          b.status === "settled"
                            ? "var(--color-stone)"
                            : "var(--color-navy)",
                      }}
                    >
                      Pot ${(pot / 100).toFixed(2)}
                    </span>
                    <span
                      className="font-ui uppercase text-right"
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.22em",
                        color:
                          b.status === "settled"
                            ? "var(--color-stone)"
                            : "var(--color-gold)",
                        fontWeight: 600,
                      }}
                    >
                      {b.status}
                    </span>
                    <span className="flex flex-col items-end gap-1">
                      <SideBetSettleButton
                        slug={slug}
                        bet={b}
                        participants={ents
                          .filter((e) => e.player_id)
                          .map((e) => ({ player_id: e.player_id! }))}
                        rosterPlayers={players}
                      />
                      <SideBetDeleteButton slug={slug} bet={b} />
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          {players.length > 0 && (
            <div className="mt-5">
              <SideBetCreateForm slug={slug} rounds={rounds} />
            </div>
          )}
        </Section>

        <Section
          title="Co-commissioners & roles"
          count={roleGrants.length}
          empty="Just you. Invite others by email below."
        >
          {roleGrants.length > 0 && (
            <ul className="mt-2">
              {roleGrants.map((g) => (
                <li
                  key={g.user_id}
                  className="grid items-center gap-3 py-2.5"
                  style={{
                    gridTemplateColumns: "minmax(0,1fr) auto auto",
                    borderBottom: "1px solid var(--color-rule-cream)",
                  }}
                >
                  <div className="min-w-0">
                    <div
                      className="font-display text-[var(--color-navy)] truncate"
                      style={{ fontSize: 16 }}
                    >
                      {g.display_name ?? g.email}
                    </div>
                    {g.display_name && (
                      <div
                        className="font-mono mt-0.5 truncate"
                        style={{ fontSize: 11, color: "var(--color-stone)" }}
                      >
                        {g.email}
                      </div>
                    )}
                  </div>
                  <span
                    className="font-ui uppercase"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.22em",
                      color: "var(--color-gold)",
                      fontWeight: 600,
                    }}
                  >
                    {g.role}
                    {g.is_bootstrap ? " · creator" : ""}
                  </span>
                  {g.is_bootstrap ? (
                    <span />
                  ) : (
                    <RevokeRoleButton slug={slug} userId={g.user_id} />
                  )}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-5">
            <RoleInviteForm slug={slug} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Section({
  title,
  count,
  empty,
  children,
}: {
  title: string;
  count: number;
  empty: string;
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
      {count === 0 && (
        <p
          className="font-body-serif italic mt-3"
          style={{
            fontSize: 14,
            color: "var(--color-stone)",
            opacity: 0.65,
          }}
        >
          {empty}
        </p>
      )}
      {children}
    </section>
  );
}
