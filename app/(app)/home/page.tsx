import { createServerSupabase } from "@/lib/supabase/server";
import { getCurrentPlayer } from "@/lib/server/currentPlayer";
import { Card, CardContent, CardEyebrow, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRoundDate, formatTeeTime } from "@/lib/utils";
import Link from "next/link";
import type { LeaderboardRow, RoundRow, ChatMessageRow } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const player = await getCurrentPlayer();
  const supabase = await createServerSupabase();

  const [roundsRes, lbRes, chatRes] = await Promise.all([
    supabase.from("rounds").select("*").order("day"),
    supabase.from("v_leaderboard").select("*").order("rank"),
    supabase
      .from("chat_messages")
      .select("*")
      .order("posted_at", { ascending: false })
      .limit(3),
  ]);

  const rounds = (roundsRes.data ?? []) as RoundRow[];
  const leaderboard = (lbRes.data ?? []) as LeaderboardRow[];
  const recentChat = (chatRes.data ?? []) as ChatMessageRow[];

  const yourTeam = leaderboard.find((r) => r.team_id === player?.team_id);
  const now = new Date();

  // Hero action decision tree
  const liveRound =
    rounds.find((r) => {
      const roundDate = new Date(r.date + "T" + r.tee_time);
      const endOfDay = new Date(roundDate);
      endOfDay.setHours(23, 59, 59);
      return !r.is_locked && roundDate <= now && now <= endOfDay;
    }) ?? null;

  const upcomingRound = rounds.find((r) => {
    const when = new Date(r.date + "T" + r.tee_time);
    return when > now;
  });

  const allFinal = rounds.every((r) => r.is_locked);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
      {/* Hero action card */}
      <Card>
        <CardContent className="flex flex-col gap-2">
          {liveRound ? (
            <HeroLive roundDay={liveRound.day} course={liveRound.course_name} />
          ) : allFinal ? (
            <HeroFinal />
          ) : upcomingRound ? (
            <HeroUpcoming
              day={upcomingRound.day}
              course={upcomingRound.course_name}
              when={new Date(upcomingRound.date + "T" + upcomingRound.tee_time)}
            />
          ) : (
            <HeroFinal />
          )}
        </CardContent>
      </Card>

      {/* Your team */}
      {yourTeam && (
        <Card>
          <CardContent className="flex items-center justify-between">
            <div>
              <CardEyebrow>Your team</CardEyebrow>
              <div className="font-display text-xl text-[var(--color-navy)] flex items-center gap-2">
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: yourTeam.display_color }}
                />
                {yourTeam.name}
              </div>
              <div className="font-ui text-xs text-neutral-600 mt-1">
                {ordinal(yourTeam.rank)} · {yourTeam.total_points} pts · {yourTeam.status_label}
              </div>
            </div>
            <Link href="/leaderboard" className="text-[var(--color-gold)] text-xs uppercase tracking-widest font-ui">
              Leaderboard →
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Leaderboard preview */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardEyebrow>Leaderboard</CardEyebrow>
            <CardTitle>Top teams</CardTitle>
          </div>
          <Link href="/leaderboard" className="text-xs uppercase tracking-widest font-ui text-[var(--color-gold)]">
            See full →
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {leaderboard.slice(0, 3).map((row) => (
            <div key={row.team_id} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-mono text-sm text-[var(--color-navy)]">
                  {row.rank}
                </span>
                <span
                  className="inline-block w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: row.display_color }}
                />
                <span className="font-ui text-sm">{row.name}</span>
              </div>
              <span className="font-mono text-sm tabular-nums">{row.total_points}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Schedule snippet */}
      <Card>
        <CardHeader>
          <CardEyebrow>Schedule</CardEyebrow>
          <CardTitle>Three rounds</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {rounds.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <div>
                <div className="font-ui font-semibold text-[var(--color-navy)]">
                  Day {r.day} · {formatRoundDate(r.date)} · {formatTeeTime(r.tee_time)}
                </div>
                <div className="font-body-serif italic text-neutral-700">
                  {r.course_name}
                </div>
              </div>
              <RoundStatusChip round={r} />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Chat preview */}
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <CardEyebrow>Chat</CardEyebrow>
            <CardTitle>Recent</CardTitle>
          </div>
          <Link href="/chat" className="text-xs uppercase tracking-widest font-ui text-[var(--color-gold)]">
            See all →
          </Link>
        </CardHeader>
        <CardContent>
          {recentChat.length === 0 ? (
            <p className="font-body-serif italic text-neutral-600">No messages yet — kick it off on the range.</p>
          ) : (
            <ul className="space-y-3 text-sm">
              {[...recentChat].reverse().map((m) => (
                <li key={m.id} className={m.kind === "system" ? "italic text-neutral-600 text-center" : ""}>
                  {m.body}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function HeroLive({ roundDay, course }: { roundDay: number; course: string }) {
  const href = `/day${roundDay}`;
  return (
    <>
      <CardEyebrow>Live now</CardEyebrow>
      <div className="font-display text-2xl text-[var(--color-navy)]">
        Enter your Day {roundDay} scores
      </div>
      <div className="font-body-serif italic text-neutral-700">{course}</div>
      <Link
        href={href as never}
        className="mt-3 inline-flex self-start bg-[var(--color-gold)] text-[var(--color-navy-deep)] font-ui font-semibold uppercase tracking-wider text-xs rounded-md px-4 py-2 hover:bg-[var(--color-gold-light)]"
      >
        Go to scorecard →
      </Link>
    </>
  );
}

function HeroUpcoming({
  day,
  course,
  when,
}: {
  day: number;
  course: string;
  when: Date;
}) {
  const diff = when.getTime() - Date.now();
  const hours = Math.max(0, Math.floor(diff / 3600000));
  const minutes = Math.max(0, Math.floor((diff % 3600000) / 60000));
  return (
    <>
      <CardEyebrow>Up next</CardEyebrow>
      <div className="font-display text-2xl text-[var(--color-navy)]">
        ⏰ Day {day} tees off in {hours}h {minutes}m
      </div>
      <div className="font-body-serif italic text-neutral-700">{course}</div>
    </>
  );
}

function HeroFinal() {
  return (
    <>
      <CardEyebrow>Tournament</CardEyebrow>
      <div className="font-display text-2xl text-[var(--color-navy)]">
        🏆 Tournament complete — final results
      </div>
      <Link
        href="/leaderboard"
        className="mt-3 inline-flex self-start bg-[var(--color-gold)] text-[var(--color-navy-deep)] font-ui font-semibold uppercase tracking-wider text-xs rounded-md px-4 py-2 hover:bg-[var(--color-gold-light)]"
      >
        See final leaderboard →
      </Link>
    </>
  );
}

function RoundStatusChip({ round }: { round: RoundRow }) {
  const now = new Date();
  const start = new Date(round.date + "T" + round.tee_time);
  const status = round.is_locked
    ? "FINAL"
    : start > now
      ? "UPCOMING"
      : "LIVE";
  const base = "text-[10px] font-ui font-semibold uppercase tracking-[0.25em] rounded px-2 py-1";
  if (status === "UPCOMING")
    return <span className={`${base} bg-neutral-200 text-neutral-600`}>{status}</span>;
  if (status === "FINAL")
    return (
      <span className={`${base} bg-[var(--color-navy)] text-[var(--color-cream)]`}>
        {status}
      </span>
    );
  return (
    <span className={`${base} bg-[var(--color-oxblood)] text-[var(--color-cream)] pulse-live`}>
      {status}
    </span>
  );
}
