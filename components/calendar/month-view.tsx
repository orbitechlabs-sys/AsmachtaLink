"use client";

import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  addMonths,
  subMonths,
} from "date-fns";
import { Button } from "@/components/ui/button";
import { ChevronRight, ChevronLeft } from "lucide-react";
import type { CalendarItem } from "@/components/calendar/types";
import {
  assignLanes,
  chunkIntoWeeks,
  isBanner,
  WeekRow,
  WeekdayHeader,
  MONTH_LANE_HEIGHT,
} from "@/components/calendar/week-row";

export function MonthView({ items }: { items: CalendarItem[] }) {
  const [month, setMonth] = useState(new Date());

  const start = startOfWeek(startOfMonth(month), { weekStartsOn: 0 });
  const end = endOfWeek(endOfMonth(month), { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start, end });
  const weeks = chunkIntoWeeks(days);

  const barItems = useMemo(() => items.filter(isBanner), [items]);
  const singleDayItems = useMemo(() => items.filter((c) => !isBanner(c)), [items]);
  const laneOf = useMemo(() => assignLanes(barItems), [barItems]);

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
      <WeekdayHeader />
      <div className="space-y-1">
        {weeks.map((week) => (
          <WeekRow
            key={week[0].toISOString()}
            week={week}
            month={month}
            barItems={barItems}
            laneOf={laneOf}
            singleDayItems={singleDayItems}
            laneHeight={MONTH_LANE_HEIGHT}
          />
        ))}
      </div>
    </div>
  );
}
