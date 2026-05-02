import Link from "next/link";
import { listRounds } from "@/lib/repo/rounds";
import { listAllScores } from "@/lib/repo/scores";
import {
  computeDay1IndividualLeaderboard,
  computeDay2EntryLeaderboard,
  computeDay3EntryLeaderboard,
  computeLeaderboard,
} from "@/lib/repo/standings";
import { listPlayers } from "@/lib/repo/players";
import { formatRoundDate, formatTeeTime, toRoman } from "@/lib/utils";
import type {
  Day1IndividualRow,
  Day2EntryDisplayRow,
  Day3EntryDisplayRow,
  RoundRow,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const rounds = listRounds();
  const standings = computeLeaderboard();
  const scores = listAllScores();
  const players = listPlayers();
  const playersByTeam = new Map<string, string[]>();
  for (const p of players) {
    const arr = playersByTeam.get(p.team_id) ?? [];
    arr.push(p.name);
    playersByTeam.set(p.team_id, arr);
  }

  // Determine live / next round
  const now = new Date();
  let liveRound: RoundRow | undefined;
  let liveThru = 0;
  for (const r of rounds) {
    const rs = scores.filter((s) => s.round_id === r.id);
    if (!r.is_locked && rs.length > 0) {
      liveRound = r;
      liveThru = rs.reduce((m, s) => Math.max(m, s.hole_number), 0);
      break;
    }
  }
  const upcomingRound = !liveRound
    ? rounds.find((r) => new Date(`${r.date}T${r.tee_time}`) > now)
    : undefined;
  const allFinal = !liveRound && !upcomingRound;
  const heroDay = liveRound?.day ?? upcomingRound?.day ?? rounds[0]?.day ?? 1;
  const heroCourse = liveRound?.course_name ?? upcomingRound?.course_name ?? rounds[0]?.course_name ?? "";

  // Dataset shaping for round-status badges
  function roundStatus(r: RoundRow): "FINAL" | "LIVE" | "UPCOMING" {
    if (r.is_locked) return "FINAL";
    const rs = scores.filter((s) => s.round_id === r.id);
    if (rs.length > 0) return "LIVE";
    return "UPCOMING";
  }

  return (
    <div>
      {/* HERO — split view: editorial display on left, live standings on right */}
      <section className="navy-grain text-[var(--color-cream)]">
        <div className="mx-auto max-w-[1280px] px-5 md:px-8 py-10 md:py-16 grid md:grid-cols-[1fr_1.4fr] gap-10 md:gap-16 items-center">
          <div className="text-center md:text-left">
            {liveRound ? (
              <div
                className="pulse-live inline-flex items-center gap-2"
                style={{
                  fontFamily: "var(--font-ui)",
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  color: "var(--color-oxblood)",
                  fontWeight: 600,
                  textTransform: "uppercase",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 999,
                    background: "var(--color-oxblood)",
                  }}
                />
                LIVE NOW
              </div>
            ) : upcomingRound ? (
              <div className="eyebrow">Up next</div>
            ) : (
              <div className="eyebrow">Tournament complete</div>
            )}
            <h1
              className="font-display mt-3 md:mt-4"
              style={{
                fontSize: 56,
                lineHeight: 0.95,
                letterSpacing: "-0.02em",
              }}
            >
              <span className="hidden md:inline" style={{ fontSize: 88 }}>
                Day {toRoman(heroDay)}.<br />
                {heroCourse.replace(/\s*[—–-].*$/, "").replace(/\s*(C\.C\.|Country Club|Golf Club|G\.C\.).*/, "")}.
              </span>
              <span className="md:hidden">
                Day {toRoman(heroDay)}.<br />
                {heroCourse.replace(/\s*[—–-].*$/, "").replace(/\s*(C\.C\.|Country Club|Golf Club|G\.C\.).*/, "")}.
              </span>
            </h1>
            <p
              className="font-body-serif italic mt-4 md:mt-4"
              style={{
                fontSize: 17,
                opacity: 0.72,
                lineHeight: 1.55,
                maxWidth: 460,
                marginInline: "auto",
              }}
            >
              {liveRound ? heroBlurb(liveRound, liveThru, standings) : upcomingRound ? `${upcomingRound.format === "singles" ? "Singles · net stroke play." : upcomingRound.format === "scramble_2man" ? "Two-man scramble. Pools AD & BC." : "The team scramble. The Cup is decided."} Tees off ${formatTeeTime(upcomingRound.tee_time)}.` : "Three rounds in the books. The Cup is awarded."}
            </p>
            {liveRound && (
              <div className="hidden md:flex gap-2.5 mt-7">
                <Link
                  href={`/day${liveRound.day}` as never}
                  className="bg-[var(--color-gold)] text-[var(--color-navy)] font-ui font-semibold uppercase hover:bg-[var(--color-gold-light)]"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.3em",
                    padding: "13px 28px",
                  }}
                >
                  Enter Scores
                </Link>
                <Link
                  href="/leaderboard"
                  className="bg-transparent text-[var(--color-cream)] font-ui font-medium uppercase"
                  style={{
                    fontSize: 11,
                    letterSpacing: "0.3em",
                    padding: "13px 28px",
                    border: "1px solid var(--color-cream)",
                  }}
                >
                  Leaderboard
                </Link>
              </div>
            )}
          </div>

          {/* Standings panel */}
          <div>
            <div className="flex items-baseline justify-between mb-3.5">
              <div className="eyebrow">
                {liveRound
                  ? `Day ${toRoman(liveRound.day)} Live`
                  : "The Standings"}
              </div>
              <span
                className="font-mono"
                style={{ fontSize: 10, color: "var(--color-cream)", opacity: 0.6 }}
              >
                {standings[0]?.status_label?.toUpperCase() ?? ""}
              </span>
            </div>
            <div className="rule-gold" />
            {liveRound?.day === 1 ? (
              <Day1LiveStandings rows={computeDay1IndividualLeaderboard()} />
            ) : liveRound?.day === 2 ? (
              <Day2LiveStandings rows={computeDay2EntryLeaderboard()} />
            ) : liveRound?.day === 3 ? (
              <Day3LiveStandings rows={computeDay3EntryLeaderboard()} />
            ) : (
              standings.map((s) => {
                const lead = s.rank === 1;
                return (
                  <Link
                    key={s.team_id}
                    href="/leaderboard"
                    className="grid items-center relative md:grid-cols-[40px_1fr_60px_60px_60px_70px] grid-cols-[28px_1fr_50px] hover:opacity-80 transition-opacity"
                    style={{
                      padding: "14px 0",
                      borderBottom: "1px solid rgba(165,136,89,0.25)",
                    }}
                  >
                    {lead && (
                      <span
                        className="absolute"
                        style={{
                          left: -12,
                          top: 0,
                          bottom: 0,
                          width: 3,
                          background: "var(--color-gold)",
                        }}
                      />
                    )}
                    <span
                      className="font-mono md:text-xl text-base"
                      style={{
                        color: lead ? "var(--color-gold)" : "var(--color-cream)",
                      }}
                    >
                      {s.rank}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span
                          className="inline-block rounded-full shrink-0"
                          style={{
                            width: 8,
                            height: 8,
                            background: s.display_color,
                          }}
                        />
                        <span
                          className="font-display truncate"
                          style={{
                            fontSize: 22,
                            color: "var(--color-cream)",
                          }}
                        >
                          {s.name}
                        </span>
                      </div>
                      <div
                        className="hidden md:block font-body-serif italic mt-1 truncate"
                        style={{
                          fontSize: 12,
                          color: "var(--color-cream)",
                          opacity: 0.6,
                        }}
                      >
                        {(playersByTeam.get(s.team_id) ?? []).join(" · ")}
                      </div>
                    </div>
                    <span
                      className="hidden md:inline font-mono text-right"
                      style={{
                        fontSize: 14,
                        color: "var(--color-cream)",
                        opacity: 0.85,
                      }}
                    >
                      {s.day1_points}
                    </span>
                    <span
                      className="hidden md:inline font-mono text-right"
                      style={{
                        fontSize: 14,
                        color: "var(--color-cream)",
                        opacity: 0.85,
                      }}
                    >
                      {s.day2_points}
                    </span>
                    <span
                      className="hidden md:inline font-mono text-right"
                      style={{
                        fontSize: 14,
                        color: "var(--color-cream)",
                        opacity: 0.4,
                      }}
                    >
                      {s.day3_points || "—"}
                    </span>
                    <span
                      className="font-mono text-right"
                      style={{
                        fontSize: 22,
                        color: "var(--color-gold)",
                        fontWeight: 500,
                      }}
                    >
                      {s.total_points}
                    </span>
                  </Link>
                );
              })
            )}
            <div
              className="mt-3.5 font-ui uppercase"
              style={{
                fontSize: 9,
                letterSpacing: "0.25em",
                color: "var(--color-cream)",
                opacity: 0.55,
              }}
            >
              Updated on the half hour during play.
            </div>
          </div>
        </div>
      </section>

      {/* SCHEDULE — three days, three courses */}
      <section className="paper-grain bg-[var(--color-cream)]">
        <div className="mx-auto max-w-[1280px] px-5 md:px-8 py-12 md:py-16">
          <div className="eyebrow">The schedule</div>
          <h2
            className="font-display text-[var(--color-navy)] mt-1.5"
            style={{ fontSize: 44, lineHeight: 1 }}
          >
            Three days. Three courses.
          </h2>
          <div className="rule-gold mt-5" />
          <div className="grid md:grid-cols-3 gap-8">
            {rounds.map((r) => {
              const status = roundStatus(r);
              return (
                <div
                  key={r.id}
                  className="py-5 md:py-7 border-b md:border-b-0"
                  style={{ borderColor: "var(--color-rule-cream)" }}
                >
                  <div className="flex items-baseline justify-between mb-1.5">
                    <span
                      className="font-mono"
                      style={{ fontSize: 22, color: "var(--color-gold)" }}
                    >
                      {toRoman(r.day)}
                    </span>
                    <StatusBadge status={status} />
                  </div>
                  <Link
                    href={`/day${r.day}` as never}
                    className="font-display text-[var(--color-navy)] hover:text-[var(--color-gold)] transition-colors"
                    style={{ fontSize: 32, lineHeight: 1.05, display: "block" }}
                  >
                    {r.course_name}
                  </Link>
                  <div
                    className="font-body-serif italic mt-1.5"
                    style={{ fontSize: 13, color: "var(--color-stone)" }}
                  >
                    {formatLabel(r.format)}
                  </div>
                  <div
                    className="font-ui uppercase mt-3"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.22em",
                      color: "var(--color-stone)",
                    }}
                  >
                    {formatRoundDate(r.date)} · {formatTeeTime(r.tee_time)}
                  </div>
                  <DayBreakdown day={r.day} standings={standings} />
                </div>
              );
            })}
          </div>
        </div>
      </section>

    </div>
  );
}

