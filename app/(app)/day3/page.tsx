import Link from "next/link";
import { getRoundByDay } from "@/lib/repo/rounds";
import {
  listParticipantsForEntry,
  listScrambleEntries,
} from "@/lib/repo/scores";
import { listPlayers, listTeams } from "@/lib/repo/players";
import { computeDay3StandingRows } from "@/lib/repo/standings";
import { listTeeGroupsWithMembers } from "@/lib/repo/teeGroups";
import { roundHandicap } from "@/lib/scoring/handicaps";
import { formatTeeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ROMAN_LIST = ["I", "II", "III", "IV", "V"];

export default function Day3IndexPage() {
  const round = getRoundByDay(3);
  if (!round) return null;

  const entries = listScrambleEntries(round.id);
  const standings = computeDay3StandingRows();
  const teams = new Map(listTeams().map((t) => [t.id, t]));
  const players = new Map(listPlayers().map((p) => [p.id, p]));
  const standByEntry = new Map(standings.map((s) => [s.entry_id, s]));

  const sorted = [...entries].sort(
    (a, b) =>
      (standByEntry.get(a.id)?.rank ?? 99) -
      (standByEntry.get(b.id)?.rank ?? 99),
  );

  const groups = listTeeGroupsWithMembers().filter(
    (g) => g.round_id === round.id,
  );
  const groupByEntry = new Map<string, (typeof groups)[number]>();
  for (const g of groups) {
    for (const eid of g.scramble_entry_ids) groupByEntry.set(eid, g);
  }

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
            DAY III · {round.course_name.toUpperCase()}
          </div>
          <h1
            className="font-display text-[var(--color-navy)] mt-3"
            style={{
              fontSize: 56,
              lineHeight: 1,
              letterSpacing: "-0.01em",
            }}
          >
            The team scramble.
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
            Four men. One ball. Eighteen holes. The Cup is decided here.
          </p>
        </div>
      </div>

      <div className="paper-grain">
        <div className="mx-auto max-w-[900px] px-5 md:px-8 py-8 md:py-12">
          <div
            className="divider-stars font-ui font-semibold mb-8"
            style={{
              fontSize: 9,
              letterSpacing: "0.32em",
              color: "var(--color-gold)",
            }}
          >
            <span>UP NEXT · {formatTeeTime(round.tee_time).toUpperCase()} SATURDAY</span>
          </div>
          {sorted.map((e, i) => {
            const team = teams.get(e.team_id);
            const teamPlayers = listParticipantsForEntry(e.id)
              .map((p) => players.get(p.player_id))
              .filter(Boolean) as ReturnType<typeof listPlayers>;
            const standing = standByEntry.get(e.id);
            return (
              <Link
                key={e.id}
                href={`/day3/entries/${e.id}`}
                className="block py-6 md:py-7"
                style={{
                  borderTop: i === 0 ? "1px solid var(--color-rule)" : 0,
                  borderBottom: "1px solid var(--color-rule-cream)",
                }}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-3">
                    <span
                      className="font-mono"
                      style={{
                        fontSize: 16,
                        color: "var(--color-gold)",
                        width: 24,
                      }}
                    >
                      {ROMAN_LIST[i] ?? i + 1}
                    </span>
                    <span
                      className="inline-block rounded-full"
                      style={{
                        width: 10,
                        height: 10,
                        background: team?.display_color,
                      }}
                    />
                    <span
                      className="font-display text-[var(--color-navy)]"
                      style={{ fontSize: 28 }}
                    >
                      {team?.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div
                      className="font-mono"
                      style={{
                        fontSize: 14,
                        color: "var(--color-stone)",
                      }}
                    >
                      {standing && standing.holes_thru > 0
                        ? `${standing.team_raw} · thru ${standing.holes_thru}`
                        : "—"}
                    </div>
                    {(() => {
                      const g = groupByEntry.get(e.id);
                      const time = g?.scheduled_time
                        ? formatTeeTime(g.scheduled_time)
                        : null;
                      return time ? (
                        <div
                          className="font-ui uppercase mt-1"
                          style={{
                            fontSize: 9,
                            letterSpacing: "0.25em",
                            color: "var(--color-stone)",
                          }}
                        >
                          {time}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </div>
                <div
                  className="grid grid-cols-2 md:grid-cols-4 gap-2 ml-9"
                >
                  {teamPlayers.map((p) => (
                    <div
                      key={p.id}
                      className="font-body-serif italic"
                      style={{ fontSize: 13, color: "var(--color-ink)" }}
                    >
                      {p.name}{" "}
                      <span
                        className="font-mono"
                        style={{
                          fontSize: 10,
                          color: "var(--color-stone)",
                          fontStyle: "normal",
                        }}
                      >
                        · hcp {roundHandicap(p.handicap)}
                      </span>
                    </div>
                  ))}
                </div>
              </Link>
            );
          })}
          <div className="text-center mt-10">
            <div
              className="divider-stars font-ui font-semibold"
              style={{
                fontSize: 9,
                letterSpacing: "0.32em",
                color: "var(--color-gold)",
              }}
            >
              <span>FOR THE CUP</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
