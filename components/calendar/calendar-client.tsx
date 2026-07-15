"use client";

import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FilterBar, type CalendarFilters } from "@/components/calendar/filter-bar";
import { MonthView } from "@/components/calendar/month-view";
import { GanttView } from "@/components/calendar/gantt-view";
import { YearGanttView } from "@/components/calendar/year-gantt-view";
import { AgendaView } from "@/components/calendar/agenda-view";
import type { Battalion } from "@/lib/types";
import type { CalendarCertification } from "@/components/calendar/types";

type ViewMode = "month" | "gantt" | "year" | "agenda";

export function CalendarClient({
  certifications,
  battalions,
}: {
  certifications: CalendarCertification[];
  battalions: Battalion[];
}) {
  const [view, setView] = useState<ViewMode>("month");
  const [filters, setFilters] = useState<CalendarFilters>({ battalionCodes: [], status: null });

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 768) setView((v) => (v === "gantt" || v === "year" ? "agenda" : v));
    }
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const filtered = useMemo(() => {
    if (filters.battalionCodes.length === 0) return certifications;
    return certifications.filter(
      (c) =>
        c.battalions.some((b) => filters.battalionCodes.includes(b.code)) ||
        (c.registration_open === 1 && c.battalions.length === 0)
    );
  }, [certifications, filters]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <FilterBar battalions={battalions} filters={filters} onChange={setFilters} />
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

      {view === "month" && <MonthView certifications={filtered} />}
      {view === "gantt" && <GanttView certifications={filtered} />}
      {view === "year" && <YearGanttView certifications={filtered} />}
      {view === "agenda" && <AgendaView certifications={filtered} />}
    </div>
  );
}
