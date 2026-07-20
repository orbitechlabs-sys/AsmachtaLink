import Link from "next/link";
import { listRequests } from "@/lib/db/repositories/requests";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { listGapRows } from "@/lib/db/repositories/certification-gaps";
import { getCurrentRole } from "@/lib/auth/current-role";
import { getCurrentUser } from "@/lib/auth/user";
import { battalionCodeOf, canManageCertifications, canEdit, isBrigade } from "@/lib/auth/permissions";
import { RequestStatusBadge } from "@/components/certifications/status-badge";
import { CertificationGapsTable } from "@/components/requests/certification-gaps-table";
import { RequestsExportActions, REQUESTS_PAGE_CONTENT_ID } from "@/components/requests/requests-export-actions";
import { URGENCY_LABELS, type Urgency } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const role = await getCurrentRole();
  const me = await getCurrentUser();
  const canEditData = canEdit(me);
  const battalionCode = isBrigade(role) ? undefined : battalionCodeOf(role) ?? undefined;
  const requests = await listRequests({ battalionCode });
  const battalions = await listBattalions();
  const battalionMap = new Map(battalions.map((b) => [b.id, b]));
  const gapRows = await listGapRows();
  const gapBattalionCodes = ["5030", "8207", "9308", "6228", "gdsm", "hq"];
  const gapBattalions = battalions.filter((b) => gapBattalionCodes.includes(b.code));

  return (
    <div className="space-y-6">
      <RequestsExportActions
        gapRows={gapRows}
        gapBattalions={gapBattalions}
        requests={requests}
        battalionMap={battalionMap}
      />

      <div id={REQUESTS_PAGE_CONTENT_ID} className="space-y-6 bg-background">
        <div data-pdf-atomic className="space-y-2">
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brigade-logo.png" alt="חטיבה 228" className="size-10" />
            <h1 className="text-2xl font-bold">פערי הסמכות ביחס לשיבוץ</h1>
          </div>
          <CertificationGapsTable
            rows={gapRows}
            battalions={gapBattalions}
            canEdit={canManageCertifications(role) && canEditData}
          />
        </div>

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">דרישות גדודים</h2>
          {canEditData && (
            <Button asChild className="no-print">
              <Link href="/requests/new">
                <Plus className="size-4" />
                דרישה חדשה
              </Link>
            </Button>
          )}
        </div>
        <div className="space-y-2">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/requests/${r.id}`}
              data-pdf-atomic
              className="block rounded-lg border-e-4 bg-card shadow-sm p-3 hover:shadow-md transition-shadow"
              style={{ borderInlineEndColor: battalionMap.get(r.battalion_id)?.color_hex }}
            >
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="font-medium">
                  <span
                    className="font-bold"
                    style={{ color: battalionMap.get(r.battalion_id)?.color_hex }}
                  >
                    {battalionMap.get(r.battalion_id)?.name}
                  </span>
                  {" · "}
                  {r.requested_cert_type} ({r.quantity_needed})
                </span>
                <RequestStatusBadge status={r.status} />
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                דחיפות: {URGENCY_LABELS[r.urgency as Urgency]} · נפתחה{" "}
                {new Date(r.created_at).toLocaleDateString("he-IL")}
              </p>
            </Link>
          ))}
          {requests.length === 0 && (
            <p data-pdf-atomic className="text-muted-foreground text-sm">
              אין דרישות עדיין.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
