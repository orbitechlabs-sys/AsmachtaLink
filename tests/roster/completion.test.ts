import { describe, expect, it } from "vitest";
import {
  addToTally,
  completionOutcomeOf,
  completionPercent,
  emptyTally,
  isCompletedRosterEntry,
  rosterStatusLabel,
  UNKNOWN_ROSTER_STATUS_LABEL,
  COMPLETED_ROSTER_STATUSES,
} from "@/lib/roster/completion";
import { ROSTER_STATUSES, ROSTER_STATUS_LABELS } from "@/lib/types";

const entry = (status: unknown, is_reserve = 0) =>
  ({ status, is_reserve } as { status: string | null; is_reserve: number });

describe("roster completion — the allow-list", () => {
  it("counts only 'passed' as completed", () => {
    expect(COMPLETED_ROSTER_STATUSES).toEqual(["passed"]);
    expect(isCompletedRosterEntry(entry("passed"))).toBe(true);
  });

  it("never treats any other known status as completed", () => {
    // The bug was a report that counted every roster row; every status below is one a
    // soldier can legitimately hold on a certification marked "בוצעה".
    for (const status of ROSTER_STATUSES.filter((s) => s !== "passed")) {
      expect(isCompletedRosterEntry(entry(status))).toBe(false);
    }
  });

  it("never defaults NULL, empty or legacy values to completed", () => {
    for (const bad of [null, undefined, "", "   ", "legacy_done", "PASSED", 1, {}]) {
      expect(isCompletedRosterEntry(entry(bad))).toBe(false);
    }
  });

  it("puts reserve in its own bucket, never in completed", () => {
    // A reserve soldier occupies no seat. Counting them as completed would inflate the
    // figure; counting them as not-completed would report a failure they never had.
    expect(completionOutcomeOf(entry("passed", 1))).toBe("reserve");
    expect(completionOutcomeOf(entry("registered", 1))).toBe("reserve");
    expect(completionOutcomeOf(entry("failed", 1))).toBe("reserve");
  });

  it("buckets non-reserve rows by their own status", () => {
    expect(completionOutcomeOf(entry("passed"))).toBe("completed");
    expect(completionOutcomeOf(entry("failed"))).toBe("not_completed");
    expect(completionOutcomeOf(entry("did_not_participate"))).toBe("not_completed");
    expect(completionOutcomeOf(entry(null))).toBe("not_completed");
  });
});

describe("status labels", () => {
  it("uses the app's Hebrew label for every known status", () => {
    for (const status of ROSTER_STATUSES) {
      expect(rosterStatusLabel(status)).toBe(ROSTER_STATUS_LABELS[status]);
    }
  });

  it("falls back to a neutral label, never a success one", () => {
    for (const bad of [null, undefined, "", "legacy_value"]) {
      const label = rosterStatusLabel(bad);
      expect(label).toBe(UNKNOWN_ROSTER_STATUS_LABEL);
      expect(label).not.toBe(ROSTER_STATUS_LABELS.passed);
      expect(label).not.toBe(ROSTER_STATUS_LABELS.participated);
    }
  });
});

describe("tallies", () => {
  it("sums to the total and keeps the buckets disjoint", () => {
    const t = emptyTally();
    for (const e of [entry("passed"), entry("passed"), entry("failed"), entry("registered", 1)]) {
      addToTally(t, completionOutcomeOf(e));
    }
    expect(t).toEqual({
      completed_count: 2,
      not_completed_count: 1,
      reserve_count: 1,
      total_count: 4,
    });
    expect(t.completed_count + t.not_completed_count + t.reserve_count).toBe(t.total_count);
  });

  it("excludes reserve from the percentage denominator", () => {
    // 2 of 3 eligible, with a reserve row that was never in the running.
    expect(
      completionPercent({
        completed_count: 2,
        not_completed_count: 1,
        reserve_count: 5,
        total_count: 8,
      })
    ).toBe(67);
  });

  it("returns 0 rather than NaN when nothing is eligible", () => {
    expect(completionPercent(emptyTally())).toBe(0);
    expect(
      completionPercent({ completed_count: 0, not_completed_count: 0, reserve_count: 3, total_count: 3 })
    ).toBe(0);
  });
});
