import { listCertifications, getCertificationBattalions } from "@/lib/db/repositories/certifications";
import { listTrainings, getTrainingBattalions } from "@/lib/db/repositories/trainings";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { certificationColor } from "@/lib/utils/cert-colors";
import { CalendarClient } from "@/components/calendar/calendar-client";
import { certificationToCalendarItem, type CalendarItem } from "@/components/calendar/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [certifications, trainings, battalions] = await Promise.all([
    listCertifications().then((rows) => rows.filter((c) => c.status !== "cancelled")),
    listTrainings(),
    listBattalions(),
  ]);

  const certItems: CalendarItem[] = await Promise.all(
    certifications.map(async (c) =>
      certificationToCalendarItem({ ...c, battalions: await getCertificationBattalions(c.id) })
    )
  );

  const trainingItems: CalendarItem[] = await Promise.all(
    trainings.map(async (t) => ({
      kind: "training" as const,
      id: t.id,
      key: `training-${t.id}`,
      name: t.name,
      start_date: t.start_date,
      end_date: t.end_date,
      location: null,
      href: `/trainings/${t.id}`,
      color: t.color_hex || certificationColor(t.domain || t.name),
      battalions: await getTrainingBattalions(t.id),
      registration_open: 0,
    }))
  );

  const items = [...certItems, ...trainingItems];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">לוח שנה</h1>
      <CalendarClient items={items} battalions={battalions} />
    </div>
  );
}
