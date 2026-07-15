"use client";

import { format } from "date-fns";
import { CertificationChipDetailed } from "@/components/calendar/certification-chip";
import type { CalendarCertification } from "@/components/calendar/types";

export function AgendaView({ certifications }: { certifications: CalendarCertification[] }) {
  const sorted = [...certifications].sort((a, b) => a.start_date.localeCompare(b.start_date));

  if (sorted.length === 0) {
    return <p className="text-muted-foreground text-sm">אין הסמכות להצגה.</p>;
  }

  const grouped = new Map<string, CalendarCertification[]>();
  for (const cert of sorted) {
    const key = cert.start_date;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(cert);
  }

  return (
    <div className="space-y-4">
      {Array.from(grouped.entries()).map(([date, certs]) => (
        <div key={date}>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            {format(new Date(date), "EEEE, d MMMM yyyy")}
          </h3>
          <div className="space-y-2">
            {certs.map((c) => (
              <CertificationChipDetailed key={c.id} cert={c} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
