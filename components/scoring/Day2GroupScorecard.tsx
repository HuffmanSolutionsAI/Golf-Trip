"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveRefresh } from "@/lib/client/useLiveRefresh";
import { HoleEntrySheet } from "@/components/scoring/HoleEntrySheet";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { toRoman, formatTeeTime } from "@/lib/utils";
import type {
  Day2H2HDisplayRow,
  Day2PoolRankRow,
  HoleRow,
  HoleScoreRow,
  RoundRow,
  ScrambleEntryRow,
  TeamRow,
} from "@/lib/types";

export type EntryInfo = {
  entry: ScrambleEntryRow;
  team: TeamRow;
  participantNames: string[];
};

type Props = {
  entries: EntryInfo[];
  groupNumber: number | null;
  scheduledTime: string | null;
  round: RoundRow;
  holes: HoleRow[];
  initialScores: HoleScoreRow[];
  poolRanks: Day2PoolRankRow[];
  h2h: Day2H2HDisplayRow | null;
  teamsById: Record<string, TeamRow>;
  myId: string | null;
  isAdmin: boolean;
  scorerId: string | null;
  scorerName: string | null;
  eventId?: string;
};

function fmtToPar(n: number, parThru: number): string {
  if (parThru === 0) return "—";
  if (n === 0) return "E";
  return n > 0 ? `+${n}` : `${n}`;
}

