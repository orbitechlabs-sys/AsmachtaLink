import { notFound } from "next/navigation";
import { getBattalionByCode } from "@/lib/db/repositories/battalions";
import { listRequests } from "@/lib/db/repositories/requests";
import { getBattalionSummary } from "@/lib/db/repositories/battalion-summary";
import {
  listBattalionAllocations,
  listBattalionTasks,
  listAdminConfirmations,
  getQuarterCompletion,
} from "@/lib/db/repositories/battalion-dashboard";
import { countPendingIdentity } from "@/lib/db/repositories/force-structure";
import { getCurrentUser } from "@/lib/auth/user";
import { getBattalionScope } from "@/lib/auth/scope";
import { canEditBattalion } from "@/lib/auth/permissions";
import { BattalionDashboard } from "@/components/battalions/battalion-dashboard";
import {
  listInfluencingFactors,
  getInfluencingFactorBattalions,
} from "@/lib/db/repositories/influencing-factors";
import { certificationToCalendarItem, influencingFactorToCalendarItem } from "@/components/calendar/types";
import { certificationColor } from "@/lib/utils/cert-colors";

export const dynamic = "force-dynamic";

export default async function BattalionDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const battalion = await getBattalionByCode(code);
  if (!battalion) notFound();

  const scope = await getBattalionScope();
  if (scope && scope.battalionId !== battalion.id) notFound();

  const me = await getCurrentUser();
  const canEdit = canEditBattalion(me, battalion.id);
  const certificationHref = (certificationId: number) =>
    scope
      ? `/battalions/${battalion.code}/certifications/${certificationId}`
      : `/certifications/${certificationId}`;

  const [summary, allocations, adminRows, quarter, requests, pendingIdentity, factors] =
    await Promise.all([
      getBattalionSummary(battalion.id),
      listBattalionAllocations(battalion.id),
      listAdminConfirmations(battalion.id),
      getQuarterCompletion(battalion.id),
      listRequests({ battalionCode: code }),
      countPendingIdentity(battalion.id),
      listInfluencingFactors(),
    ]);

  const tasks = await listBattalionTasks(battalion.id, allocations, pendingIdentity);

  const certItems = allocations.map((a) =>
    certificationToCalendarItem({
      id: a.certification_id,
      template_id: null,
      name: a.name,
      domain: null,
      start_date: a.start_date,
      end_date: a.end_date,
      location: a.location,
      total_slots: a.allocated_slots,
      registration_open: 0,
      registration_lock_date: a.registration_lock_date,
      registration_lock_hour: a.registration_lock_hour,
      status: a.status,
      notes: null,
      origin_request_id: null,
      gap_row_id: null,
      created_by_role: "",
      color_hex: a.color_hex,
      created_at: "",
      updated_at: "",
      registered_count: a.registered,
      slots_remaining: a.remaining,
      battalions: [{ code: battalion.code, name: battalion.name, color_hex: battalion.color_hex }],
    })
  );

  const factorItems = (
    await Promise.all(
      factors.map(async (f) => {
        const bns = await getInfluencingFactorBattalions(f.id);
        return influencingFactorToCalendarItem(f, bns);
      })
    )
  ).map((item) =>
    scope ? { ...item, battalions: item.battalions.filter((b) => b.code === battalion.code) } : item
  );

  const calendarItems = [
    ...factorItems,
    ...certItems.map((item) => ({
      ...item,
      href: certificationHref(item.id),
      color: item.color || certificationColor(item.name),
    })),
  ];

  return (
    <BattalionDashboard
      battalion={battalion}
      summary={summary}
      allocations={allocations}
      tasks={tasks}
      adminRows={adminRows}
      quarter={quarter}
      requests={requests}
      calendarItems={calendarItems}
      canEdit={canEdit}
      scopedCertLinks={Boolean(scope)}
    />
  );
}
