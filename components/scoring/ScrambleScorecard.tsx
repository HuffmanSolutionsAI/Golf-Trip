"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useLiveRefresh } from "@/lib/client/useLiveRefresh";
import { HoleEntrySheet } from "@/components/scoring/HoleEntrySheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardEyebrow } from "@/components/ui/card";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type {
  Day2PoolRankRow,
  HoleRow,
  HoleScoreRow,
  PlayerRow,
  RoundRow,
  TeamRow,
} from "@/lib/types";

type Props = {
  mode: "day2" | "day3";
  entryId: string;
  round: RoundRow;
  holes: HoleRow[];
  initialScores: HoleScoreRow[];
  team: TeamRow;
  participantNames: string[];
  pool?: "AD" | "BC" | null;
  poolRanks?: Day2PoolRankRow[];
  canEnter: boolean;
  roundIsLocked: boolean;
  allPlayers?: PlayerRow[];
};

export function ScrambleScorecard(props: Props) {
  const router = useRouter();
  const [scores, setScores] = useState<HoleScoreRow[]>(props.initialScores);
  const [sheet, setSheet] = useState<{
    holeNumber: number;
    par: number;
    initial: number | null;
  } | null>(null);

  useLiveRefresh(["hole_scores", "scramble_entries"]);

  useEffect(() => setScores(props.initialScores), [props.initialScores]);

  const scoreByHole = new Map(scores.map((s) => [s.hole_number, s.strokes]));

  const firstEmpty = useMemo(
    () => Array.from({ length: 18 }, (_, i) => i + 1).find((h) => !scoreByHole.has(h)),
    [scores],
  );

  const { raw, holesThru, parThru } = useMemo(() => {
    let raw = 0;
    let thru = 0;
    let parT = 0;
    for (const h of props.holes) {
      const s = scoreByHole.get(h.hole_number);
      if (s !== undefined) {
        raw += s;
        thru += 1;
        parT += h.par;
      }
    }
    return { raw, holesThru: thru, parThru: parT };
  }, [scores, props.holes]);

  const myRank = props.poolRanks?.find((r) => r.entry_id === props.entryId);
  const endpoint = props.mode === "day2" ? "/api/scores/day2" : "/api/scores/day3";

  async function saveScore(holeNumber: number, strokes: number) {
    const placeholder: HoleScoreRow = {
      id: `optimistic-${props.entryId}-${holeNumber}`,
      round_id: props.round.id,
      player_id: null,
      scramble_entry_id: props.entryId,
      hole_number: holeNumber,
      strokes,
      entered_by: "",
      entered_at: new Date().toISOString(),
    };
    setScores((prev) => {
      const without = prev.filter((s) => s.hole_number !== holeNumber);
      return [...without, placeholder];
    });

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scrambleEntryId: props.entryId,
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

  const backHref = props.mode === "day2" ? "/day2" : "/day3";
  const under = Math.max(0, parThru - raw);
  const over = Math.max(0, raw - parThru);
  const relative = parThru === 0 ? "—" : raw === parThru ? "E" : under > 0 ? `−${under}` : `+${over}`;

  const day3ProjectedPlacement = useMemo(() => {
    if (props.mode !== "day3" || !props.poolRanks) return null;
    return null; // Day 3 uses v_day3_standings — see poolRanks prop for day2, or parent passes standings. We'll keep it simple here.
  }, [props.mode, props.poolRanks]);
  void day3ProjectedPlacement;

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 space-y-4">
      <div className="flex items-center justify-between">
        <Link href={backHref} className="flex items-center gap-1 text-sm font-ui text-[var(--color-navy)]">
          <ChevronLeft size={16} /> {props.mode === "day2" ? "Day 2" : "Day 3"}
        </Link>
        <div className="text-xs font-ui text-neutral-600 uppercase tracking-[0.2em]">
          {props.round.course_name}
        </div>
      </div>

      <Card>
        <CardContent>
          <div className="flex items-center gap-3">
            <span className="inline-block w-3 h-3 rounded-full" style={{ backgroundColor: props.team.display_color }} />
            <div>
              <div className="font-display text-xl text-[var(--color-navy)]">
                {props.team.name}
                {props.pool ? ` · Pool ${props.pool}` : ""}
              </div>
              <div className="font-body-serif italic text-neutral-700 text-sm">
                {props.participantNames.join(" · ")}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <CardEyebrow>Live status</CardEyebrow>
          <div className="mt-2 grid grid-cols-3 gap-3 text-sm">
            <div>
              <div className="text-xs text-neutral-500">Raw</div>
              <div className="font-mono text-lg tabular-nums">{raw || "—"}</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-neutral-500">Thru · par</div>
              <div className="font-mono text-lg tabular-nums">
                {holesThru}/18 · {parThru || 0}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-neutral-500">vs par</div>
              <div className="font-mono text-lg tabular-nums">{relative}</div>
            </div>
          </div>
          {props.mode === "day2" && myRank && (
            <div className="mt-3 text-sm text-center">
              <span className="font-ui text-xs text-neutral-500">Projected · Pool {props.pool}:</span>{" "}
              <span className="font-mono">rank {myRank.rank_in_pool}</span>{" "}
              <span className="text-neutral-500">· {myRank.points} pt {myRank.projected ? "(projected)" : ""}</span>
            </div>
          )}
        </CardContent>
      </Card>

      {props.mode === "day2" && props.poolRanks && (
        <Card>
          <CardContent>
            <CardEyebrow>Pool {props.pool} standings</CardEyebrow>
            <ul className="mt-2 divide-y divide-[var(--color-rule)]">
              {props.poolRanks
                .slice()
                .sort((a, b) => a.rank_in_pool - b.rank_in_pool)
                .map((r) => (
                  <li key={r.entry_id} className="py-1.5 flex justify-between text-sm">
                    <span className="font-ui">
                      {r.rank_in_pool}. {r.team_id === props.team.id ? props.team.name : `Team …${r.team_id.slice(0, 4)}`}
                    </span>
                    <span className="font-mono tabular-nums">{r.team_raw} · thru {r.holes_thru}</span>
                  </li>
                ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent>
          <CardEyebrow>Scorecard</CardEyebrow>
          <div className="mt-2 overflow-hidden rounded-md border border-[var(--color-rule)]">
            <table className="w-full text-sm scorecard-cell">
              <thead className="bg-[var(--color-navy)] text-[var(--color-cream)]">
                <tr>
                  <th className="py-1.5 px-2 text-left text-xs font-ui font-semibold">H</th>
                  <th className="py-1.5 px-2 text-left text-xs font-ui font-semibold">Par</th>
                  <th className="py-1.5 px-2 text-left text-xs font-ui font-semibold">Hdcp</th>
                  <th className="py-1.5 px-2 text-right text-xs font-ui font-semibold">Score</th>
                  <th className="py-1.5 px-2 text-right text-xs font-ui font-semibold">vs par</th>
                </tr>
              </thead>
              <tbody>
                {props.holes.map((h) => {
                  const s = scoreByHole.get(h.hole_number);
                  const vsPar = s !== undefined ? s - h.par : null;
                  const isCurrent = h.hole_number === firstEmpty;
                  return (
                    <tr
                      key={h.hole_number}
                      className={isCurrent ? "bg-[var(--color-gold-light)]/20" : "odd:bg-[var(--color-paper)]"}
                      onClick={() =>
                        props.canEnter && !props.roundIsLocked &&
                        setSheet({ holeNumber: h.hole_number, par: h.par, initial: s ?? null })
                      }
                    >
                      <td className="px-2 py-1.5">{h.hole_number}</td>
                      <td className="px-2 py-1.5">{h.par}</td>
                      <td className="px-2 py-1.5 text-neutral-600">{h.handicap_index ?? "—"}</td>
                      <td className={`px-2 py-1.5 text-right ${props.canEnter && !props.roundIsLocked ? "cursor-pointer" : ""}`}>
                        {s ?? "·"}
                      </td>
                      <td className="px-2 py-1.5 text-right text-neutral-600">
                        {vsPar === null ? "—" : vsPar === 0 ? "E" : vsPar > 0 ? `+${vsPar}` : vsPar}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {firstEmpty && props.canEnter && !props.roundIsLocked && (
        <div className="sticky bottom-16 md:bottom-0">
          <Button
            size="lg"
            variant="primary"
            className="w-full"
            onClick={() => {
              const h = props.holes.find((x) => x.hole_number === firstEmpty);
              if (!h) return;
              setSheet({ holeNumber: h.hole_number, par: h.par, initial: null });
            }}
          >
            Enter hole {firstEmpty}
          </Button>
        </div>
      )}

      {sheet && (
        <HoleEntrySheet
          open
          onClose={() => setSheet(null)}
          onSubmit={(strokes) => saveScore(sheet.holeNumber, strokes)}
          holeNumber={sheet.holeNumber}
          par={sheet.par}
          initialStrokes={sheet.initial}
          playerLabel={props.team.name + (props.pool ? ` · Pool ${props.pool}` : "")}
        />
      )}
    </div>
  );
}
