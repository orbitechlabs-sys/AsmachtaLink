import { battalionBarStyle } from "@/lib/utils/battalion-style";
import type { BattalionSoldierCount } from "@/lib/db/repositories/certification-pivot";

/** One bar per battalion, height proportional to its soldier count. Hand-built with
 * divs + battalion colors, matching the gantt/bar visuals used elsewhere in the app
 * (the project has no chart library). */
export function PivotBarChart({ rows }: { rows: BattalionSoldierCount[] }) {
  const max = Math.max(...rows.map((r) => r.soldier_count), 0);

  return (
    <div className="flex items-stretch gap-2 sm:gap-4 px-1 pt-2">
      {rows.map((row) => {
        // All-zero data still renders a visible baseline rather than nothing.
        const heightPct = max > 0 ? (row.soldier_count / max) * 100 : 0;
        return (
          <div key={row.battalion_id} className="flex-1 min-w-0 flex flex-col items-center gap-1">
            <div className="w-full h-44 flex flex-col justify-end items-center gap-1">
              <span className="text-xs font-semibold tabular-nums">{row.soldier_count}</span>
              <div
                className="w-full max-w-14 rounded-t-md min-h-[2px] shadow-sm"
                style={{ ...battalionBarStyle(row.color_hex), height: `${heightPct}%` }}
                title={`${row.battalion_name}: ${row.soldier_count}`}
              />
            </div>
            <span className="w-full border-t pt-1 text-center text-xs text-muted-foreground truncate">
              {row.battalion_name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
