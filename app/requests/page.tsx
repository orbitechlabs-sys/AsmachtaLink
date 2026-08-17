import Link from "next/link";
import { listRequests } from "@/lib/db/repositories/requests";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { listGapRows } from "@/lib/db/repositories/certification-gaps";
import { getCurrentRole } from "@/lib/auth/current-role";
import { getCurrentUser } from "@/lib/auth/user";
import {
  battalionCodeOf,
  canManageCertifications,
  canEdit,
  canEditBattalion,
  isBrigade,
} from "@/lib/auth/permissions";
import { getBattalionScope } from "@/lib/auth/scope";
import { RequestStatusBadge } from "@/components/certifications/status-badge";
import { CertificationGapsTable } from "@/components/requests/certification-gaps-table";
import { RequestsExportActions, REQUESTS_PAGE_CONTENT_ID } from "@/components/requests/requests-export-actions";
import { DeleteRequestButton } from "@/components/requests/delete-request-button";
import { URGENCY_LABELS, type Urgency } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function RequestsPage() {
  const role = await getCurrentRole();
  const me = await getCurrentUser();
  // A battalion-scoped role may edit (create requests) only within its own battalion;
  // global roles keep the existing canEdit() behaviour untouched.
  const scope = await getBattalionScope();
  const canEditData = scope ? canEditBattalion(me, scope.battalionId) : canEdit(me);
  // The scope comes from the authenticated user's row, so it overrides the cookie-based
  // view selector rather than trusting it.
  const battalionCode = scope
    ? scope.code
    : isBrigade(role)
    ? undefined
    : battalionCodeOf(role) ?? undefined;
  const requests = await listRequests({ battalionCode });
  const allBattalions = await listBattalions();
  // The map is handed to a client component (the export actions), so under a scope it
  // must hold their battalion only — otherwise every unit's name ships with the page.
  const battalions = scope
    ? allBattalions.filter((b) => b.id === scope.battalionId)
    : allBattalions;
  const battalionMap = new Map(battalions.map((b) => [b.id, b]));
  // "פערי הסמכות ביחס לשיבוץ": one column per battalion. A scoped role gets exactly one
  // column — its own — and rows that carry no other battalion's numbers, so the other
  // units are absent from the payload and from the Excel/PDF exports, not merely hidden.
  const gapRows = await listGapRows(scope?.battalionId);
  const gapBattalionCodes = ["5030", "8207", "9308", "6228", "gdsm", "hq"];
  const gapBattalions = scope
    ? battalions.filter((b) => b.id === scope.battalionId)
    : battalions.filter((b) => gapBattalionCodes.includes(b.code));

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
            <img src="/logo228.png" alt="חטיבה 228" className="h-10 w-auto" />
            <h1 className="text-2xl font-bold">פערי הסמכות ביחס לשיבוץ</h1>
          </div>
          {/* Gap counts are brigade-owned figures: a scoped role reads them, never edits
              them (the write endpoint refuses them anyway — their one write is a request). */}
          <CertificationGapsTable
            rows={gapRows}
            battalions={gapBattalions}
            canEdit={!scope && canManageCertifications(role) && canEditData}
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
            <div
              key={r.id}
              data-pdf-atomic
              className="relative rounded-lg border-e-4 bg-card shadow-sm hover:shadow-md transition-shadow"
              style={{ borderInlineEndColor: battalionMap.get(r.battalion_id)?.color_hex }}
            >
              <Link href={`/requests/${r.id}`} className="block p-3 pe-12">
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
              {/* Deleting a request is a brigade action. A scoped editor's one write is
                  SUBMITTING a request for their own battalion — and `role` here comes from
                  the view-selector cookie, so it cannot be part of that decision. */}
              {!scope && canManageCertifications(role) && canEditData && (
                <div className="absolute top-1.5 left-1.5 no-print">
                  <DeleteRequestButton
                    requestId={r.id}
                    requestName={`${battalionMap.get(r.battalion_id)?.name ?? ""} · ${r.requested_cert_type}`}
                  />
                </div>
              )}
            </div>
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
