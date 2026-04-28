import { listRounds } from "@/lib/repo/rounds";
import { formatTeeTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default function FormatPage() {
  const rounds = listRounds();
  const r1 = rounds.find((r) => r.day === 1);
  const r2 = rounds.find((r) => r.day === 2);
  const r3 = rounds.find((r) => r.day === 3);

  const days = [
    {
      num: "I",
      title: "Net stroke play",
      course: r1
        ? `${r1.course_name} · ${formatTeeTime(r1.tee_time)} tee`
        : "Pinewild · 10:21 a.m. tee",
      body: "Twenty members. Ten head-to-head matchups, drawn by handicap. Each player records eighteen holes, gross. Net = gross minus strokes given. The lower net wins the matchup and earns two points for their team. A halve splits the points one and one. Day I sets the table.",
      points: "20 points · individual",
    },
    {
      num: "II",
      title: "Two-man scramble",
      course: r2
        ? `${r2.course_name} · ${formatTeeTime(r2.tee_time)} tee`
        : "Talamore · 8:45 a.m. tee",
      body: "Ten pairs across two pools — AD and BC. Each pair plays one ball, scramble format, gross to par. In each pool, first place takes four points, second three, third two, fourth one, fifth zero. Day II rewards good pairings.",
      points: "20 points · pools",
    },
    {
      num: "III",
      title: "The team scramble",
      course: r3
        ? `${r3.course_name} · ${formatTeeTime(r3.tee_time)} tee`
        : "Hyland · 10:00 a.m. tee",
      body: "Five teams of four. One ball, eighteen holes, scramble format. Placement points awarded by lowest gross — eight, six, four, two, zero. Plus a bonus point for every stroke the team finishes under par. The Cup is decided here.",
      points: "20 + bonus · for the Cup",
    },
  ];

  return (
    <div>
      <div
        className="navy-grain text-[var(--color-cream)]"
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
            VOLUME III · THE FORMAT
          </div>
          <h1
            className="font-display mt-3"
            style={{
              fontSize: 56,
              lineHeight: 1,
              letterSpacing: "-0.01em",
              color: "var(--color-cream)",
            }}
          >
            Three days. One Cup.
          </h1>
          <p
            className="font-body-serif italic mt-4"
            style={{
              fontSize: 17,
              opacity: 0.72,
              lineHeight: 1.55,
              maxWidth: 640,
            }}
          >
            The Invitational is decided across three rounds. Day I is individual
            net stroke play, head-to-head. Day II is two-man scramble. Day III
            is the team scramble — and the Cup.
          </p>
        </div>
      </div>

      <div className="paper-grain">
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-10 md:py-14">
          {days.map((d, i) => (
            <div
              key={d.num}
              className="grid md:grid-cols-[100px_1fr_200px] gap-4 md:gap-10 py-8 md:py-10"
              style={{
                borderTop: i === 0 ? "1px solid var(--color-rule)" : 0,
                borderBottom: "1px solid var(--color-rule)",
                alignItems: "start",
              }}
            >
              <div>
                <div
                  className="font-mono"
                  style={{
                    fontSize: 80,
                    color: "var(--color-gold)",
                    lineHeight: 1,
                    letterSpacing: "-0.02em",
                  }}
                >
                  {d.num}
                </div>
              </div>
              <div>
                <div
                  className="font-display text-[var(--color-navy)]"
                  style={{ fontSize: 42, lineHeight: 1 }}
                >
                  {d.title}
                </div>
                <div
                  className="font-ui uppercase mt-2"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.28em",
                    color: "var(--color-stone)",
                  }}
                >
                  {d.course}
                </div>
                <p
                  className="font-body-serif mt-4"
                  style={{
                    fontSize: 16,
                    color: "var(--color-ink)",
                    lineHeight: 1.65,
                    maxWidth: 580,
                  }}
                >
                  {d.body}
                </p>
              </div>
              <div className="md:text-right">
                <div className="eyebrow">Worth</div>
                <div
                  className="font-display text-[var(--color-navy)] mt-1.5"
                  style={{ fontSize: 28, lineHeight: 1 }}
                >
                  {d.points}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
