"use client";

import { useMemo, useState } from "react";
import { format } from "date-fns";
import { he } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { GanttView } from "@/components/calendar/gantt-view";
import { SlotStatusIndicator } from "@/components/certifications/slot-status-indicator";
import { CertificationStatusBadge } from "@/components/certifications/status-badge";
import { ExportReportActions, EXPORT_REPORT_CONTENT_ID } from "@/components/reports/export-report-actions";
import {
  CERTIFICATION_STATUS_LABELS,
  ROSTER_STATUS_LABELS,
  type RosterStatus,
} from "@/lib/types";
import type { ExportCertification } from "@/lib/db/repositories/export";
import type { CalendarCertification } from "@/components/calendar/types";

function hebrewDate(iso: string) {
  return format(new Date(iso), "EEEE, d/M/yyyy", { locale: he });
}

const GOOD_ROSTER_STATUSES = new Set<RosterStatus>([
  "registered",
  "pending_approval",
  "approved",
  "participated",
  "passed",
]);

export function ExportReportBody({
  certs,
  ganttCerts,
  from,
  to,
}: {
  certs: ExportCertification[];
  ganttCerts: CalendarCertification[];
  from: string;
  to: string;
}) {
  const [selectedIds, setSelectedIds] = useState<Set<number>>(() => new Set(certs.map((c) => c.id)));

  function toggle(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(certs.map((c) => c.id)));
  }

  function clearAll() {
    setSelectedIds(new Set());
  }

  const selectedCerts = useMemo(() => certs.filter((c) => selectedIds.has(c.id)), [certs, selectedIds]);
  const selectedGanttCerts = useMemo(
    () => ganttCerts.filter((c) => selectedIds.has(c.id)),
    [ganttCerts, selectedIds]
  );

  const registrationGaps = selectedCerts.filter(
    (c) => c.total_slots !== null && c.registered_count < c.total_slots && c.status !== "cancelled"
  );
  const taxGaps = selectedCerts.flatMap((c) =>
    c.taxes.filter((t) => !t.is_fulfilled).map((t) => ({ cert: c, tax: t }))
  );

  const byDay = new Map<string, typeof selectedCerts>();
  for (const c of selectedCerts) {
    if (!byDay.has(c.start_date)) byDay.set(c.start_date, []);
    byDay.get(c.start_date)!.push(c);
  }
  const days = Array.from(byDay.keys()).sort();

  return (
    <>
      <div className="no-print rounded-lg border p-3 space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <h3 className="font-semibold text-sm">
            בחירת הסמכות לייצוא ({selectedIds.size}/{certs.length})
          </h3>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={selectAll}>
              בחר הכל
            </Button>
            <Button size="sm" variant="outline" onClick={clearAll}>
              נקה הכל
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1 max-h-60 overflow-y-auto">
          {certs.map((cert) => (
            <label key={cert.id} className="flex items-start gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={selectedIds.has(cert.id)}
                onChange={() => toggle(cert.id)}
              />
              <span>
                {cert.name}
                <span className="text-muted-foreground">
                  {" "}
                  · {hebrewDate(cert.start_date)}
                  {cert.location ? ` · ${cert.location}` : ""}
                </span>
              </span>
            </label>
          ))}
        </div>
      </div>

      <ExportReportActions certs={selectedCerts} from={from} to={to} />

      <div id={EXPORT_REPORT_CONTENT_ID} className="space-y-6 bg-background p-2">
        <div data-pdf-atomic className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brigade-logo.png" alt="חטיבה 228" className="size-12" />
          <div>
            <h1 className="text-2xl font-bold">סיכום הסמכות</h1>
            <p className="text-muted-foreground">
              {hebrewDate(from)} — {hebrewDate(to)}
            </p>
          </div>
        </div>

        {selectedGanttCerts.length > 0 && (
          <div data-pdf-atomic className="space-y-2 break-inside-avoid">
            <h2 className="font-bold">תצוגת גאנט</h2>
            <GanttView
              certifications={selectedGanttCerts}
              rangeStart={new Date(from)}
              rangeEnd={new Date(to)}
            />
          </div>
        )}

        {(registrationGaps.length > 0 || taxGaps.length > 0) && (
          <div data-pdf-atomic className="rounded-lg border-2 border-amber-300 bg-amber-50 p-4 space-y-2">
            <h2 className="font-bold text-amber-800">משימות פתוחות בטווח</h2>
            <ul className="space-y-1 text-sm">
              {registrationGaps.map((c) => (
                <li key={`gap-${c.id}`} className="text-amber-900">
                  ⚠ <strong>{c.name}</strong> ({hebrewDate(c.start_date)}) — רשומים {c.registered_count}{" "}
                  מתוך {c.total_slots}, עדיין חסרים שמות
                </li>
              ))}
              {taxGaps.map(({ cert, tax }, i) => (
                <li key={`tax-${i}`} className="text-rose-800">
                  ✕ <strong>{cert.name}</strong> ({hebrewDate(cert.start_date)}) — מיסים: {tax.role_name}{" "}
                  (לא סגור)
                </li>
              ))}
            </ul>
          </div>
        )}

        {days.length === 0 && (
          <p data-pdf-atomic className="text-muted-foreground">
            {certs.length === 0 ? "אין הסמכות בטווח התאריכים שנבחר." : "לא נבחרו הסמכות לייצוא."}
          </p>
        )}

        {days.map((day, dayIndex) => (
          <div key={day} className="space-y-3 break-inside-avoid">
            <h2
              data-pdf-atomic
              data-pdf-group-start="true"
              data-pdf-force-new-page={dayIndex === 0 ? "true" : undefined}
              className="text-lg font-bold border-b-2 border-primary pb-1"
            >
              {hebrewDate(day)}
            </h2>
            {byDay.get(day)!.map((cert) => (
              <div key={cert.id} data-pdf-atomic className="rounded-md border p-3 space-y-2">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold">{cert.name}</span>
                    {cert.location && (
                      <span className="text-muted-foreground text-sm"> · {cert.location}</span>
                    )}
                    {cert.end_date && cert.end_date !== cert.start_date && (
                      <span className="text-muted-foreground text-sm">
                        {" "}
                        (עד {hebrewDate(cert.end_date)})
                      </span>
                    )}
                    <SlotStatusIndicator
                      totalSlots={cert.total_slots}
                      registeredCount={cert.registered_count}
                    />
                  </div>
                  <span className="text-xs rounded-full bg-muted px-2 py-0.5">
                    {CERTIFICATION_STATUS_LABELS[cert.status]}
                  </span>
                </div>

                {cert.prerequisites.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    דרישות קדם: {cert.prerequisites.join(", ")}
                  </p>
                )}

                <p className="text-sm">
                  סה״כ רשומים: {cert.registered_count}
                  {cert.total_slots !== null ? ` מתוך ${cert.total_slots}` : ""}
                </p>

                {cert.battalionGroups.length === 0 && (
                  <p className="text-sm text-amber-700">אין עדיין הקצאות או שמות רשומים.</p>
                )}

                {cert.battalionGroups.map((group) => (
                  <div
                    key={group.battalion_id}
                    className="ps-3 border-e-2"
                    style={{ borderInlineEndColor: group.battalion_color }}
                  >
                    <p className="font-semibold text-sm" style={{ color: group.battalion_color }}>
                      {group.battalion_name}
                      {group.quota !== null ? ` (${group.registered.length}/${group.quota})` : ""}
                      {group.quota !== null && group.registered.length < group.quota && (
                        <span className="text-amber-700 font-normal"> — עדיין אין שמות מלאים</span>
                      )}
                    </p>
                    {group.registered.length > 0 ? (
                      <ul className="text-sm list-disc ms-5">
                        {group.registered.map((s, i) => (
                          <li key={i}>
                            {s.full_name} {s.personal_number}
                            {s.phone ? ` · ${s.phone}` : ""}
                            {s.company_platoon ? ` · ${s.company_platoon}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-amber-700 ms-5">טרם נשלחו שמות</p>
                    )}
                  </div>
                ))}

                {cert.reserve.length > 0 && (
                  <div className="ps-3 border-e-2 border-amber-400">
                    <p className="font-semibold text-sm text-amber-700">עתודה ({cert.reserve.length})</p>
                    <ul className="text-sm list-disc ms-5">
                      {cert.reserve.map((s, i) => (
                        <li key={i}>
                          {s.full_name} {s.personal_number}
                          {s.phone ? ` · ${s.phone}` : ""}
                          {s.battalion_name ? ` · ${s.battalion_name}` : ""}
                          {s.company_platoon ? ` · ${s.company_platoon}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {cert.taxes.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {cert.taxes.map((t, i) => (
                      <span
                        key={i}
                        className={`text-xs rounded-full px-2 py-0.5 ${
                          t.is_fulfilled ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                        }`}
                      >
                        {t.role_name} {t.is_fulfilled ? "✓ סגור" : "✕ לא סגור"}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </>
  );
}
