"use client";

import { format } from "date-fns";
import { CertificationChipDetailed } from "@/components/calendar/certification-chip";
import { calendarSortPriority, type CalendarItem } from "@/components/calendar/types";

export function AgendaView({ items }: { items: CalendarItem[] }) {
  const sorted = [...items].sort((a, b) => a.start_date.localeCompare(b.start_date));

  if (sorted.length === 0) {
    return <p className="text-muted-foreground text-sm">אין פריטים להצגה.</p>;
  }

  const grouped = new Map<string, CalendarItem[]>();
  for (const item of sorted) {
    const key = item.start_date;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(item);
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([date, dayItems]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {format(new Date(date), "EEEE, d MMMM yyyy")}
          </h3>
          <div className="space-y-2">
            {[...dayItems]
              .sort((a, b) => calendarSortPriority(a.kind) - calendarSortPriority(b.kind))
              .map((item) => (
                <CertificationChipDetailed key={item.key} item={item} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