export function Day2GroupScorecard(props: Props) {
  const router = useRouter();
  const [scores, setScores] = useState<HoleScoreRow[]>(props.initialScores);
  const [sheet, setSheet] = useState<{
    holeNumber: number;
    par: number;
    entryId: string;
    label: string;
    initial: number | null;
    notes: string[];
  } | null>(null);

  useLiveRefresh(["hole_scores", "scramble_entries"], props.eventId);

  useEffect(() => setScores(props.initialScores), [props.initialScores]);

  const scoresByEntry = new Map<string, Map<number, number>>();
  for (const e of props.entries) scoresByEntry.set(e.entry.id, new Map());
  scores.forEach((s) => {
    if (s.scramble_entry_id && scoresByEntry.has(s.scramble_entry_id)) {
      scoresByEntry
        .get(s.scramble_entry_id)!
        .set(s.hole_number, s.strokes);
    }
  });

  const canEnter =
    props.isAdmin || (!!props.scorerId && props.myId === props.scorerId);

  const firstEmpty = (() => {
    for (let h = 1; h <= 18; h++) {
      for (const e of props.entries) {
        if (!scoresByEntry.get(e.entry.id)?.has(h)) return h;
      }
    }
    return null;
  })();

  // Aggregate stats per entry for the entry header card.
  const entryStats = useMemo(() => {
    const m = new Map<
      string,
      { raw: number; thru: number; parThru: number; toPar: number }
    >();
    for (const e of props.entries) {
      let raw = 0;
      let thru = 0;
      let parT = 0;
      const sm = scoresByEntry.get(e.entry.id) ?? new Map();
      for (const h of props.holes) {
        const s = sm.get(h.hole_number);
        if (s !== undefined) {
          raw += s;
          thru += 1;
          parT += h.par;
        }
      }
      m.set(e.entry.id, { raw, thru, parThru: parT, toPar: raw - parT });
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scores, props.entries, props.holes]);

  async function saveScore(
    entryId: string,
    holeNumber: number,
    strokes: number,
  ) {
    const placeholder: HoleScoreRow = {
      id: `optimistic-${entryId}-${holeNumber}`,
      round_id: props.round.id,
      player_id: null,
      scramble_entry_id: entryId,
      hole_number: holeNumber,
      strokes,
      entered_by: props.myId ?? "",
      entered_at: new Date().toISOString(),
    };
    setScores((prev) => {
      const without = prev.filter(
        (s) =>
          !(s.scramble_entry_id === entryId && s.hole_number === holeNumber),
      );
      return [...without, placeholder];
    });

    const res = await fetch("/api/scores/day2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scrambleEntryId: entryId,
        holeNumber,
        strokes,
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Save failed.");
    }
    router.refresh();
  }

  async function deleteScoreFor(entryId: string, holeNumber: number) {
    const existing = scores.find(
      (s) => s.scramble_entry_id === entryId && s.hole_number === holeNumber,
    );
    if (!existing) return;
    setScores((prev) =>
      prev.filter(
        (s) =>
          !(s.scramble_entry_id === entryId && s.hole_number === holeNumber),
      ),
    );
    const res = await fetch(`/api/scores/${existing.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? "Delete failed.");
    }
    router.refresh();
  }

  function openHole(entryId: string, holeNumber: number, par: number) {
    const e = props.entries.find((x) => x.entry.id === entryId);
    if (!e) return;
    const notes: string[] = [];
    if (props.round.is_locked) notes.push("Round is locked — admin only");
    const current =
      scoresByEntry.get(entryId)?.get(holeNumber) ?? null;
    const label = e.participantNames.length
      ? e.participantNames.join(" & ")
      : e.team.name;
    setSheet({
      holeNumber,
      par,
      entryId,
      label,
      initial: current,
      notes,
    });
  }

  const groupLabel = (() => {
    if (props.groupNumber === null) return "GROUP";
    const time = props.scheduledTime ? formatTeeTime(props.scheduledTime) : null;
    return `TEE ${toRoman(props.groupNumber)}${time ? ` · ${time.toUpperCase()}` : ""}`;
  })();

  return (
    <div>
      {/* HERO */}
      <div
        className="navy-grain text-[var(--color-cream)]"
        style={{ borderBottom: "1px solid var(--color-gold)" }}
      >
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 py-7 md:py-10">
          <Link
            href="/day2"
            className="inline-flex items-center gap-1 text-[var(--color-cream)]"
            style={{ opacity: 0.85 }}
          >
            <ChevronLeft size={16} />
            <span
              className="font-ui uppercase"
              style={{
                fontSize: 10,
                letterSpacing: "0.32em",
                color: "var(--color-gold)",
                fontWeight: 500,
              }}
            >
              {groupLabel} · DAY II · {props.round.course_name.toUpperCase()}
            </span>
          </Link>
          {props.scorerName && (
            <div
              className="font-ui uppercase mt-2"
              style={{
                fontSize: 9,
                letterSpacing: "0.28em",
                color: canEnter ? "var(--color-gold)" : "var(--color-stone)",
                fontWeight: 500,
              }}
            >
              Scored by {props.scorerName}
              {!canEnter ? " · read only" : ""}
            </div>
          )}

          {props.h2h && <H2HBanner h2h={props.h2h} />}

          <div className="mt-5 space-y-4">
            {props.entries.map((info, idx) => {
              const stats = entryStats.get(info.entry.id) ?? {
                raw: 0,
                thru: 0,
                parThru: 0,
                toPar: 0,
              };
              const rank = props.poolRanks.find(
                (r) => r.entry_id === info.entry.id,
              );
              return (
                <EntryHeaderCard
                  key={info.entry.id}
                  info={info}
                  raw={stats.raw}
                  thru={stats.thru}
                  toPar={fmtToPar(stats.toPar, stats.parThru)}
                  rank={rank}
                  primary={idx === 0}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="paper-grain bg-[var(--color-cream)] pb-16 md:pb-24">
        <div className="mx-auto max-w-[1100px] px-5 md:px-8 pt-6 md:pt-10">
          <PoolStandings
            entries={props.entries}
            poolRanks={props.poolRanks}
            teamsById={props.teamsById}
          />
        </div>
        <div className="mx-auto max-w-[1100px] px-0 md:px-8 pt-6 md:pt-10">
          <div className="px-5 md:px-0 mb-3">
            <div className="eyebrow">The card</div>
          </div>
          <table className="w-full scorecard-cell" style={{ fontSize: 14 }}>
            <thead style={{ background: "var(--color-navy)" }}>
              <tr>
                <th
                  className="py-2.5 text-left"
                  style={{
                    paddingLeft: 18,
                    color: "var(--color-cream)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
                  H
                </th>
                <th
                  className="py-2.5"
                  style={{
                    color: "var(--color-cream)",
                    fontFamily: "var(--font-ui)",
                    fontSize: 10,
                    letterSpacing: "0.18em",
                    fontWeight: 500,
                    textTransform: "uppercase",
                  }}
                >
                  Par
                </th>
                {props.entries.map((info, i) => (
                  <th
                    key={info.entry.id}
                    className="py-2.5 text-right"
                    style={{
                      paddingRight: i === props.entries.length - 1 ? 18 : 0,
                      color: "var(--color-cream)",
                      fontFamily: "var(--font-ui)",
                      fontSize: 10,
                      letterSpacing: "0.18em",
                      fontWeight: 500,
                      textTransform: "uppercase",
                    }}
                  >
                    {info.entry.pool ?? info.team.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {props.holes.map((h, idx) => {
                const isCurrent = h.hole_number === firstEmpty;
                return (
                  <tr
                    key={h.hole_number}
                    style={{
                      background: isCurrent
                        ? "rgba(165,136,89,0.14)"
                        : idx % 2
                          ? "var(--color-paper)"
                          : "transparent",
                      borderBottom: "1px solid var(--color-rule)",
                    }}
                  >
                    <td
                      className="py-2"
                      style={{ paddingLeft: 18, color: "var(--color-navy)" }}
                    >
                      {h.hole_number}
                    </td>
                    <td className="py-2" style={{ color: "var(--color-stone)" }}>
                      {h.par}
                    </td>
                    {props.entries.map((info, i) => {
                      const s = scoresByEntry
                        .get(info.entry.id)
                        ?.get(h.hole_number);
                      return (
                        <td
                          key={info.entry.id}
                          className={`py-2 text-right ${canEnter && !props.round.is_locked ? "cursor-pointer hover:bg-[var(--color-cream)]" : ""}`}
                          style={{
                            paddingRight:
                              i === props.entries.length - 1 ? 18 : 0,
                            color: "var(--color-navy)",
                          }}
                          onClick={() =>
                            canEnter &&
                            !props.round.is_locked &&
                            openHole(info.entry.id, h.hole_number, h.par)
                          }
                        >
                          {s ?? "·"}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="px-5 md:px-0 pt-6 flex gap-2.5">
            {firstEmpty && canEnter && !props.round.is_locked && (
              <button
                className="flex-1 bg-[var(--color-navy)] text-[var(--color-cream)] font-ui font-medium uppercase"
                style={{
                  fontSize: 11,
                  letterSpacing: "0.3em",
                  padding: "16px 0",
                }}
                onClick={() => {
                  const h = props.holes.find((x) => x.hole_number === firstEmpty);
                  if (!h) return;
                  const missing = props.entries.find(
                    (e) =>
                      !scoresByEntry.get(e.entry.id)?.has(firstEmpty),
                  );
                  if (!missing) return;
                  openHole(missing.entry.id, firstEmpty, h.par);
                }}
              >
                Enter Hole {firstEmpty}
              </button>
            )}
            <Link
              href="/day2"
              className="flex-1 text-center text-[var(--color-navy)] font-ui font-medium uppercase"
              style={{
                fontSize: 11,
                letterSpacing: "0.3em",
                padding: "16px 0",
                border: "1px solid var(--color-navy)",
              }}
            >
              All Pairs
            </Link>
          </div>
          {props.isAdmin && (
            <div className="px-5 md:px-0 pt-3">
              <button
                onClick={async () => {
                  const ok = window.confirm(
                    "Clear all scores for both pairs in this tee time? This cannot be undone.",
                  );
                  if (!ok) return;
                  const entryIds = props.entries.map((e) => e.entry.id);
                  const res = await fetch("/api/admin/clear-scores", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      roundId: props.round.id,
                      entryIds,
                    }),
                  });
                  if (!res.ok) {
                    const body = await res.json().catch(() => ({}));
                    window.alert(body.error ?? "Clear failed.");
                    return;
                  }
                  setScores([]);
                  router.refresh();
                }}
                className="w-full font-ui font-medium uppercase"
                style={{
                  fontSize: 10,
                  letterSpacing: "0.3em",
                  padding: "12px 0",
                  color: "var(--color-oxblood)",
                  border: "1px solid var(--color-oxblood)",
                  background: "transparent",
                }}
              >
                Clear all scores
              </button>
            </div>
          )}
        </div>

        {sheet && (
          <HoleEntrySheet
            open
            onClose={() => setSheet(null)}
            onDelete={async () => {
              await deleteScoreFor(sheet.entryId, sheet.holeNumber);
              setSheet(null);
            }}
            onSubmit={async (strokes) => {
              const justSavedHole = sheet.holeNumber;
              const justSavedEntry = sheet.entryId;
              const justSavedPar = sheet.par;
              const wasEdit = sheet.initial !== null;
              await saveScore(justSavedEntry, justSavedHole, strokes);
              if (wasEdit) {
                setSheet(null);
                return;
              }
              // Auto-advance to the next entry on the same hole that hasn't
              // been entered yet. Walk forward in entry display order so the
              // scorer runs AD → BC.
              const startIndex = props.entries.findIndex(
                (e) => e.entry.id === justSavedEntry,
              );
              let nextEntry: EntryInfo | null = null;
              for (let offset = 1; offset <= props.entries.length; offset++) {
                const idx = (startIndex + offset) % props.entries.length;
                const candidate = props.entries[idx];
                if (candidate.entry.id === justSavedEntry) continue;
                const has =
                  scoresByEntry.get(candidate.entry.id)?.has(justSavedHole) ?? false;
                if (!has) {
                  nextEntry = candidate;
                  break;
                }
              }
              if (nextEntry) {
                const notes: string[] = [];
                if (props.round.is_locked)
                  notes.push("Round is locked — admin only");
                const label = nextEntry.participantNames.length
                  ? nextEntry.participantNames.join(" & ")
                  : nextEntry.team.name;
                setSheet({
                  holeNumber: justSavedHole,
                  par: justSavedPar,
                  entryId: nextEntry.entry.id,
                  label,
                  initial: null,
                  notes,
                });
              } else {
                setSheet(null);
              }
            }}
            holeNumber={sheet.holeNumber}
            par={sheet.par}
            initialStrokes={sheet.initial}
            notes={sheet.notes}
            playerLabel={sheet.label}
          />
        )}
      </div>
    </div>
  );
}

function H2HBanner({ h2h }: { h2h: Day2H2HDisplayRow }) {
  const headline = (() => {
    if (h2h.status === "pending") return "Match starts at the first hole";
    if (h2h.status === "in_progress") {
      if (h2h.entry_a.raw === h2h.entry_b.raw) {
        return `All square · thru ${Math.min(h2h.entry_a.thru, h2h.entry_b.thru)}`;
      }
      const leader =
        h2h.entry_a.raw < h2h.entry_b.raw ? h2h.entry_a : h2h.entry_b;
      const margin = Math.abs(h2h.entry_a.raw - h2h.entry_b.raw);
      return `${leader.team_name} −${margin}`;
    }
    if (h2h.is_tie) return "Match halved · ½ pt each";
    const winner =
      h2h.winner_team_id === h2h.entry_a.team_id ? h2h.entry_a : h2h.entry_b;
    return `${winner.team_name} wins · 1 pt`;
  })();
  const sub =
    h2h.status === "final"
      ? "Final"
      : h2h.status === "in_progress"
        ? "Live · 1 pt up for grabs"
        : "Pending · 1 pt up for grabs";
  return (
    <div
      className="mt-4"
      style={{
        padding: "12px 16px",
        border: "1px solid var(--color-gold)",
        background: "rgba(165,136,89,0.06)",
      }}
    >
      <div className="flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <div
            className="font-ui uppercase"
            style={{
              fontSize: 9,
              letterSpacing: "0.3em",
              color: "var(--color-gold)",
              fontWeight: 600,
            }}
          >
            Head to head
          </div>
          <div
            className="font-display mt-1"
            style={{
              fontSize: 22,
              lineHeight: 1.1,
              color: "var(--color-cream)",
            }}
          >
            {headline}
          </div>
        </div>
        <div
          className="font-ui uppercase"
          style={{
            fontSize: 9,
            letterSpacing: "0.28em",
            color:
              h2h.status === "in_progress"
                ? "var(--color-oxblood)"
                : "var(--color-stone)",
            fontWeight: 600,
          }}
        >
          {sub}
        </div>
      </div>
    </div>
  );
}

function PoolStandings({
  entries,
  poolRanks,
  teamsById,
}: {
  entries: EntryInfo[];
  poolRanks: Day2PoolRankRow[];
  teamsById: Record<string, TeamRow>;
}) {
  const ourPools = Array.from(
    new Set(entries.map((e) => e.entry.pool).filter((p): p is "AD" | "BC" => !!p)),
  );
  if (ourPools.length === 0) return null;
  return (
    <div className="space-y-5 mb-2">
      {ourPools.map((pool) => {
        const rows = poolRanks
          .filter((r) => r.pool === pool)
          .slice()
          .sort((a, b) => a.rank_in_pool - b.rank_in_pool);
        if (rows.length === 0) return null;
        const ourEntryIds = new Set(
          entries
            .filter((e) => e.entry.pool === pool)
            .map((e) => e.entry.id),
        );
        return (
          <div key={pool}>
            <div className="eyebrow">Pool {pool} standings</div>
            <div className="rule-gold mt-2 mb-2" />
            <ul>
              {rows.map((r) => {
                const team = teamsById[r.team_id];
                const highlight = ourEntryIds.has(r.entry_id);
                return (
                  <li
                    key={r.entry_id}
                    className="flex items-center gap-2.5 py-2"
                    style={{
                      borderBottom: "1px solid var(--color-rule-cream)",
                    }}
                  >
                    <span
                      className="font-mono shrink-0 text-right"
                      style={{
                        width: 24,
                        color: highlight
                          ? "var(--color-gold)"
                          : "var(--color-stone)",
                        fontSize: 14,
                      }}
                    >
                      {r.rank_in_pool}
                    </span>
                    <span
                      className="inline-block rounded-full shrink-0"
                      style={{
                        width: 8,
                        height: 8,
                        background: team?.display_color ?? "transparent",
                      }}
                    />
                    <span
                      className="font-display flex-1 truncate"
                      style={{
                        fontSize: 16,
                        color: "var(--color-navy)",
                        fontWeight: highlight ? 600 : 400,
                      }}
                    >
                      {team?.name ?? "—"}
                    </span>
                    <span
                      className="font-mono shrink-0 text-right"
                      style={{ fontSize: 13, color: "var(--color-navy)" }}
                    >
                      {r.team_raw === 0 ? "—" : r.team_raw}
                    </span>
                    <span
                      className="font-ui uppercase shrink-0 text-right"
                      style={{
                        width: 70,
                        fontSize: 9,
                        letterSpacing: "0.22em",
                        color: "var(--color-stone)",
                      }}
                    >
                      {r.holes_thru === 0 ? "—" : `THRU ${r.holes_thru}`}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

function EntryHeaderCard({
  info,
  raw,
  thru,
  toPar,
  rank,
  primary,
}: {
  info: EntryInfo;
  raw: number;
  thru: number;
  toPar: string;
  rank: Day2PoolRankRow | undefined;
  primary: boolean;
}) {
  return (
    <div
      style={{
        padding: "16px 18px",
        border: primary
          ? "1px solid var(--color-gold)"
          : "1px solid rgba(165,136,89,0.3)",
        background: primary ? "rgba(165,136,89,0.08)" : "transparent",
      }}
    >
      <div className="flex items-baseline justify-between mb-2 gap-2 flex-wrap">
        <span
          className="font-ui uppercase"
          style={{
            fontSize: 9,
            letterSpacing: "0.28em",
            color: "var(--color-gold)",
            fontWeight: 500,
          }}
        >
          POOL {info.entry.pool ?? "—"}
        </span>
        {rank && rank.holes_thru > 0 && (
          <span
            className="font-ui uppercase"
            style={{
              fontSize: 9,
              letterSpacing: "0.3em",
              color: "var(--color-stone)",
              fontWeight: 600,
            }}
          >
            #{rank.rank_in_pool} IN POOL · THRU {rank.holes_thru}
          </span>
        )}
      </div>
      <div
        className="grid items-center gap-3"
        style={{ gridTemplateColumns: "1fr auto" }}
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <span
              className="inline-block rounded-full shrink-0"
              style={{
                width: 10,
                height: 10,
                background: info.team.display_color,
              }}
            />
            <span
              className="font-display truncate"
              style={{
                fontSize: primary ? 28 : 22,
                lineHeight: 1.05,
                color: "var(--color-cream)",
              }}
            >
              {info.participantNames.length
                ? info.participantNames.join(" & ")
                : info.team.name}
            </span>
          </div>
          <div
            className="font-body-serif italic mt-1.5 truncate"
            style={{
              fontSize: 12,
              color: "var(--color-cream)",
              opacity: 0.65,
            }}
          >
            {info.team.name}
          </div>
        </div>
        <div className="text-right">
          <div
            className="font-mono"
            style={{
              fontSize: primary ? 28 : 22,
              color: "var(--color-gold)",
            }}
          >
            {toPar}
          </div>
          <div
            className="font-ui uppercase"
            style={{
              fontSize: 9,
              letterSpacing: "0.28em",
              color: "var(--color-cream)",
              opacity: 0.55,
            }}
          >
            {thru === 0 ? "—" : `${raw} · THRU ${thru}`}
          </div>
        </div>
      </div>
    </div>
  );
}
