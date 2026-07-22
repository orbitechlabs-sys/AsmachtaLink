"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  format,
  addMonths,
  subMonths,
  differenceInCalendarDays,
  max as maxDate,
  min as minDate,
} from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft, GraduationCap } from "lucide-react";
import { CertificationChip } from "@/components/calendar/certification-chip";
import {
  compareCalendarItems,
  type CalendarItem,
} from "@/components/calendar/types";
import { getWeekNumber } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "שבת"];
const DAY_NUMBER_HEIGHT = 20;
const LANE_HEIGHT = 26;

function isMultiDay(item: CalendarItem): boolean {
  return Boolean(item.end_date) && item.end_date !== item.start_date;
}

/** The effective end date for lane/bar math (single-day items end on their start). */
function itemEndDate(item: CalendarItem): string {
  return item.end_date ?? item.start_date;
}

/** Items rendered in the pinned top "bar" layer: every multi-day item, PLUS
 * single-day influencing factors — so influencing factors always sit at the very
 * top of the day, above certification/training bars and single-day chips, whether
 * they span multiple days or just one. */
function isBanner(item: CalendarItem): boolean {
  return isMultiDay(item) || item.kind === "influencing_factor";
}

function chunkIntoWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/** Assigns each bar-layer item a stable vertical "lane" for its whole span, so it
 * doesn't jump between rows as it crosses week boundaries. */
function assignLanes(barItems: CalendarItem[]): Map<string, number> {
  // Influencing factors first so they always claim the top lanes, then by date.
  const sorted = [...barItems].sort(compareCalendarItems);
  const laneEnds: string[] = [];
  const laneOf = new Map<string, number>();
  for (const item of sorted) {
    const end = itemEndDate(item);
    let lane = laneEnds.findIndex((laneEnd) => laneEnd < item.start_date);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(end);
    } else {
      laneEnds[lane] = end;
    }
    laneOf.set(item.key, lane);
  }
  return laneOf;
}

export function MonthView({ items }: { items: CalendarItem[] }) {
  const [month, setMonth] = useState(new Date());

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const weeks = chunkIntoWeeks(days);

  // Bar layer = multi-day items + single-day influencing factors (pinned to the top).
  const barItems = useMemo(() => items.filter(isBanner), [items]);
  const singleDayItems = useMemo(() => items.filter((c) => !isBanner(c)), [items]);
  const laneOf = useMemo(() => assignLanes(barItems), [barItems]);

  function singleDayItemsOnDay(day: Date) {
    return singleDayItems
      .filter((c) => isSameDay(day, new Date(c.start_date)))
      .sort(compareCalendarItems);
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <Button variant="outline" size="icon" onClick={() => setMonth(subMonths(month, 1))}>
          <ChevronRight className="size-4" />
        </Button>
        <h2 className="font-semibold">{format(month, "MMMM yyyy")}</h2>
        <Button variant="outline" size="icon" onClick={() => setMonth(addMonths(month, 1))}>
          <ChevronLeft className="size-4" />
        </Button>
      </div>
      <div className="grid grid-cols-8 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
        <div className="text-primary">שבוע</div>
        {WEEKDAYS.map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="space-y-1">
        {weeks.map((week) => {
          const weekStart = week[0];
          const weekEnd = week[6];

          const weekBars = barItems
            .map((item) => {
              const itemStart = new Date(item.start_date);
              const itemEnd = new Date(itemEndDate(item));
              if (itemEnd < weekStart || itemStart > weekEnd) return null;
              const clippedStart = maxDate([itemStart, weekStart]);
              const clippedEnd = minDate([itemEnd, weekEnd]);
              return {
                item,
                startCol: differenceInCalendarDays(clippedStart, weekStart),
                endCol: differenceInCalendarDays(clippedEnd, weekStart),
                lane: laneOf.get(item.key) ?? 0,
                isTrueStart: itemStart >= weekStart,
                isTrueEnd: itemEnd <= weekEnd,
              };
            })
            .filter((b): b is NonNullable<typeof b> => b !== null);

          const laneCount = weekBars.length > 0 ? Math.max(...weekBars.map((b) => b.lane)) + 1 : 0;
          const barsHeight = DAY_NUMBER_HEIGHT + laneCount * LANE_HEIGHT;
          const minCellHeight = Math.max(96, barsHeight + 8);

          return (
            <div key={weekStart.toISOString()} className="grid grid-cols-8 gap-1">
              <div className="flex items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
                {getWeekNumber(weekStart)}
              </div>
              <div className="relative" style={{ gridColumn: "span 7" }}>
                <div className="grid grid-cols-7 gap-1">
                  {week.map((day) => {
                    const dayItems = singleDayItemsOnDay(day);
                    return (
                      <div
                        key={day.toISOString()}
                        style={{ minHeight: minCellHeight }}
                        className={`border rounded-md p-1 ${
                          !isSameMonth(day, month) ? "bg-muted/30 text-muted-foreground" : ""
                        } ${isSameDay(day, new Date()) ? "border-primary border-2" : ""}`}
                      >
                        <div className="text-xs">{format(day, "d")}</div>
                        <div className="space-y-0.5" style={{ marginTop: laneCount * LANE_HEIGHT }}>
                          {dayItems.map((c) => (
                            <CertificationChip key={c.key} item={c} />
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {weekBars.length > 0 && (
                  <div
                    className="absolute inset-x-0 grid grid-cols-7 gap-1 pointer-events-none"
                    style={{ top: DAY_NUMBER_HEIGHT }}
                  >
                    {weekBars.map(({ item, startCol, endCol, lane, isTrueStart, isTrueEnd }) => (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={cn(
                          "pointer-events-auto text-white px-1.5 truncate flex items-center gap-1 overflow-hidden shadow-sm",
                          isTrueStart ? "rounded-s-sm" : "rounded-s-none",
                          isTrueEnd ? "rounded-e-sm" : "rounded-e-none",
                          item.kind === "training" &&
                            "outline outline-2 outline-dashed outline-white/70 -outline-offset-2"
                        )}
                        style={{
                          gridColumnStart: startCol + 1,
                          gridColumnEnd: endCol + 2,
                          gridRow: 1,
                          marginTop: lane * LANE_HEIGHT,
                          height: LANE_HEIGHT - 3,
                          backgroundColor: item.color,
                        }}
                        title={`${item.name}${item.location ? " · " + item.location : ""} (${item.start_date}${
                          isMultiDay(item) ? " – " + item.end_date : ""
                        })`}
                      >
                        {item.kind === "training" && (
                          <GraduationCap className="size-2.5 shrink-0" aria-label="הדרכה" />
                        )}
                        {item.battalions.slice(0, 3).map((b) => (
                          <span
                            key={b.code}
                            className="size-1.5 rounded-full border border-white/70 shrink-0"
                            style={{ backgroundColor: b.color_hex }}
                          />
                        ))}
                        <span className="truncate text-[13px] leading-tight">
                          <span className="font-bold">{item.name}</span>
                          {item.location && (
                            <span className="text-[11px] font-normal opacity-80"> - {item.location}</span>
                          )}
                        </span>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
