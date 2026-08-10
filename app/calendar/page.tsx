import { listCertifications, getCertificationBattalions } from "@/lib/db/repositories/certifications";
import { listTrainings, getTrainingBattalions } from "@/lib/db/repositories/trainings";
import {
  listInfluencingFactors,
  getInfluencingFactorBattalions,
} from "@/lib/db/repositories/influencing-factors";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { listRequests } from "@/lib/db/repositories/requests";
import { CalendarClient } from "@/components/calendar/calendar-client";
import {
  certificationToCalendarItem,
  trainingToCalendarItem,
  influencingFactorToCalendarItem,
  requestToCalendarItem,
  type CalendarItem,
} from "@/components/calendar/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [certifications, trainings, influencingFactors, battalions, requests] = await Promise.all([
    listCertifications().then((rows) => rows.filter((c) => c.status !== "cancelled")),
    listTrainings(),
    listInfluencingFactors(),
    listBattalions(),
    listRequests(),
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

  // Requests appear on their desired date. Skipped when there is no desired date (nothing
  // to place), and once a request has produced a certification — or was rejected/closed —
  // it stops showing so it never doubles up with the certification it created.
  const battalionById = new Map(battalions.map((b) => [b.id, b]));
  const requestItems: CalendarItem[] = requests
    .filter(
      (r) =>
        r.desired_date &&
        !["certification_opened", "rejected", "closed"].includes(r.status)
    )
    .map((r) => {
      const battalion = battalionById.get(r.battalion_id);
      return requestToCalendarItem(
        { ...r, desired_date: r.desired_date as string },
        battalion
          ? [{ code: battalion.code, name: battalion.name, color_hex: battalion.color_hex }]
          : []
      );
    });

  const items = [...certItems, ...trainingItems, ...factorItems, ...requestItems];

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">לוח שנה</h1>
      <CalendarClient items={items} battalions={battalions} />
    </div>
  );
}
