import { battalionBarStyle } from "@/lib/utils/battalion-style";
import { COMPLETION_OUTCOME_LABELS } from "@/lib/roster/completion";
import { pivotEmptyChartMessage } from "@/lib/reports/pivot-summary";
import type { BattalionSoldierCount } from "@/lib/db/repositories/certification-pivot";

/**
 * One bar per battalion. The bar's height is the number of soldiers who COMPLETED —
 * `completed_count`, straight from the same per-battalion tallies the numbers and the
 * Excel export read, so the chart cannot disagree with the figures printed beside it.
 *
 * The two other buckets are printed under the bar rather than stacked into it, so nothing
 * that is not a completion can ever add height to the completed bar.
 *
 * THE ALL-ZERO CASE IS A REAL STATE, NOT AN EDGE CASE. Most of the certifications in this
 * system are `draft` with nobody marked passed yet, so a perfectly ordinary selection
 * charts six zeros. The previous version handled it by giving every bar `height: 0%` with a
 * `min-h-[2px]` floor inside a fixed 176px plot area — which paints a 2px sliver under a
 * tall white rectangle and reads as a component that failed to render. The plot area now
 * always draws its baseline, a zero bar draws a dashed stub so it is visibly a measured
 * zero rather than a missing bar, and an all-zero chart says so in Hebrew.
 */
export function PivotBarChart({ rows }: { rows: BattalionSoldierCount[] }) {
  const max = Math.max(...rows.map((r) => r.completed_count), 0);
  const emptyMessage = pivotEmptyChartMessage(rows);

  return (
    <div className="flex items-stretch gap-2 sm:gap-4 px-1 pt-2 relative">
      {emptyMessage && (
        // Overlaid rather than replacing the columns: the battalion labels and their
        // "לא השלימו" lines stay on screen, which is the information that actually
        // explains the zeros. `inset-x-0` with the plot area's own height keeps the block
        // bounded — it can never stretch the card.
        <p className="absolute inset-x-0 top-2 h-44 flex items-center justify-center text-center text-xs text-muted-foreground px-4 pointer-events-none">
          {emptyMessage}
        </p>
      )}
      {rows.map((row) => {
        const heightPct = max > 0 ? (row.completed_count / max) * 100 : 0;
        const isZero = row.completed_count === 0;
        return (
          <div key={row.battalion_id} className="flex-1 min-w-0 flex flex-col items-center gap-1">
            {/* Fixed height, so the plot area is the same size whatever the data — and a
                border-bottom, so there is always a visible axis to read the bars against. */}
            <div className="w-full h-44 flex flex-col justify-end items-center gap-1 border-b-2 border-foreground/20">
              <span className="text-xs font-semibold tabular-nums">{row.completed_count}</span>
              {isZero ? (
                // A measured zero: a dashed stub in the battalion's own colour, clearly
                // different from both a real bar and from nothing at all.
                <div
                  className="w-full max-w-14 h-1.5 rounded-t-sm border-t-2 border-dashed"
                  style={{ borderColor: row.color_hex }}
                  title={`${row.battalion_name}: 0 ${COMPLETION_OUTCOME_LABELS.completed}`}
                />
              ) : (
                <div
                  className="w-full max-w-14 rounded-t-md min-h-[3px] shadow-sm"
                  style={{ ...battalionBarStyle(row.color_hex), height: `${heightPct}%` }}
                  title={`${row.battalion_name}: ${row.completed_count} ${COMPLETION_OUTCOME_LABELS.completed}`}
                />
              )}
            </div>
            <span className="w-full pt-1 text-center text-xs text-muted-foreground truncate">
              {row.battalion_name}
            </span>
            {/* Printed, not stacked: these are the soldiers the report once wrongly counted
                as having completed, so they must stay visibly outside the bar. */}
            <span className="text-[0.65rem] text-muted-foreground text-center leading-tight tabular-nums">
              {COMPLETION_OUTCOME_LABELS.not_completed} {row.not_completed_count}
              {row.reserve_count > 0
                ? ` · ${COMPLETION_OUTCOME_LABELS.reserve} ${row.reserve_count}`
                : ""}
            </span>
          </div>
        );
      })}
    </div>
  );
}
