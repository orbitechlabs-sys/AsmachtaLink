import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCertificationById,
  listPrerequisites,
  listQuotas,
  listTaxes,
} from "@/lib/db/repositories/certifications";
import { listReserveForCertification, listRosterForCertification } from "@/lib/db/repositories/roster";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { getCurrentRole } from "@/lib/auth/current-role";
import { canManageCertifications } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { DateRange } from "@/components/ui/date-range";
import { RosterTable } from "@/components/roster/roster-table";
import { CertificationStatusChanger } from "@/components/certifications/status-changer";
import { ConfirmCompletionPanel } from "@/components/certifications/confirm-completion-panel";
import { StatusHistoryTimeline } from "@/components/audit/status-history-timeline";
import { TaxList } from "@/components/certifications/tax-list";
import { getWeekNumber, getHebrewDayRangeLabel } from "@/lib/utils/dates";
import { Pencil, Plus, Printer } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CertificationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cert = await getCertificationById(Number(id));
  if (!cert) notFound();

  const [prerequisites, quotas, taxes, roster, reserve, battalions, role] = await Promise.all([
    listPrerequisites(cert.id),
    listQuotas(cert.id),
    listTaxes(cert.id),
    listRosterForCertification(cert.id),
    listReserveForCertification(cert.id),
    listBattalions(),
    getCurrentRole(),
  ]);
  const canManage = canManageCertifications(role);
  const battalionMap = new Map(battalions.map((b) => [b.id, b]));

  const today = new Date().toISOString().slice(0, 10);
  const pendingStatuses = ["registered", "pending_approval", "approved"];
  const showConfirmPanel =
    canManage &&
    (cert.end_date || cert.start_date) <= today &&
    cert.status !== "completed" &&
    cert.status !== "cancelled" &&
    roster.some((r) => pendingStatuses.includes(r.status));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">{cert.name}</h1>
          <p className="text-muted-foreground text-sm">
            {cert.domain ?? "ללא תחום"} · {cert.location ?? "ללא מיקום"}
          </p>
          <p className="text-sm mt-1 flex items-center gap-2">
            <DateRange start={cert.start_date} end={cert.end_date} />
            <span className="text-xs text-muted-foreground">
              שבוע {getWeekNumber(cert.start_date)} · {getHebrewDayRangeLabel(cert.start_date, cert.end_date)}
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/certifications/${cert.id}/print`} target="_blank">
              <Printer className="size-4" />
              ייצוא רשימה
            </Link>
          </Button>
          {canManage && (
            <Button variant="outline" asChild>
              <Link href={`/certifications/${cert.id}/edit`}>
                <Pencil className="size-4" />
                עריכה
              </Link>
            </Button>
          )}
        </div>
      </div>

      <CertificationStatusChanger certification={cert} canManage={canManage} />

      {showConfirmPanel && (
        <ConfirmCompletionPanel
          certificationId={cert.id}
          roster={roster.filter((r) => pendingStatuses.includes(r.status))}
          battalionMap={battalionMap}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div className="rounded-lg p-3 bg-blue-50 border border-blue-200">
          <div className="text-blue-700 font-medium">רשומים</div>
          <div className="text-xl font-bold text-blue-900">
            {cert.registered_count}
            {cert.slots_remaining !== null ? ` / ${cert.total_slots}` : ""}
          </div>
        </div>
        <div className="rounded-lg p-3 bg-violet-50 border border-violet-200">
          <div className="text-violet-700 font-medium">דרישות קדם</div>
          <div className="text-violet-900">
            {prerequisites.length > 0
              ? prerequisites.map((p) => p.description).join(", ")
              : "אין"}
          </div>
        </div>
        <div className="rounded-lg p-3 bg-teal-50 border border-teal-200">
          <div className="text-teal-700 font-medium">הקצאה לפי גדוד</div>
          <div className="text-teal-900">
            {quotas.length > 0
              ? quotas
                  .map((q) => `${battalionMap.get(q.battalion_id)?.name}: ${q.allocated_slots}`)
                  .join(" · ")
              : "אין הקצאה קבועה"}
          </div>
        </div>
        <div className="rounded-lg p-3 bg-amber-50 border border-amber-200">
          <div className="text-amber-700 font-medium mb-1">מיסים</div>
          <TaxList taxes={taxes} canManage={canManage} />
        </div>
      </div>

      {cert.notes && <p className="text-sm text-muted-foreground">{cert.notes}</p>}

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">רשימת חיילים</h2>
          <Button size="sm" asChild>
            <Link href={`/certifications/${cert.id}/roster/new`}>
              <Plus className="size-4" />
              הוסף חייל
            </Link>
          </Button>
        </div>
        <RosterTable
          certificationId={cert.id}
          entries={roster}
          battalions={battalions}
          canManage={canManage}
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-amber-700">עתודה</h2>
          <Button size="sm" variant="outline" className="border-amber-300 text-amber-700" asChild>
            <Link href={`/certifications/${cert.id}/roster/new?reserve=1`}>
              <Plus className="size-4" />
              הוסף לעתודה
            </Link>
          </Button>
        </div>
        {reserve.length > 0 ? (
          <RosterTable
            certificationId={cert.id}
            entries={reserve}
            battalions={battalions}
            canManage={canManage}
          />
        ) : (
          <p className="text-sm text-muted-foreground">אין אנשי עתודה רשומים.</p>
        )}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">היסטוריה</h2>
        <StatusHistoryTimeline entityType="certification" entityId={cert.id} />
      </div>
    </div>
  );
}
