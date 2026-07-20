import { listCertifications, getCertificationBattalions } from "@/lib/db/repositories/certifications";
import { listTrainings, getTrainingBattalions } from "@/lib/db/repositories/trainings";
import {
  listInfluencingFactors,
  getInfluencingFactorBattalions,
} from "@/lib/db/repositories/influencing-factors";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { CalendarClient } from "@/components/calendar/calendar-client";
import {
  certificationToCalendarItem,
  trainingToCalendarItem,
  influencingFactorToCalendarItem,
  type CalendarItem,
} from "@/components/calendar/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [certifications, trainings, influencingFactors, battalions] = await Promise.all([
    listCertifications().then((rows) => rows.filter((c) => c.status !== "cancelled")),
    listTrainings(),
    listInfluencingFactors(),
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

  const factorItems: CalendarItem[] = await Promise.all(
    influencingFactors.map(async (f) =>
      influencingFactorToCalendarItem(f, await getInfluencingFactorBattalions(f.id))
    )
  );

  const items = [...certItems, ...trainingItems, ...factorItems];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">לוח שנה</h1>
      <CalendarClient items={items} battalions={battalions} />
    </div>
  );
}
