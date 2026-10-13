// Configurable grading policy. Replace the bands with GUVTC's official scale (Settings → grading).
export type GradeBand = { min: number; grade: string; remark: string };

export const DEFAULT_BANDS: GradeBand[] = [
  { min: 75, grade: "Distinction", remark: "Excellent competence" },
  { min: 65, grade: "Merit", remark: "Very good competence" },
  { min: 50, grade: "Pass", remark: "Competent" },
  { min: 0, grade: "Not yet competent", remark: "Re-assessment required" },
];

export function gradeFor(pct: number, bands: GradeBand[] = DEFAULT_BANDS) {
  const sorted = [...bands].sort((a, b) => b.min - a.min);
  return sorted.find((b) => pct >= b.min) ?? sorted[sorted.length - 1];
}

export type ComponentMark = { weight: number; maxMarks: number; marks: number | null; status: string };

/**
 * Weighted course mark. Returns null when any component is withheld/incomplete,
 * or when not all weight is yet published. Absent counts as zero.
 */
export function computeFinal(components: ComponentMark[]) {
  if (components.length === 0) return null;
  if (components.some((c) => c.status === "WITHHELD" || c.status === "INCOMPLETE")) return null;
  const totalWeight = components.reduce((s, c) => s + c.weight, 0);
  if (totalWeight === 0) return null;
  const weighted = components.reduce((s, c) => {
    const m = c.status === "ABSENT" ? 0 : c.marks ?? 0;
    return s + (m / c.maxMarks) * c.weight;
  }, 0);
  return Math.round((weighted / totalWeight) * 1000) / 10;
}
