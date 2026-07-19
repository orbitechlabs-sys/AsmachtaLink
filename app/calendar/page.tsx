import { listCertifications, getCertificationBattalions } from "@/lib/db/repositories/certifications";
import { listTrainings, getTrainingBattalions } from "@/lib/db/repositories/trainings";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { CalendarClient } from "@/components/calendar/calendar-client";
import {
  certificationToCalendarItem,
  trainingToCalendarItem,
  type CalendarItem,
} from "@/components/calendar/types";

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
    trainings.map(async (t) => trainingToCalendarItem(t, await getTrainingBattalions(t.id)))
  );

  const items = [...certItems, ...trainingItems];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">לוח שנה</h1>
      <CalendarClient items={items} battalions={battalions} />
    </div>
  );
}
