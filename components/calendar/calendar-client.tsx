"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Plus } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { FilterBar, type CalendarFilters } from "@/components/calendar/filter-bar";
import { MonthView } from "@/components/calendar/month-view";
import { GanttView } from "@/components/calendar/gantt-view";
import { YearGanttView } from "@/components/calendar/year-gantt-view";
import { AgendaView } from "@/components/calendar/agenda-view";
import { useCurrentUser } from "@/lib/auth/use-current-user";
import { canEdit } from "@/lib/auth/permissions";
import type { Battalion } from "@/lib/types";
import type { CalendarItem } from "@/components/calendar/types";

type ViewMode = "month" | "gantt" | "year" | "agenda";

export function CalendarClient({
  items,
  battalions,
}: {
  items: CalendarItem[];
  battalions: Battalion[];
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [filters, setFilters] = useState<CalendarFilters>({ battalionCodes: [], status: null });
  const { user } = useCurrentUser();

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) setView((v) => (v === "gantt" || v === "year" ? "agenda" : v));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filtered = useMemo(() => {
    if (filters.battalionCodes.length === 0) return items;
    return items.filter(
      (item) =>
        item.battalions.some((b) => filters.battalionCodes.includes(b.code)) ||
        (item.registration_open === 1 && item.battalions.length === 0)
    );
  }, [items, filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <FilterBar battalions={battalions} filters={filters} onChange={setFilters} />
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit(user) && (
            <Button asChild size="sm">
              <Link href="/influencing-factors/new">
                <Plus className="size-4" />
                הוספת גורם משפיע
              </Link>
            </Button>
          )}
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month">חודשי</TabsTrigger>
              <TabsTrigger value="gantt" className="hidden md:inline-flex">
                גאנט
              </TabsTrigger>
              <TabsTrigger value="year" className="hidden md:inline-flex">
                שנתי
              </TabsTrigger>
              <TabsTrigger value="agenda">רשימה</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </div>

      {view === "month" && <MonthView items={filtered} />}
      {view === "gantt" && <GanttView items={filtered} />}
      {view === "year" && <YearGanttView items={filtered} />}
      {view === "agenda" && <AgendaView items={filtered} />}
    </div>
  );
}
