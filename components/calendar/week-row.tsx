"use client";

import {
  differenceInCalendarDays,
  format,
  isSameDay,
  isSameMonth,
  max as maxDate,
  min as minDate,
} from "date-fns";
import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CertificationChip } from "@/components/calendar/certification-chip";
import { compareCalendarItems, type CalendarItem } from "@/components/calendar/types";
import { getWeekNumber, getHebrewWeekdayShort } from "@/lib/utils/dates";
import { battalionBarStyle } from "@/lib/utils/battalion-style";
import { cn } from "@/lib/utils";

export const WEEKDAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "שבת"];
export const DAY_NUMBER_HEIGHT = 20;
export const MONTH_LANE_HEIGHT = 26;
export const WEEK_LANE_HEIGHT = 22;

export function isMultiDay(item: CalendarItem): boolean {
  return Boolean(item.end_date) && item.end_date !== item.start_date;
}

export function itemEndDate(item: CalendarItem): string {
  return item.end_date ?? item.start_date;
}

/** Multi-day items plus single-day influencing factors, pinned to the top lanes. */
export function isBanner(item: CalendarItem): boolean {
  return isMultiDay(item) || item.kind === "influencing_factor";
}

export function chunkIntoWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

/** Stable vertical lane for a bar's whole span, so it does not jump across weeks. */
export function assignLanes(barItems: CalendarItem[]): Map<string, number> {
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

export type FillDot = "full" | "part" | "none";

const FILL_DOT: Record<FillDot, string> = {
  full: "#16a34a",
  part: "#e08a1e",
  none: "#dc2626",
};

export interface NameSlot {
  name: string | null;
}

export interface DayNameGroup {
  key: string;
  name: string;
  color: string;
  filled: number;
  allocated: number;
  slots: NameSlot[];
  onOpen?: () => void;
}

export interface WeekBarMeta {
  fill?: FillDot;
  battalionColor?: string;
}

export interface WeekRowProps {
  week: Date[];
  /** When set, days outside this month are dimmed (month view). */
  month?: Date;
  barItems: CalendarItem[];
  laneOf: Map<string, number>;
  /** Single-day chips under the lanes (month view only). */
  singleDayItems?: CalendarItem[];
  laneHeight?: number;
  /** Month view keeps a taller cell so chips fit; week view uses the mockup formula. */
  minCellHeight?: number | "formula";
  metaByKey?: Record<string, WeekBarMeta>;
  /** Second row: names leaving for a cert that starts that day. */
  nameGroupsByDay?: DayNameGroup[][];
  onBarClick?: (item: CalendarItem) => void;
  emptyWeekMessage?: string;
  alignDayNumber?: "start" | "end";
}

function weekend(day: Date): boolean {
  return day.getDay() === 5 || day.getDay() === 6;
}

export function WeekRow({
  week,
  month,
  barItems,
  laneOf,
  singleDayItems = [],
  laneHeight = MONTH_LANE_HEIGHT,
  minCellHeight,
  metaByKey,
  nameGroupsByDay,
  onBarClick,
  emptyWeekMessage,
  alignDayNumber = "start",
}: WeekRowProps) {
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
  const formulaHeight = DAY_NUMBER_HEIGHT + Math.max(laneCount, 1) * laneHeight + 6;
  const barsHeight = DAY_NUMBER_HEIGHT + laneCount * laneHeight;
  const cellHeight =
    minCellHeight === "formula"
      ? formulaHeight
      : typeof minCellHeight === "number"
        ? minCellHeight
        : Math.max(96, barsHeight + 8);

  const showNames = Boolean(nameGroupsByDay);
  const anyStart = (nameGroupsByDay ?? []).some((g) => g.length > 0);
  const empty = weekBars.length === 0 && !anyStart && emptyWeekMessage;

  function singleDayItemsOnDay(day: Date) {
    return singleDayItems
      .filter((c) => isSameDay(day, new Date(c.start_date)))
      .sort(compareCalendarItems);
  }

  return (
    <div className="grid grid-cols-8 gap-1">
      <div className="flex items-center justify-center rounded-md bg-primary/10 text-primary text-xs font-bold">
        {getWeekNumber(weekStart)}
      </div>
      <div className="relative" style={{ gridColumn: "span 7" }}>
        <div className="grid grid-cols-7 gap-1">
          {week.map((day) => {
            const dayItems = singleDayItemsOnDay(day);
            const isToday = isSameDay(day, new Date());
            return (
              <div
                key={day.toISOString()}
                style={{ minHeight: cellHeight }}
                className={cn(
                  "border rounded-md p-1 flex flex-col",
                  month && !isSameMonth(day, month) && "bg-muted/30 text-muted-foreground",
                  !month && weekend(day) && "bg-muted/55",
                  isToday && "border-foreground border-2"
                )}
              >
                <div
                  className={cn(
                    "text-xs h-5 leading-5 px-0.5 shrink-0",
                    alignDayNumber === "end" && "text-end",
                    isToday && "font-extrabold"
                  )}
                >
                  {format(day, "d")}
                </div>
                {singleDayItems.length > 0 && (
                  <div className="space-y-0.5" style={{ marginTop: laneCount * laneHeight }}>
                    {dayItems.map((c) => (
                      <CertificationChip key={c.key} item={c} />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {weekBars.length > 0 && (
          <div
            className="absolute inset-x-0 grid grid-cols-7 gap-1 pointer-events-none"
            style={{ top: DAY_NUMBER_HEIGHT }}
          >
            {weekBars.map(({ item, startCol, endCol, lane, isTrueStart, isTrueEnd }) => {
              const meta = metaByKey?.[item.key];
              const oneDay = !isMultiDay(item) && item.kind !== "influencing_factor";
              const className = cn(
                "pointer-events-auto text-white px-1.5 truncate flex items-center gap-1 overflow-hidden shadow-sm",
                isTrueStart ? "rounded-s-sm" : "rounded-s-none",
                isTrueEnd ? "rounded-e-sm" : "rounded-e-none",
                item.kind === "training" &&
                  "outline outline-2 outline-dashed outline-white/70 -outline-offset-2",
                item.kind === "influencing_factor" &&
                  "outline outline-2 outline-dashed outline-white/90 -outline-offset-2",
                oneDay && "text-[11px] px-0.5"
              );
              const style = {
                gridColumnStart: startCol + 1,
                gridColumnEnd: endCol + 2,
                gridRow: 1,
                marginTop: lane * laneHeight,
                height: laneHeight - 3,
                backgroundColor: item.color,
              } as const;
              const inner = (
                <>
                  {item.kind === "training" && (
                    <GraduationCap className="size-2.5 shrink-0" aria-label="הדרכה" />
                  )}
                  {meta?.fill ? (
                    <span className="flex gap-px shrink-0">
                      <i
                        className="size-1.5 rounded-full border border-white/75 block"
                        style={{ backgroundColor: FILL_DOT[meta.fill] }}
                      />
                      {meta.battalionColor && (
                        <i
                          className="size-1.5 rounded-full border border-white/75 block"
                          style={battalionBarStyle(meta.battalionColor)}
                        />
                      )}
                    </span>
                  ) : (
                    item.battalions.slice(0, 3).map((b) => (
                      <span
                        key={b.code}
                        className="size-1.5 rounded-full border border-white/70 shrink-0"
                        style={battalionBarStyle(b.color_hex)}
                      />
                    ))
                  )}
                  <span className="truncate text-[13px] leading-tight">
                    <span className="font-bold">{item.name}</span>
                    {item.location && (
                      <span className="text-[11px] font-normal opacity-80"> - {item.location}</span>
                    )}
                  </span>
                </>
              );
              if (onBarClick) {
                return (
                  <button
                    key={item.key}
                    type="button"
                    className={cn(className, "text-start")}
                    style={style}
                    title={`${item.name}${item.location ? " · " + item.location : ""}`}
                    onClick={() => onBarClick(item)}
                  >
                    {inner}
                  </button>
                );
              }
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={className}
                  style={style}
                  title={`${item.name}${item.location ? " · " + item.location : ""} (${item.start_date}${
                    isMultiDay(item) ? " – " + item.end_date : ""
                  })`}
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {showNames && (
        <>
          <div className="col-span-8 h-px bg-border my-1.5" />
          <div className="flex items-center justify-center text-center text-[10px] font-extrabold text-muted-foreground bg-muted rounded-md p-1 leading-tight">
            יוצאים
            <br />
            להסמכה
          </div>
          <div className="col-span-7 grid grid-cols-7 gap-1">
            {week.map((day, i) => {
              const groups = nameGroupsByDay?.[i] ?? [];
              const isToday = isSameDay(day, new Date());
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "border rounded-md p-1 bg-[#fbfbfc] flex flex-col gap-1.5 min-h-11",
                    weekend(day) && "bg-muted/50",
                    isToday && "border-foreground border-2"
                  )}
                >
                  {groups.length === 0 && (
                    <span className="text-[10px] text-[#b3b9c0] text-center m-auto">—</span>
                  )}
                  {groups.map((g) => (
                    <button
                      key={g.key}
                      type="button"
                      className="flex flex-col gap-0.5 text-start"
                      onClick={g.onOpen}
                    >
                      <div
                        className="text-[10px] font-extrabold leading-tight px-0.5 flex items-center justify-between gap-1"
                        style={{ color: g.color }}
                      >
                        <span>{g.name}</span>
                        <span className="tabular-nums opacity-75">
                          {g.filled}/{g.allocated}
                        </span>
                      </div>
                      {g.slots.map((slot, si) =>
                        slot.name ? (
                          <div
                            key={si}
                            className="text-[10px] font-bold leading-tight rounded-sm px-1 text-white truncate"
                            style={{ backgroundColor: g.color }}
                            title={slot.name}
                          >
                            {slot.name.split(" · ")[0]}
                          </div>
                        ) : (
                          <div
                            key={si}
                            className="text-[10px] font-semibold leading-tight rounded-sm px-1 truncate border border-dashed bg-transparent"
                            style={{ color: g.color, borderColor: "currentColor" }}
                          >
                            מקום פנוי
                          </div>
                        )
                      )}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      {empty && (
        <p className="col-span-8 text-center text-sm text-muted-foreground py-2">{emptyWeekMessage}</p>
      )}
    </div>
  );
}

export function WeekdayHeader() {
  return (
    <div className="grid grid-cols-8 gap-1 text-center text-xs font-medium text-muted-foreground mb-1">
      <div className="text-primary">שבוע</div>
      {WEEKDAYS.map((d) => (
        <div key={d}>{d}</div>
      ))}
    </div>
  );
}

export { getHebrewWeekdayShort };
