import { addDays, format } from "date-fns";
import { getCertificationBattalions, listCertifications } from "@/lib/db/repositories/certifications";
import { getTrainingBattalions, listTrainings } from "@/lib/db/repositories/trainings";
import { getExportData, getTrainingExportData } from "@/lib/db/repositories/export";
import {
  certificationToCalendarItem,
  trainingToCalendarItem,
  type CalendarItem,
} from "@/components/calendar/types";
import { DateRangePicker } from "@/components/reports/date-range-picker";
import { ExportReportBody } from "@/components/reports/export-report-body";

export const dynamic = "force-dynamic";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { from: fromParam, to: toParam } = await searchParams;
  const today = new Date();
  const from = fromParam ?? format(addDays(today, -7), "yyyy-MM-dd");
  const to = toParam ?? format(addDays(today, 7), "yyyy-MM-dd");

  const [certs, trainings] = await Promise.all([
    getExportData(from, to).then((rows) =>
      rows.sort((a, b) => a.start_date.localeCompare(b.start_date))
    ),
    getTrainingExportData(from, to),
  ]);

  const [certGanttItems, trainingGanttItems] = await Promise.all([
    listCertifications({ from, to })
      .then((rows) => rows.filter((c) => c.status !== "cancelled"))
      .then((rows) =>
        Promise.all(
          rows.map(async (c) =>
            certificationToCalendarItem({ ...c, battalions: await getCertificationBattalions(c.id) })
          )
        )
      ),
    listTrainings({ from, to }).then((rows) =>
      Promise.all(rows.map(async (t) => trainingToCalendarItem(t, await getTrainingBattalions(t.id))))
    ),
  ]);

  const ganttItems: CalendarItem[] = [...certGanttItems, ...trainingGanttItems];

  return (
    <div className="space-y-4 max-w-5xl">
      <h1 className="text-2xl font-bold">סיכום לפי טווח תאריכים</h1>
      <DateRangePicker from={from} to={to} />
      <ExportReportBody certs={certs} trainings={trainings} ganttItems={ganttItems} from={from} to={to} />
    </div>
  );
}
