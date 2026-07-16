import { format } from "date-fns";
import { he } from "date-fns/locale";
import { addDays } from "date-fns";
import { getExportData } from "@/lib/db/repositories/export";
import { getCertificationBattalions, listCertifications } from "@/lib/db/repositories/certifications";
import { CERTIFICATION_STATUS_LABELS } from "@/lib/types";
import { GanttView } from "@/components/calendar/gantt-view";
import { certificationToCalendarItem } from "@/components/calendar/types";
import { SlotStatusIndicator } from "@/components/certifications/slot-status-indicator";
import { ExportReportActions, EXPORT_REPORT_CONTENT_ID } from "@/components/reports/export-report-actions";

export const dynamic = "force-dynamic";

function hebrewDate(iso: string) {
  return format(new Date(iso), "EEEE, d/M/yyyy", { locale: he });
}

export default async function ExportPrintPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const from = fromParam ?? format(new Date(), "yyyy-MM-dd");
  const to = toParam ?? format(addDays(new Date(), 7), "yyyy-MM-dd");

  const certs = await getExportData(from, to);
  certs.sort((a, b) => a.start_date.localeCompare(b.start_date));

  const ganttItems = await Promise.all(
    (await listCertifications({ from, to })).map(async (c) =>
      certificationToCalendarItem({ ...c, battalions: await getCertificationBattalions(c.id) })
    )
  );

  const registrationGaps = certs.filter(
    (c) => c.total_slots !== null && c.registered_count < c.total_slots && c.status !== "cancelled"
  );
  const taxGaps = certs.flatMap((c) =>
    c.taxes.filter((t) => !t.is_fulfilled).map((t) => ({ cert: c, tax: t }))
  );

  const byDay = new Map<string, typeof certs>();
  for (const c of certs) {
    if (!byDay.has(c.start_date)) byDay.set(c.start_date, []);
    byDay.get(c.start_date)!.push(c);
  }
  const days = Array.from(byDay.keys()).sort();

  return (
    <div className="p-6 print:p-0 max-w-5xl mx-auto space-y-6">
      <ExportReportActions certs={certs} from={from} to={to} />

      <div id={EXPORT_REPORT_CONTENT_ID} className="space-y-6 bg-background p-2">
      <div data-pdf-atomic>
        <h1 className="text-2xl font-bold">סיכום הסמכות</h1>
        <p className="text-muted-foreground">
          {hebrewDate(from)} — {hebrewDate(to)}
        </p>
      </div>

      {ganttItems.length > 0 && (
        <div data-pdf-atomic className="space-y-2 break-inside-avoid">
          <h2 className="font-bold">תצוגת גאנט</h2>
          <GanttView
            items={ganttItems}
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
        <p data-pdf-atomic className="text-muted-foreground">אין הסמכות בטווח התאריכים שנבחר.</p>
      )}

      {days.map((day) => (
        <div key={day} className="space-y-3 break-inside-avoid">
          <h2 data-pdf-atomic className="text-lg font-bold border-b-2 border-primary pb-1">{hebrewDate(day)}</h2>
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
                <div key={group.battalion_id} className="ps-3 border-e-2" style={{ borderInlineEndColor: group.battalion_color }}>
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
                  <p className="font-semibold text-sm text-amber-700">
                    עתודה ({cert.reserve.length})
                  </p>
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
    </div>
  );
}
