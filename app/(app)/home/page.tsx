import Link from "next/link";
import { getCurrentPlayer } from "@/lib/session";
import { formatRoundDate, formatTeeTime, toRoman } from "@/lib/utils";
import { listRounds } from "@/lib/repo/rounds";
import { computeLeaderboard } from "@/lib/repo/standings";
import { listRecentMessagesDesc } from "@/lib/repo/chat";
import type { RoundRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const player = await getCurrentPlayer();
  const rounds = listRounds();
  const leaderboard = computeLeaderboard();
  const recentChat = listRecentMessagesDesc(3);
  const yourTeam = leaderboard.find((r) => r.team_id === player?.team_id);
  const now = new Date();

  const liveRound =
    rounds.find((r) => {
      const start = new Date(`${r.date}T${r.tee_time}`);
      const endOfDay = new Date(start);
      endOfDay.setHours(23, 59, 59);
      return !r.is_locked && start <= now && now <= endOfDay;
    }) ?? null;

  const upcomingRound = rounds.find((r) => new Date(`${r.date}T${r.tee_time}`) > now);
  const allFinal = rounds.every((r) => !!r.is_locked);

  return (
    <div className="paper-grain mx-auto max-w-3xl px-4 py-6 space-y-6">
      <section>
        {liveRound ? (
          <HeroLive roundDay={liveRound.day} course={liveRound.course_name} />
        ) : allFinal ? (
          <HeroFinal />
        ) : upcomingRound ? (
          <HeroUpcoming
            day={upcomingRound.day}
            course={upcomingRound.course_name}
            when={new Date(`${upcomingRound.date}T${upcomingRound.tee_time}`)}
          />
        ) : (
          <HeroFinal />
        )}
      </section>

      {yourTeam && (
        <section
          className="flex items-start justify-between"
          style={{
            borderTop: "1px solid var(--color-gold)",
            borderBottom: "1px solid var(--color-gold)",
            padding: "14px 0",
          }}
        >
          <div>
            <div className="eyebrow">Your team</div>
            <div className="font-display text-[22px] text-[var(--color-navy)] mt-1 flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ backgroundColor: yourTeam.display_color }}
              />
              {yourTeam.name}
            </div>
            <div className="font-body-serif italic text-xs text-[var(--color-stone)] mt-1">
              {yourTeam.status_label}
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-4xl text-[var(--color-navy)] leading-none">
              {yourTeam.total_points}
            </div>
            <div className="eyebrow-stone mt-1" style={{ fontSize: 8 }}>
              {ordinal(yourTeam.rank)} · PTS
            </div>
          </div>
        </section>
      )}

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <div className="eyebrow">Standings · Top III</div>
          <Link
            href="/leaderboard"
            className="text-[10px] font-ui uppercase tracking-[0.25em] text-[var(--color-gold)] font-semibold"
          >
            See all →
          </Link>
        </div>
        <div className="rule-gold mb-1" />
        {leaderboard.slice(0, 3).map((row, i) => (
          <div
            key={row.team_id}
            className="grid items-center gap-2.5 py-2.5"
            style={{
              gridTemplateColumns: "24px 1fr auto auto",
              borderBottom: "1px solid var(--color-rule-cream)",
              borderTop: i === 0 ? 0 : 0,
            }}
          >
            <span className="font-mono text-sm text-[var(--color-navy)]">{toRoman(row.rank)}</span>
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="inline-block w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: row.display_color }}
              />
              <span className="font-display text-[17px] text-[var(--color-navy)] truncate">
                {row.name}
              </span>
            </div>
            <span className="font-mono text-[10px] text-[var(--color-stone)]">
              {row.day1_points}·{row.day2_points}·{row.day3_points || "—"}
            </span>
            <span className="font-mono text-lg text-[var(--color-navy)]">
              {row.total_points}
            </span>
          </div>
        ))}
      </section>

      <section>
        <div className="eyebrow mb-2">The schedule</div>
        {rounds.map((r) => (
          <div
            key={r.id}
            className="flex items-center justify-between py-3"
            style={{ borderTop: "1px solid var(--color-rule-cream)" }}
          >
            <div>
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[12px] text-[var(--color-gold)]">
                  {toRoman(r.day)}
                </span>
                <span className="font-display text-base text-[var(--color-navy)]">
                  {r.course_name}
                </span>
              </div>
              <div className="font-body-serif italic text-[11px] text-[var(--color-stone)] mt-0.5">
                {formatRoundDate(r.date)} · {formatTeeTime(r.tee_time)}
              </div>
            </div>
            <RoundStatusChip round={r} />
          </div>
        ))}
      </section>

      <section>
        <div className="flex items-baseline justify-between mb-2">
          <div className="eyebrow">Recent chat</div>
          <Link
            href="/chat"
            className="text-[10px] font-ui uppercase tracking-[0.25em] text-[var(--color-gold)] font-semibold"
          >
            See all →
          </Link>
        </div>
        <div className="rule-gold mb-2" />
        {recentChat.length === 0 ? (
          <p className="font-body-serif italic text-[var(--color-stone)] text-sm">
            No messages yet — kick it off on the range.
          </p>
        ) : (
          <ul className="space-y-2 text-sm">
            {[...recentChat].reverse().map((m) => (
              <li
                key={m.id}
                className={
                  m.kind === "system"
                    ? "italic text-[var(--color-stone)] text-center font-body-serif"
                    : "font-body-serif"
                }
              >
                {m.body}
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="pt-4 pb-2 text-center">
        <div
          className="divider-stars font-ui font-semibold"
          style={{ fontSize: 8, letterSpacing: "0.32em" }}
        >
          <span>THE STAPLETON CUP</span>
        </div>
        <div className="font-body-serif italic text-[13px] text-[var(--color-stone)] mt-3 leading-relaxed">
          “One mark forever. One small thing new every year. That is the deal.”
        </div>
      </div>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function HeroLive({ roundDay, course }: { roundDay: number; course: string }) {
  return (
    <>
      <div className="eyebrow">Live · Round in progress</div>
      <h1
        className="font-display text-[var(--color-navy)] mt-2"
        style={{ fontSize: 30, lineHeight: 1.05 }}
      >
        Day{" "}
        <span className="font-mono not-italic" style={{ fontSize: 24 }}>
          {toRoman(roundDay)}
        </span>{" "}
        · {course}
      </h1>
      <div className="font-body-serif italic text-[13px] text-[var(--color-stone)] mt-2">
        {roundDay === 1
          ? "Singles · net stroke play."
          : roundDay === 2
            ? "Two-man scramble. Pools AD & BC."
            : "Four men. One ball. The Cup is decided."}
      </div>
      <div className="mt-4 flex gap-2">
        <Link
          href={`/day${roundDay}` as never}
          className="flex-1 text-center bg-[var(--color-navy)] text-[var(--color-cream)] py-3 font-ui font-medium uppercase text-[10px] tracking-[0.25em]"
        >
          Enter scores
        </Link>
        <Link
          href="/leaderboard"
          className="flex-1 text-center bg-transparent text-[var(--color-navy)] py-3 font-ui font-medium uppercase text-[10px] tracking-[0.25em] border border-[var(--color-navy)]"
        >
          Leaderboard
        </Link>
      </div>
    </>
  );
}

function HeroUpcoming({ day, course, when }: { day: number; course: string; when: Date }) {
  const diff = when.getTime() - Date.now();
  const hours = Math.max(0, Math.floor(diff / 3600000));
  const minutes = Math.max(0, Math.floor((diff % 3600000) / 60000));
  return (
    <>
      <div className="eyebrow">Up next</div>
      <h1
        className="font-display text-[var(--color-navy)] mt-2"
        style={{ fontSize: 28, lineHeight: 1.05 }}
      >
        Day{" "}
        <span className="font-mono not-italic" style={{ fontSize: 22 }}>
          {toRoman(day)}
        </span>{" "}
        tees off in {hours}h {minutes}m
      </h1>
      <div className="font-body-serif italic text-[13px] text-[var(--color-stone)] mt-2">
        {course}
      </div>
    </>
  );
}

function HeroFinal() {
  return (
    <>
      <div className="eyebrow">The tournament</div>
      <h1
        className="font-display text-[var(--color-navy)] mt-2"
        style={{ fontSize: 30, lineHeight: 1.05 }}
      >
        The field is finished.
      </h1>
      <div className="font-body-serif italic text-[13px] text-[var(--color-stone)] mt-2">
        Final results.
      </div>
      <Link
        href="/leaderboard"
        className="mt-4 inline-block bg-[var(--color-navy)] text-[var(--color-cream)] py-3 px-5 font-ui font-medium uppercase text-[10px] tracking-[0.25em]"
      >
        See the standings →
      </Link>
    </>
  );
}

function RoundStatusChip({ round }: { round: RoundRow }) {
  const now = new Date();
  const start = new Date(`${round.date}T${round.tee_time}`);
  const status = round.is_locked ? "FINAL" : start > now ? "UPCOMING" : "LIVE";
  const base =
    "font-ui font-semibold uppercase text-[8px] tracking-[0.25em] inline-block";
  if (status === "UPCOMING")
    return <span className={`${base} text-[var(--color-stone)]`}>{status}</span>;
  if (status === "FINAL")
    return (
      <span className={`${base} bg-[var(--color-navy)] text-[var(--color-cream)] px-2 py-1`}>
        {status}
      </span>
    );
  return (
    <span
      className={`${base} text-[var(--color-oxblood)] border border-[var(--color-oxblood)] px-2 py-0.5 pulse-live`}
    >
      {status}
    </span>
  );
}
