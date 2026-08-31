import { ROSTER_STATUS_LABELS, ROSTER_STATUSES, type RosterStatus } from "@/lib/types";

/**
 * THE single answer to "did this soldier complete the certification?".
 *
 * Every report, total, per-battalion breakdown and export routes through here. The bug
 * this exists to prevent is inferring completion from the CERTIFICATION's status — a
 * certification marked "בוצעה" says the cycle ran, not that any particular soldier passed
 * it — or from the mere existence of a roster row, which is what the פילוח report used to
 * do (it counted every row regardless of state, so a failed soldier and a passing one were
 * indistinguishable).
 *
 * IT IS AN ALLOW-LIST, AND THE DEFAULT IS "NOT COMPLETED". A deny-list would silently
 * promote every future status, every legacy value and every NULL into the completed
 * bucket; the direction of that failure matters, because over-reporting completions hides
 * a training gap rather than inventing one.
 */

/**
 * The only status that asserts completion.
 *
 * `participated` ("השתתף") is deliberately NOT here: it records attendance, not outcome.
 * The app's own completion flow (`confirmCertificationCompletion`) writes exactly `passed`
 * or `failed` for every non-reserve soldier, so `passed` is the only value that ever means
 * "this soldier came through the certification".
 */
export const COMPLETED_ROSTER_STATUSES: RosterStatus[] = ["passed"];

/** What one roster row contributes to the report. */
export type CompletionOutcome = "completed" | "not_completed" | "reserve";

/** The fields the decision needs — deliberately narrow, so any row shape can be passed. */
export interface RosterCompletionFields {
  status: string | null | undefined;
  /** 1 for a עתודה (reserve) row. */
  is_reserve: number | null | undefined;
}

/**
 * Buckets one roster row.
 *
 * Reserve is checked FIRST and is its own bucket. A reserve soldier never occupies a seat,
 * so they must not be counted as completing one — and collapsing them into
 * "not completed" would read as a failure they never had.
 */
export function completionOutcomeOf(entry: RosterCompletionFields): CompletionOutcome {
  if (entry.is_reserve === 1) return "reserve";
  return isCompletedStatus(entry.status) ? "completed" : "not_completed";
}

/** True only for a status on the allow-list. NULL, "", and anything unrecognized are
 * false — never completed by default. */
export function isCompletedStatus(status: string | null | undefined): boolean {
  if (typeof status !== "string") return false;
  return (COMPLETED_ROSTER_STATUSES as string[]).includes(status.trim());
}

/** True only for a non-reserve row whose own status says it completed. */
export function isCompletedRosterEntry(entry: RosterCompletionFields): boolean {
  return completionOutcomeOf(entry) === "completed";
}

/** Shown when a row carries a status the app has no label for — a legacy value, an empty
 * string, or NULL. Neutral on purpose: it must never read as a success. */
export const UNKNOWN_ROSTER_STATUS_LABEL = "סטטוס לא ידוע";

/**
 * The Hebrew label for a roster status, falling back to a neutral "unknown" rather than to
 * anything that could be mistaken for a pass.
 *
 * Takes a loose string because report rows come back from SQL as `text`, where the
 * `RosterStatus` union is an assumption rather than a guarantee.
 */
export function rosterStatusLabel(status: string | null | undefined): string {
  if (typeof status !== "string") return UNKNOWN_ROSTER_STATUS_LABEL;
  const trimmed = status.trim();
  return (ROSTER_STATUSES as string[]).includes(trimmed)
    ? ROSTER_STATUS_LABELS[trimmed as RosterStatus]
    : UNKNOWN_ROSTER_STATUS_LABEL;
}

/** Hebrew headings for the three buckets, so the screen and the export word them alike. */
export const COMPLETION_OUTCOME_LABELS: Record<CompletionOutcome, string> = {
  completed: "השלימו",
  not_completed: "לא השלימו",
  reserve: "עתודה",
};

/** Per-battalion tallies, all derived from {@link completionOutcomeOf}. */
export interface CompletionTally {
  completed_count: number;
  not_completed_count: number;
  reserve_count: number;
  /** Every roster row, whatever its outcome. Never a completion figure. */
  total_count: number;
}

export function emptyTally(): CompletionTally {
  return { completed_count: 0, not_completed_count: 0, reserve_count: 0, total_count: 0 };
}

/** Adds one row to a tally, in place. */
export function addToTally(tally: CompletionTally, outcome: CompletionOutcome): void {
  tally.total_count += 1;
  if (outcome === "completed") tally.completed_count += 1;
  else if (outcome === "reserve") tally.reserve_count += 1;
  else tally.not_completed_count += 1;
}

/**
 * Completed as a percentage of the seats that could have been completed — reserve rows are
 * excluded from the denominator, since they were never in the running. Returns 0 when
 * there is nothing to divide by, so the UI never renders NaN.
 */
export function completionPercent(tally: CompletionTally): number {
  const eligible = tally.completed_count + tally.not_completed_count;
  return eligible === 0 ? 0 : Math.round((tally.completed_count / eligible) * 100);
}
