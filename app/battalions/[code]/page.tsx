import { notFound } from "next/navigation";
import { getBattalionByCode } from "@/lib/db/repositories/battalions";
import { listRequests } from "@/lib/db/repositories/requests";
import { getBattalionSummary } from "@/lib/db/repositories/battalion-summary";
import {
  listBattalionActionItems,
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

  // Both derive from `allocations`, so they run together rather than in series.
  // AUTHORIZATION: `scope` above already 404s a battalion-scoped user asking about another
  // battalion, and every query below is keyed to `battalion.id` from the URL — never to the
  // `active_role` cookie, which is a display selector and is not read here.
  const [tasks, actionItems] = await Promise.all([
    listBattalionTasks(battalion.id, allocations, pendingIdentity),
    listBattalionActionItems(battalion.id, allocations),
  ]);

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

  // Group B is absent from `allocations` by construction — no quota row, no roster row — so
  // without this the certification the band is pointing at would have no bar to point to.
  // `battalions: []` is the truth: nobody is allocated, which is what makes it open to all.
  const openToAllItems = actionItems.openToAll.map((c) =>
    certificationToCalendarItem({
      id: c.certification_id,
      template_id: null,
      name: c.name,
      domain: null,
      start_date: c.start_date,
      end_date: c.end_date,
      location: c.location,
      total_slots: c.total_slots,
      registration_open: 1,
      registration_lock_date: c.registration_lock_date,
      registration_lock_hour: c.registration_lock_hour,
      status: c.status,
      notes: null,
      origin_request_id: null,
      gap_row_id: null,
      created_by_role: "",
      color_hex: c.color_hex,
      created_at: "",
      updated_at: "",
      registered_count: c.registered_total,
      slots_remaining: c.remaining,
      battalions: [],
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
    ...[...certItems, ...openToAllItems].map((item) => ({
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
      openToAll={actionItems.openToAll}
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
