import { battalionBarStyle } from "@/lib/utils/battalion-style";
import { COMPLETION_OUTCOME_LABELS } from "@/lib/roster/completion";
import type { BattalionSoldierCount } from "@/lib/db/repositories/certification-pivot";

/**
 * One bar per battalion. The bar's height is the number of soldiers who COMPLETED —
 * `completed_count`, which comes from each soldier's own roster status — and never the
 * raw roster-row count, which used to make a failed soldier indistinguishable from a
 * passing one.
 *
 * The two other buckets are printed under the bar rather than stacked into it, so nothing
 * that is not a completion can ever add height to the completed bar.
 */
export function PivotBarChart({ rows }: { rows: BattalionSoldierCount[] }) {
  const max = Math.max(...rows.map((r) => r.completed_count), 0);

  return (
    <div className="flex items-stretch gap-2 sm:gap-4 px-1 pt-2">
      {rows.map((row) => {
        // All-zero data still renders a visible baseline rather than nothing.
        const heightPct = max > 0 ? (row.completed_count / max) * 100 : 0;
        return (
          <div key={row.battalion_id} className="flex-1 min-w-0 flex flex-col items-center gap-1">
            <div className="w-full h-44 flex flex-col justify-end items-center gap-1">
              <span className="text-xs font-semibold tabular-nums">{row.completed_count}</span>
              <div
                className="w-full max-w-14 rounded-t-md min-h-[2px] shadow-sm"
                style={{ ...battalionBarStyle(row.color_hex), height: `${heightPct}%` }}
                title={`${row.battalion_name}: ${row.completed_count} ${COMPLETION_OUTCOME_LABELS.completed}`}
              />
            </div>
            <span className="w-full border-t pt-1 text-center text-xs text-muted-foreground truncate">
              {row.battalion_name}
            </span>
            {/* Printed, not stacked: these are the soldiers the old report wrongly counted
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
