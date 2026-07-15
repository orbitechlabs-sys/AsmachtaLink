import { listCertifications, getCertificationBattalions } from "@/lib/db/repositories/certifications";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { getCourseColorMap } from "@/lib/db/repositories/templates";
import { certificationColor } from "@/lib/utils/cert-colors";
import { CalendarClient } from "@/components/calendar/calendar-client";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const certifications = (await listCertifications()).filter((c) => c.status !== "cancelled");
  const battalions = await listBattalions();
  const courseColors = await getCourseColorMap();
  const certsWithBattalions = await Promise.all(certifications.map(async (c) => ({
    ...c,
    battalions: await getCertificationBattalions(c.id),
    color_hex: courseColors.get(c.name) ?? certificationColor(c.name),
  })));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">לוח שנה - הסמכות</h1>
      <CalendarClient certifications={certsWithBattalions} battalions={battalions} />
    </div>
  );
}