function heroBlurb(
  round: RoundRow,
  thru: number,
  standings: ReturnType<typeof computeLeaderboard>,
): string {
  const top3 = standings.slice(0, 3);
  const close =
    top3.length === 3 ? top3[2].total_points - top3[0].total_points : 0;
  const closeBlurb = close > 0 ? ` Three teams within ${close} points.` : "";
  const fmt =
    round.format === "singles"
      ? "Singles · net stroke play."
      : round.format === "scramble_2man"
        ? "Two-man scramble. Pools AD & BC."
        : "Four men. One ball. The Cup is decided.";
  const thruBlurb = thru > 0 ? ` ${thru === 18 ? "Final round." : `Through hole ${thru}.`}` : "";
  return `${fmt}${thruBlurb}${closeBlurb}`;
}

function formatLabel(f: string): string {
  if (f === "singles") return "Singles · net stroke play";
  if (f === "scramble_2man") return "Two-man scramble · pools AD & BC";
  return "Four-man team scramble · for the Cup";
}

function DayBreakdown({
  day,
  standings,
}: {
  day: number;
  standings: ReturnType<typeof computeLeaderboard>;
}) {
  const rows = standings
    .map((s) => ({
      name: s.name,
      color: s.display_color,
      pts: day === 1 ? s.day1_points : day === 2 ? s.day2_points : s.day3_points,
    }))
    .sort((a, b) => b.pts - a.pts);

  const hasAny = rows.some((r) => r.pts > 0);
  if (!hasAny) return null;

  return (
    <div className="mt-4 space-y-1.5">
      {rows.map((r) => (
        <div key={r.name} className="flex items-center gap-2">
          <span
            className="inline-block rounded-full shrink-0"
            style={{ width: 7, height: 7, background: r.color }}
          />
          <span
            className="font-body-serif italic flex-1 truncate"
            style={{ fontSize: 12, color: "var(--color-ink)" }}
          >
            {r.name}
          </span>
          <span
            className="font-mono shrink-0"
            style={{ fontSize: 12, color: r.pts > 0 ? "var(--color-navy)" : "var(--color-stone)" }}
          >
            {r.pts} pt{r.pts !== 1 ? "s" : ""}
          </span>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: "FINAL" | "LIVE" | "UPCOMING" }) {
  const base = "font-ui font-semibold uppercase";
  const styles = {
    fontSize: 9,
    letterSpacing: "0.28em",
  } as const;
  if (status === "LIVE")
    return (
      <span
        className={`${base} pulse-live`}
        style={{
          ...styles,
          color: "var(--color-oxblood)",
          border: "1px solid var(--color-oxblood)",
          padding: "2px 8px",
        }}
      >
        LIVE
      </span>
    );
  if (status === "FINAL")
    return (
      <span
        className={base}
        style={{
          ...styles,
          color: "var(--color-cream)",
          background: "var(--color-navy)",
          padding: "4px 8px",
        }}
      >
        FINAL
      </span>
    );
  return (
    <span className={base} style={{ ...styles, color: "var(--color-stone)" }}>
      UPCOMING
    </span>
  );
}

function fmtToPar(n: number): string {
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

function LiveStandingsRow({
  rank,
  primary,
  secondary,
  color,
  toPar,
  thru,
  href,
  highlight,
}: {
  rank: string;
  primary: string;
  secondary?: string | null;
  color: string;
  toPar: number;
  thru: number;
  href: string;
  highlight: boolean;
}) {
  const started = thru > 0;
  return (
    <Link
      href={href as never}
      className="grid items-center relative md:grid-cols-[40px_1fr_70px_60px] grid-cols-[28px_1fr_50px_44px] hover:opacity-80 transition-opacity"
      style={{
        padding: "12px 0",
        borderBottom: "1px solid rgba(165,136,89,0.25)",
      }}
    >
      {highlight && (
        <span
          className="absolute"
          style={{
            left: -12,
            top: 0,
            bottom: 0,
            width: 3,
            background: "var(--color-gold)",
          }}
        />
      )}
      <span
        className="font-mono md:text-lg text-sm"
        style={{
          color: highlight ? "var(--color-gold)" : "var(--color-cream)",
        }}
      >
        {rank}
      </span>
      <div className="min-w-0">
        <div className="flex items-center gap-2.5">
          <span
            className="inline-block rounded-full shrink-0"
            style={{ width: 8, height: 8, background: color }}
          />
          <span
            className="font-display truncate"
            style={{ fontSize: 18, color: "var(--color-cream)" }}
          >
            {primary}
          </span>
        </div>
        {secondary && (
          <div
            className="hidden md:block font-body-serif italic mt-1 truncate"
            style={{
              fontSize: 11,
              color: "var(--color-cream)",
              opacity: 0.6,
            }}
          >
            {secondary}
          </div>
        )}
      </div>
      <span
        className="font-mono text-right"
        style={{
          fontSize: 18,
          color: started ? "var(--color-gold)" : "var(--color-cream)",
          opacity: started ? 1 : 0.4,
          fontWeight: 500,
        }}
      >
        {started ? fmtToPar(toPar) : "—"}
      </span>
      <span
        className="font-mono text-right"
        style={{
          fontSize: 11,
          color: "var(--color-cream)",
          opacity: 0.55,
        }}
      >
        {started ? `THRU ${thru}` : ""}
      </span>
    </Link>
  );
}

function Day1LiveStandings({ rows }: { rows: Day1IndividualRow[] }) {
  return (
    <>
      {rows.map((r) => (
        <LiveStandingsRow
          key={r.player_id}
          rank={r.rank > 0 ? `${r.rank}` : "—"}
          primary={r.player_name}
          secondary={`${r.team_name} · vs ${r.opponent_name}`}
          color={r.display_color}
          toPar={r.score_to_par}
          thru={r.holes_thru}
          href={`/day1/matches/${r.match_id}`}
          highlight={r.rank === 1 && r.holes_thru > 0}
        />
      ))}
    </>
  );
}

function Day2LiveStandings({ rows }: { rows: Day2EntryDisplayRow[] }) {
  return (
    <>
      {rows.map((r) => (
        <LiveStandingsRow
          key={r.entry_id}
          rank={`${r.pool}${r.rank_in_pool ? r.rank_in_pool : ""}`}
          primary={
            r.participant_names.length
              ? r.participant_names.join(" & ")
              : r.team_name
          }
          secondary={r.team_name}
          color={r.display_color}
          toPar={r.score_to_par}
          thru={r.holes_thru}
          href={`/day2/entries/${r.entry_id}`}
          highlight={r.rank_in_pool === 1 && r.holes_thru > 0}
        />
      ))}
    </>
  );
}

function Day3LiveStandings({ rows }: { rows: Day3EntryDisplayRow[] }) {
  return (
    <>
      {rows.map((r) => (
        <LiveStandingsRow
          key={r.entry_id}
          rank={r.rank > 0 ? `${r.rank}` : "—"}
          primary={r.team_name}
          secondary={r.participant_names.join(" · ")}
          color={r.display_color}
          toPar={r.score_to_par}
          thru={r.holes_thru}
          href={`/day3/entries/${r.entry_id}`}
          highlight={r.rank === 1 && r.holes_thru > 0}
        />
      ))}
    </>
  );
}
