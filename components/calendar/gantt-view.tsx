"use client";

import { useMemo } from "react";
import { addDays, differenceInCalendarDays, eachDayOfInterval, format, min, max } from "date-fns";
import Link from "next/link";
import { battalionBarStyle } from "@/lib/utils/battalion-style";
import type { CalendarCertification } from "@/components/calendar/types";
import { getWeekNumber, getHebrewWeekdayShort } from "@/lib/utils/dates";
import { certificationColor } from "@/lib/utils/cert-colors";
import { cn } from "@/lib/utils";

const DAY_MIN_WIDTH = 40;
const LABEL_WIDTH = 220;

export function GanttView({
  certifications,
  rangeStart: rangeStartOverride,
  rangeEnd: rangeEndOverride,
}: {
  certifications: CalendarCertification[];
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
    if (certifications.length === 0) {
      const start = addDays(today, -7);
      const end = addDays(today, 30);
      return { rangeStart: start, rangeEnd: end, days: eachDayOfInterval({ start, end }) };
    }
    const starts = certifications.map((c) => new Date(c.start_date));
    const ends = certifications.map((c) => new Date(c.end_date ?? c.start_date));
    const start = min([...starts, addDays(today, -7)]);
    const end = max([...ends, addDays(today, 14)]);
    return { rangeStart: start, rangeEnd: end, days: eachDayOfInterval({ start, end }) };
  }, [certifications, rangeStartOverride, rangeEndOverride]);

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

  if (certifications.length === 0) {
    return <p className="text-muted-foreground text-sm">אין הסמכות להצגה בטווח זה.</p>;
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
            הסמכה
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
        {certifications.map((cert) => {
          const certStart = new Date(cert.start_date);
          const certEnd = new Date(cert.end_date ?? cert.start_date);
          const isTrueStart = certStart >= rangeStart;
          const isTrueEnd = certEnd <= rangeEnd;
          const clippedStart = max([certStart, rangeStart]);
          const clippedEnd = min([certEnd, rangeEnd]);
          const offset = differenceInCalendarDays(clippedStart, rangeStart);
          const duration = differenceInCalendarDays(clippedEnd, clippedStart) + 1;
          const rightPct = (offset / days.length) * 100;
          const widthPct = (duration / days.length) * 100;
          return (
            <div key={cert.id} className="flex border-b hover:bg-accent/30">
              <div
                className="shrink-0 border-e p-2 text-xs flex items-center gap-1 overflow-hidden"
                style={{ width: LABEL_WIDTH }}
              >
                {cert.battalions.map((b) => (
                  <span
                    key={b.code}
                    className="size-2 rounded-full shrink-0"
                    style={battalionBarStyle(b.color_hex)}
                  />
                ))}
                <div className="min-w-0">
                  <Link href={`/certifications/${cert.id}`} className="hover:underline truncate block">
                    {cert.name}
                  </Link>
                  {cert.location && (
                    <div className="text-[10px] text-muted-foreground truncate">{cert.location}</div>
                  )}
                </div>
              </div>
              <div
                className="relative flex-1"
                style={{ height: 40, minWidth: daysAreaMinWidth }}
              >
                <Link
                  href={`/certifications/${cert.id}`}
                  className={cn(
                    "absolute top-1.5 h-7 flex items-center px-2 text-[10px] text-white overflow-hidden",
                    isTrueStart ? "rounded-s-md" : "rounded-s-none",
                    isTrueEnd ? "rounded-e-md" : "rounded-e-none"
                  )}
                  style={{
                    right: `${rightPct}%`,
                    width: `max(${widthPct}%, 20px)`,
                    backgroundColor: certificationColor(cert.name),
                  }}
                  title={`${cert.name}${cert.location ? " · " + cert.location : ""} (${cert.start_date}${
                    cert.end_date ? " - " + cert.end_date : ""
                  })${!isTrueStart || !isTrueEnd ? " — ממשיך מחוץ לטווח המוצג" : ""}`}
                >
                  <span className="truncate">
                    <span className="font-bold">{cert.name}</span>
                    {cert.location && (
                      <span className="text-[10px] font-normal opacity-80"> - {cert.location}</span>
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
