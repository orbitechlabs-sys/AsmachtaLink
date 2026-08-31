import { describe, expect, it } from "vitest";
import {
  eligibleCount,
  pivotEmptyChartMessage,
  pivotSoldierSheetRows,
  pivotSummarySheetRows,
  sumTallies,
} from "@/lib/reports/pivot-summary";
import { completionPercent, COMPLETION_OUTCOME_LABELS } from "@/lib/roster/completion";
import type {
  BattalionSoldierCount,
  PivotReport,
  PivotSoldierRow,
} from "@/lib/db/repositories/certification-pivot";

const bn = (
  id: number,
  name: string,
  completed: number,
  notCompleted: number,
  reserve: number
): BattalionSoldierCount => ({
  battalion_id: id,
  battalion_code: String(id),
  battalion_name: name,
  color_hex: "#123456",
  completed_count: completed,
  not_completed_count: notCompleted,
  reserve_count: reserve,
  total_count: completed + notCompleted + reserve,
});

const soldier = (
  id: number,
  battalion: number,
  status: string,
  outcome: PivotSoldierRow["outcome"],
  isReserve = 0
): PivotSoldierRow => ({
  roster_entry_id: id,
  battalion_id: battalion,
  battalion_name: `גדוד ${battalion}`,
  color_hex: "#123456",
  certification_id: 1,
  certification_name: "האמר",
  full_name: `חייל ${id}`,
  personal_number: String(1000 + id),
  status,
  is_reserve: isReserve,
  outcome,
});

describe("header totals", () => {
  it("sums the per-battalion tallies", () => {
    const totals = sumTallies([bn(1, "א", 3, 1, 2), bn(2, "ב", 0, 4, 1)]);
    expect(totals).toEqual({
      completed_count: 3,
      not_completed_count: 5,
      reserve_count: 3,
      total_count: 11,
    });
  });

  it("reconciles: completed + not-completed + reserve == total, per battalion and overall", () => {
    const rows = [bn(1, "א", 3, 1, 2), bn(2, "ב", 0, 4, 1), bn(3, "ג", 0, 0, 0)];
    for (const r of rows) {
      expect(r.completed_count + r.not_completed_count + r.reserve_count).toBe(r.total_count);
    }
    const t = sumTallies(rows);
    expect(t.completed_count + t.not_completed_count + t.reserve_count).toBe(t.total_count);
  });

  it("excludes reserve from the denominator as well as the numerator", () => {
    // The screenshot's shape: 6 eligible, 3 reserve, nobody passed. "מתוך" must read 6,
    // not 9 — a reserve soldier occupies no seat and was never in the running.
    const t = sumTallies([bn(1, "א", 0, 6, 3)]);
    expect(eligibleCount(t)).toBe(6);
    expect(completionPercent(t)).toBe(0);
    // ...and reserve never leaks into the numerator either.
    expect(t.completed_count).toBe(0);
  });

  it("is empty-safe", () => {
    expect(sumTallies([])).toEqual({
      completed_count: 0,
      not_completed_count: 0,
      reserve_count: 0,
      total_count: 0,
    });
    expect(eligibleCount(sumTallies([]))).toBe(0);
    expect(completionPercent(sumTallies([]))).toBe(0);
  });
});

describe("chart empty state", () => {
  it("stays silent when there is a bar to draw", () => {
    expect(pivotEmptyChartMessage([bn(1, "א", 1, 0, 0)])).toBeNull();
  });

  it("distinguishes 'nobody passed' from 'nothing matched'", () => {
    // The regression: an all-zero chart drew a 2px sliver under 176px of white and read as
    // a component that had failed to render.
    const nobodyPassed = pivotEmptyChartMessage([bn(1, "א", 0, 6, 3)]);
    const nothingMatched = pivotEmptyChartMessage([bn(1, "א", 0, 0, 0)]);
    expect(nobodyPassed).toBe("אף חייל בבחירה הנוכחית לא סומן כמי שעבר הסמכה");
    expect(nothingMatched).toBe("אין חיילים בהסמכות ובטווח שנבחרו");
    expect(nobodyPassed).not.toBe(nothingMatched);
  });

  it("says something in Hebrew for every all-zero shape", () => {
    for (const rows of [[], [bn(1, "א", 0, 0, 0)], [bn(1, "א", 0, 0, 5)]]) {
      const msg = pivotEmptyChartMessage(rows);
      expect(msg).toBeTruthy();
      expect(msg).toMatch(/[\u0590-\u05FF]/);
    }
  });
});

describe("export parity", () => {
  const report: PivotReport = {
    rows: [bn(1, "גדוד 5030", 2, 1, 1), bn(2, "גדס\"מ", 1, 2, 0), bn(3, "גדוד 9308", 0, 0, 0)],
    soldiers: [
      soldier(1, 1, "passed", "completed"),
      soldier(2, 1, "passed", "completed"),
      soldier(3, 1, "failed", "not_completed"),
      soldier(4, 1, "registered", "reserve", 1),
      soldier(5, 2, "passed", "completed"),
      soldier(6, 2, "did_not_report", "not_completed"),
      soldier(7, 2, "registered", "not_completed"),
    ],
  };

  it("the summary sheet carries exactly the on-screen per-battalion numbers", () => {
    const sheet = pivotSummarySheetRows(report);
    expect(sheet).toHaveLength(report.rows.length);
    sheet.forEach((row, i) => {
      const src = report.rows[i];
      expect(row["גדוד"]).toBe(src.battalion_name);
      expect(row[COMPLETION_OUTCOME_LABELS.completed]).toBe(src.completed_count);
      expect(row[COMPLETION_OUTCOME_LABELS.not_completed]).toBe(src.not_completed_count);
      expect(row[COMPLETION_OUTCOME_LABELS.reserve]).toBe(src.reserve_count);
    });
  });

  it("the exported completed column sums to the on-screen header total", () => {
    const header = sumTallies(report.rows);
    const exported = pivotSummarySheetRows(report).reduce(
      (sum, r) => sum + Number(r[COMPLETION_OUTCOME_LABELS.completed]),
      0
    );
    expect(exported).toBe(header.completed_count);
  });

  it("marks a soldier as completed in the export only when the screen does", () => {
    const detail = pivotSoldierSheetRows(report);
    detail.forEach((row, i) => {
      expect(row["השלים הסמכה"]).toBe(report.soldiers[i].outcome === "completed" ? "כן" : "לא");
    });
    // ...and the count of "כן" rows equals the header numerator.
    expect(detail.filter((r) => r["השלים הסמכה"] === "כן")).toHaveLength(
      sumTallies(report.rows).completed_count
    );
  });

  it("never labels a non-passing status as completed in the export", () => {
    const detail = pivotSoldierSheetRows(report);
    for (const row of detail) {
      if (row["השלים הסמכה"] === "כן") expect(row["סטטוס"]).toBe("עבר הסמכה");
      else expect(row["סטטוס"]).not.toBe("עבר הסמכה");
    }
  });

  it("keeps a reserve soldier out of the completed column and labels them עתודה", () => {
    const reserveRow = pivotSoldierSheetRows(report).find((r) => r["שם"] === "חייל 4");
    expect(reserveRow?.["סוג"]).toBe(COMPLETION_OUTCOME_LABELS.reserve);
    expect(reserveRow?.["השלים הסמכה"]).toBe("לא");
  });
});
