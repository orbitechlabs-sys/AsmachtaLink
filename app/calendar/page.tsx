import { listCertifications, getCertificationBattalions } from "@/lib/db/repositories/certifications";
import { listTrainings, getTrainingBattalions } from "@/lib/db/repositories/trainings";
import {
  listInfluencingFactors,
  getInfluencingFactorBattalions,
} from "@/lib/db/repositories/influencing-factors";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { getBattalionScope } from "@/lib/auth/scope";
import { CalendarClient } from "@/components/calendar/calendar-client";
import {
  certificationToCalendarItem,
  trainingToCalendarItem,
  influencingFactorToCalendarItem,
  scopeCalendarItemToBattalion,
  type CalendarItem,
} from "@/components/calendar/types";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  // Battalion-scoped roles see only their own battalion's items; global roles are
  // unscoped (scope === null) and keep the full calendar exactly as before.
  const scope = await getBattalionScope();

  const [certifications, trainings, influencingFactors, battalions] = await Promise.all([
    listCertifications(scope ? { battalionCode: scope.code } : {}).then((rows) =>
      rows.filter((c) => c.status !== "cancelled")
    ),
    listTrainings(),
    listInfluencingFactors(),
    listBattalions(),
  ]);

  const certItems: CalendarItem[] = await Promise.all(
    certifications.map(async (c) =>
      certificationToCalendarItem({ ...c, battalions: await getCertificationBattalions(c.id) })
    )
  );

  // Trainings carry no battalion column — their units come from their sessions — so they
  // are filtered here, after their battalion refs are resolved.
  const allTrainingItems: CalendarItem[] = await Promise.all(
    trainings.map(async (t) => trainingToCalendarItem(t, await getTrainingBattalions(t.id)))
  );
  const trainingItems = scope
    ? allTrainingItems.filter((t) => t.battalions.some((b) => b.code === scope.code))
    : allTrainingItems;

  const allFactorItems: CalendarItem[] = await Promise.all(
    influencingFactors.map(async (f) =>
      influencingFactorToCalendarItem(f, await getInfluencingFactorBattalions(f.id))
    )
  );
  // A factor with no battalions attached is brigade-wide and concerns everyone; one that
  // names battalions is shown only to the units it names.
  const factorItems = scope
    ? allFactorItems.filter(
        (f) => f.battalions.length === 0 || f.battalions.some((b) => b.code === scope.code)
      )
    : allFactorItems;

  // Which other units are on a course is itself another battalion's data, so a scoped
  // user's bars are labelled with their own battalion only.
  const items = [...certItems, ...trainingItems, ...factorItems].map((item) =>
    scope ? scopeCalendarItemToBattalion(item, scope.code) : item
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">לוח שנה</h1>
      {/* The unit filter offers only the scoped user's own battalion. */}
      <CalendarClient
        items={items}
        battalions={scope ? battalions.filter((b) => b.id === scope.battalionId) : battalions}
      />
    </div>
  );
}
