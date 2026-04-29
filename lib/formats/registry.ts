// Format registry. (Plan A · Phase 3a)
//
// Existing per-day scoring lives in lib/scoring/day{1,2,3}.ts; this module
// surfaces the formats those files implement as plain descriptors that a
// commissioner can pick from a dropdown. Legacy rounds.format strings
// ('singles', 'scramble_2man', 'scramble_4man') map to a plugin id here,
// so the rest of the codebase can ask "what plugin owns this round?"
// without learning the legacy enum.
//
// The full plugin contract from docs/PLAN-A-event-engine.md §3 (score
// schema, score-entry React component, computeStandings closure) lands in
// Phase 3b when the setup wizard actually instantiates rounds from the
// registry. For now we expose just enough to render a dropdown and to
// translate between the legacy format string and a stable plugin id.

export type FormatId = "match-play-net" | "scramble-pair" | "scramble-team";

export type FormatUnit = "individual" | "pair" | "team";

export type FormatDescriptor = {
  id: FormatId;
  display_name: string;
  short_label: string; // for table headers and badges
  unit: FormatUnit;
  participants_per_entry: number; // 1 / 2 / 4
  blurb: string; // one-liner shown in the picker
  legacy_format: "singles" | "scramble_2man" | "scramble_4man";
};

export const FORMATS: Record<FormatId, FormatDescriptor> = {
  "match-play-net": {
    id: "match-play-net",
    display_name: "Net stroke play",
    short_label: "Net stroke",
    unit: "individual",
    participants_per_entry: 1,
    blurb:
      "Head-to-head net stroke play. Strokes given by handicap differential, capped at 11. Winner takes 2 team points; halves split 1-1.",
    legacy_format: "singles",
  },
  "scramble-pair": {
    id: "scramble-pair",
    display_name: "Two-man scramble",
    short_label: "2-man scramble",
    unit: "pair",
    participants_per_entry: 2,
    blurb:
      "Pairs scramble — best ball of the partnership, gross to par. Pool ranking awards points by finishing position.",
    legacy_format: "scramble_2man",
  },
  "scramble-team": {
    id: "scramble-team",
    display_name: "Four-man scramble",
    short_label: "4-man scramble",
    unit: "team",
    participants_per_entry: 4,
    blurb:
      "Whole-team scramble — one ball per team, gross to par. Placement points plus under-par bonuses on the back nine.",
    legacy_format: "scramble_4man",
  },
};

export function listFormats(): FormatDescriptor[] {
  return Object.values(FORMATS);
}

export function getFormat(id: FormatId): FormatDescriptor {
  return FORMATS[id];
}

export function formatIdForLegacy(
  legacy: "singles" | "scramble_2man" | "scramble_4man",
): FormatId {
  for (const f of listFormats()) {
    if (f.legacy_format === legacy) return f.id;
  }
  // Should be unreachable given the legacy enum is closed.
  throw new Error(`Unknown legacy format: ${legacy}`);
}

export function formatIdForRound(round: {
  format: "singles" | "scramble_2man" | "scramble_4man";
}): FormatId {
  return formatIdForLegacy(round.format);
}
