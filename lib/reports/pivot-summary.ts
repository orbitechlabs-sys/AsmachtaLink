import {
  completionPercent,
  emptyTally,
  rosterStatusLabel,
  COMPLETION_OUTCOME_LABELS,
  type CompletionTally,
} from "@/lib/roster/completion";
import type { BattalionSoldierCount, PivotReport } from "@/lib/db/repositories/certification-pivot";

/**
 * Everything the פילוח הסמכות report DERIVES from one `PivotReport` — the header totals,
 * the chart's empty-state wording, and both Excel sheets.
 *
 * They live together, and are pure, so "the chart, the numbers and the export can never
 * disagree" is a property of the code rather than a promise: there is exactly one place
 * that turns per-battalion tallies into anything a person reads, and it is unit-tested.
 * The tallies themselves come from `lib/roster/completion.ts`, which is the single source
 * of truth for whether one soldier completed.
 */

/** Header totals: the sum of the per-battalion tallies, never a re-count of the rows. */
export function sumTallies(rows: readonly BattalionSoldierCount[]): CompletionTally {
  return rows.reduce<CompletionTally>(
    (acc, r) => ({
      completed_count: acc.completed_count + r.completed_count,
      not_completed_count: acc.not_completed_count + r.not_completed_count,
      reserve_count: acc.reserve_count + r.reserve_count,
      total_count: acc.total_count + r.total_count,
    }),
    emptyTally()
  );
}

/**
 * The denominator of "השלימו X מתוך Y".
 *
 * Reserve is excluded from BOTH sides — it is never in the numerator (a עתודה row buckets
 * as `reserve`, never `completed`) and it is not in Y either. That matches how עתודה is
 * treated everywhere else in the system: a reserve soldier occupies no seat, so they were
 * never in the running and counting them as a shortfall would invent one.
 */
export function eligibleCount(tally: CompletionTally): number {
  return tally.completed_count + tally.not_completed_count;
}

/**
 * The chart's Hebrew empty state. Two distinct facts get two distinct sentences: nothing
 * matched the filters at all, versus soldiers matched but none has passed yet. Merging
 * them sends someone hunting for a data problem that does not exist — which is exactly
 * what an all-zero chart with no message caused.
 *
 * Returns null when there is something to draw.
 */
export function pivotEmptyChartMessage(
  rows: readonly BattalionSoldierCount[]
): string | null {
  if (rows.some((r) => r.completed_count > 0)) return null;
  return rows.some((r) => r.total_count > 0)
    ? "אף חייל בבחירה הנוכחית לא סומן כמי שעבר הסמכה"
    : "אין חיילים בהסמכות ובטווח שנבחרו";
}

/** The "סיכום" sheet — one row per battalion, the same figures the chart draws. */
export function pivotSummarySheetRows(report: PivotReport): Record<string, string | number>[] {
  return report.rows.map((r) => ({
    גדוד: r.battalion_name,
    [COMPLETION_OUTCOME_LABELS.completed]: r.completed_count,
    [COMPLETION_OUTCOME_LABELS.not_completed]: r.not_completed_count,
    [COMPLETION_OUTCOME_LABELS.reserve]: r.reserve_count,
    "סה״כ רשומות": r.total_count,
    "אחוז השלמה": `${completionPercent(r)}%`,
  }));
}

/** The "פירוט חיילים" sheet — one row per soldier, carrying their real Hebrew status. */
export function pivotSoldierSheetRows(report: PivotReport): Record<string, string | number>[] {
  return report.soldiers.map((s) => ({
    גדוד: s.battalion_name,
    הסמכה: s.certification_name,
    שם: s.full_name,
    "מספר אישי": s.personal_number,
    סטטוס: rosterStatusLabel(s.status),
    "השלים הסמכה": s.outcome === "completed" ? "כן" : "לא",
    סוג: s.is_reserve === 1 ? COMPLETION_OUTCOME_LABELS.reserve : "רגיל",
  }));
}
