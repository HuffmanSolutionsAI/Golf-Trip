// Handicap rounding + Day 1 stroke allocation — reference implementation.

export function roundHandicap(hcp: number): number {
  // Half-up rounding to match the Excel tracker's ROUND() behavior.
  return Math.floor(hcp + 0.5);
}

export type StrokeAllocation = {
  strokeGiverId: string | null;
  strokesGiven: number;
  strokeHoles: number[];
};

export function computeStrokeAllocation(
  p1: { id: string; handicap: number },
  p2: { id: string; handicap: number },
  holes: { hole_number: number; handicap_index: number | null }[],
): StrokeAllocation {
  const r1 = roundHandicap(p1.handicap);
  const r2 = roundHandicap(p2.handicap);
  const gap = Math.abs(r1 - r2);

  if (gap <= 1) {
    return { strokeGiverId: null, strokesGiven: 0, strokeHoles: [] };
  }

  const strokesGiven = Math.min(gap, 11);
  const strokeGiverId = r1 > r2 ? p1.id : p2.id;

  const withIndex = holes.filter((h) => h.handicap_index !== null);
  if (withIndex.length < strokesGiven) {
    // Pending hdcp index data (e.g. Magnolia pre-fill). Commissioner re-seeds later.
    return { strokeGiverId, strokesGiven, strokeHoles: [] };
  }
  const sorted = [...withIndex].sort(
    (a, b) => (a.handicap_index as number) - (b.handicap_index as number),
  );
  const strokeHoles = sorted
    .slice(0, strokesGiven)
    .map((h) => h.hole_number)
    .sort((a, b) => a - b);

  return { strokeGiverId, strokesGiven, strokeHoles };
}
