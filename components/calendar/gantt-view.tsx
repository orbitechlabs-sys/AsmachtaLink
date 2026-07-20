"use client";

import { useMemo } from "react";
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, min, max } from "date-fns";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { battalionBarStyle } from "@/lib/utils/battalion-style";
import type { CalendarItem } from "@/components/calendar/types";
import { getWeekNumber, getHebrewWeekdayShort } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

const DAY_MIN_WIDTH = 40;
const LABEL_WIDTH = 220;

export function GanttView({
  items,
  rangeStart: rangeStartOverride,
  rangeEnd: rangeEndOverride,
}: {
  items: CalendarItem[];
  rangeStart?: Date;
  rangeEnd?: Date;
}) {
  const { rangeStart, rangeEnd, days } = useMemo(() => {
    if (rangeStartOverride && rangeEndOverride) {
      return {
        rangeStart: rangeStartOverride,
        rangeEnd: rangeEndOverride,
        days: eachDayOfInterval({ start: rangeStartOverride, end: rangeEndOverride }),
      };
    }
    const today = new Date();
    if (items.length === 0) {
      const start = addDays(today, -7);
      const end = addDays(today, 30);
      return { rangeStart: start, rangeEnd: end, days: eachDayOfInterval({ start, end }) };
    }
    const starts = items.map((c) => new Date(c.start_date));
    const ends = items.map((c) => new Date(c.end_date ?? c.start_date));
    const start = min([...starts, addDays(today, -7)]);
    const end = max([...ends, addDays(today, 14)]);
    return { rangeStart: start, rangeEnd: end, days: eachDayOfInterval({ start, end }) };
  }, [items, rangeStartOverride, rangeEndOverride]);

  const weekGroups = useMemo(() => {
    const groups: { weekNumber: number; count: number }[] = [];
    for (const d of days) {
      const wn = getWeekNumber(d);
      const last = groups[groups.length - 1];
      if (last && last.weekNumber === wn) {
        last.count += 1;
      } else {
        groups.push({ weekNumber: wn, count: 1 });
      }
    }
    return groups;
  }, [days]);

  if (items.length === 0) {
    return <p className="text-muted-foreground text-sm">אין פריטים להצגה בטווח זה.</p>;
  }

  const daysAreaMinWidth = days.length * DAY_MIN_WIDTH;
  const dayColumns = `repeat(${days.length}, minmax(${DAY_MIN_WIDTH}px, 1fr))`;

  return (
    <div className="overflow-x-auto border rounded-md">
      <div className="w-full">
        <div className="flex sticky top-0 bg-card z-10">
          <div
            className="shrink-0 border-e border-b p-2 text-xs font-medium text-muted-foreground"
            style={{ width: LABEL_WIDTH }}
          >
            פריט
          </div>
          <div
            className="grid border-b flex-1"
            style={{ gridTemplateColumns: dayColumns, minWidth: daysAreaMinWidth }}
          >
            {weekGroups.map((g, i) => (
              <div
                key={i}
                className="text-center text-[10px] py-1 border-e bg-primary/10 text-primary font-bold"
                style={{ gridColumn: `span ${g.count}` }}
              >
                שבוע {g.weekNumber}
              </div>
            ))}
          </div>
        </div>
        <div className="flex sticky top-6 bg-card z-10 border-b">
          <div className="shrink-0 border-e" style={{ width: LABEL_WIDTH }}></div>
          <div
            className="grid flex-1"
            style={{ gridTemplateColumns: dayColumns, minWidth: daysAreaMinWidth }}
          >
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className="text-center text-[10px] py-1.5 border-e text-muted-foreground leading-tight"
              >
                <div className="font-medium">{getHebrewWeekdayShort(d)}</div>
                <div>{format(d, "d/M")}</div>
              </div>
            ))}
          </div>
        </div>
        {items.map((item) => {
          const itemStart = new Date(item.start_date);
          const itemEnd = new Date(item.end_date ?? item.start_date);
          const isTrueStart = itemStart >= rangeStart;
          const isTrueEnd = itemEnd <= rangeEnd;
          const clippedStart = max([itemStart, rangeStart]);
          const clippedEnd = min([itemEnd, rangeEnd]);
          const offset = differenceInCalendarDays(clippedStart, rangeStart);
          const duration = differenceInCalendarDays(clippedEnd, clippedStart) + 1;
          const rightPct = (offset / days.length) * 100;
          const widthPct = (duration / days.length) * 100;
          return (
            <div key={item.key} className="flex border-b hover:bg-accent/30">
              <div
                className="shrink-0 border-e p-2 text-xs flex items-center gap-1 overflow-hidden"
                style={{ width: LABEL_WIDTH }}
              >
                {item.battalions.map((b) => (
                  <span
                    key={b.code}
                    className="size-2 rounded-full shrink-0"
                    style={battalionBarStyle(b.color_hex)}
                  />
                ))}
                <div className="min-w-0">
                  <Link href={item.href} className="hover:underline truncate flex items-center gap-1">
                    {item.kind === "training" && (
                      <GraduationCap className="size-3 shrink-0 text-muted-foreground" aria-label="הדרכה" />
                    )}
                    <span className="truncate">{item.name}</span>
                  </Link>
                  {item.location && (
                    <div className="text-[10px] text-muted-foreground truncate">{item.location}</div>
                  )}
                </div>
              </div>
              <div
                className="relative flex-1"
                style={{ height: 40, minWidth: daysAreaMinWidth }}
              >
                <Link
                  href={item.href}
                  className={cn(
                    "absolute top-1.5 h-7 flex items-center gap-1 px-2 text-white overflow-hidden",
                    isTrueStart ? "rounded-s-md" : "rounded-s-none",
                    isTrueEnd ? "rounded-e-md" : "rounded-e-none",
                    item.kind === "training" &&
                      "outline outline-2 outline-dashed outline-white/70 -outline-offset-2"
                  )}
                  style={{
                    right: `${rightPct}%`,
                    width: `max(${widthPct}%, 20px)`,
                    backgroundColor: item.color,
                  }}
                  title={`${item.name}${item.location ? " · " + item.location : ""} (${item.start_date}${
                    item.end_date ? " - " + item.end_date : ""
                  })${!isTrueStart || !isTrueEnd ? " — ממשיך מחוץ לטווח המוצג" : ""}`}
                >
                  {item.kind === "training" && (
                    <GraduationCap className="size-3 shrink-0" aria-label="הדרכה" />
                  )}
                  <span className="truncate text-[13px] leading-tight">
                    <span className="font-bold">{item.name}</span>
                    {item.location && (
                      <span className="text-[11px] font-normal opacity-80"> - {item.location}</span>
                    )}
                  </span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
