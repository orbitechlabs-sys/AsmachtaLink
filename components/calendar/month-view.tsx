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
import { ChevronRight, ChevronLeft } from "lucide-react";
import { CertificationChip } from "@/components/calendar/certification-chip";
import { certificationColor } from "@/lib/utils/cert-colors";
import type { CalendarCertification } from "@/components/calendar/types";
import { getWeekNumber } from "@/lib/utils/dates";
import { cn } from "@/lib/utils";

const WEEKDAYS = ["א'", "ב'", "ג'", "ד'", "ה'", "ו'", "שבת"];
const DAY_NUMBER_HEIGHT = 20;
const LANE_HEIGHT = 20;

function isMultiDay(cert: CalendarCertification): boolean {
  return Boolean(cert.end_date) && cert.end_date !== cert.start_date;
}

function chunkIntoWeeks(days: Date[]): Date[][] {
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

/** Assigns each multi-day certification a stable vertical "lane" for its whole span,
 * so it doesn't jump between rows as it crosses week boundaries. */
function assignLanes(multiDayCerts: CalendarCertification[]): Map<number, number> {
  const sorted = [...multiDayCerts].sort((a, b) => a.start_date.localeCompare(b.start_date));
  const laneEnds: string[] = [];
  const laneOf = new Map<number, number>();
  for (const cert of sorted) {
    let lane = laneEnds.findIndex((end) => end < cert.start_date);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(cert.end_date!);
    } else {
      laneEnds[lane] = cert.end_date!;
    }
    laneOf.set(cert.id, lane);
  }
  return laneOf;
}

export function MonthView({ certifications }: { certifications: CalendarCertification[] }) {
  const [month, setMonth] = useState(new Date());

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const weeks = chunkIntoWeeks(days);

  const multiDayCerts = useMemo(() => certifications.filter(isMultiDay), [certifications]);
  const singleDayCerts = useMemo(() => certifications.filter((c) => !isMultiDay(c)), [certifications]);
  const laneOf = useMemo(() => assignLanes(multiDayCerts), [multiDayCerts]);

  function singleDayCertsOnDay(day: Date) {
    return singleDayCerts.filter((c) => isSameDay(day, new Date(c.start_date)));
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

          const weekBars = multiDayCerts
            .map((cert) => {
              const certStart = new Date(cert.start_date);
              const certEnd = new Date(cert.end_date!);
              if (certEnd < weekStart || certStart > weekEnd) return null;
              const clippedStart = maxDate([certStart, weekStart]);
              const clippedEnd = minDate([certEnd, weekEnd]);
              return {
                cert,
                startCol: differenceInCalendarDays(clippedStart, weekStart),
                endCol: differenceInCalendarDays(clippedEnd, weekStart),
                lane: laneOf.get(cert.id) ?? 0,
                isTrueStart: certStart >= weekStart,
                isTrueEnd: certEnd <= weekEnd,
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
                    const dayCerts = singleDayCertsOnDay(day);
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
                          {dayCerts.slice(0, 3).map((c) => (
                            <CertificationChip key={c.id} cert={c} />
                          ))}
                          {dayCerts.length > 3 && (
                            <div className="text-[10px] text-muted-foreground">
                              +{dayCerts.length - 3} נוספות
                            </div>
                          )}
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
                    {weekBars.map(({ cert, startCol, endCol, lane, isTrueStart, isTrueEnd }) => (
                      <Link
                        key={cert.id}
                        href={`/certifications/${cert.id}`}
                        className={cn(
                          "pointer-events-auto text-white text-[10px] px-1 truncate flex items-center gap-1 overflow-hidden shadow-sm",
                          isTrueStart ? "rounded-s-sm" : "rounded-s-none",
                          isTrueEnd ? "rounded-e-sm" : "rounded-e-none"
                        )}
                        style={{
                          gridColumnStart: startCol + 1,
                          gridColumnEnd: endCol + 2,
                          gridRow: 1,
                          marginTop: lane * LANE_HEIGHT,
                          height: LANE_HEIGHT - 3,
                          backgroundColor: certificationColor(cert.name),
                        }}
                        title={`${cert.name}${cert.location ? " · " + cert.location : ""} (${cert.start_date} – ${cert.end_date})`}
                      >
                        {cert.battalions.slice(0, 3).map((b) => (
                          <span
                            key={b.code}
                            className="size-1.5 rounded-full border border-white/70 shrink-0"
                            style={{ backgroundColor: b.color_hex }}
                          />
                        ))}
                        <span className="truncate">
                          <span className="font-bold">{cert.name}</span>
                          {cert.location && (
                            <span className="text-[9px] font-normal opacity-80"> - {cert.location}</span>
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
