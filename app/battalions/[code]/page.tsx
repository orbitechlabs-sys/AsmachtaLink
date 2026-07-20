import Link from "next/link";
import { notFound } from "next/navigation";
import { getBattalionByCode } from "@/lib/db/repositories/battalions";
import { listRosterForBattalion } from "@/lib/db/repositories/roster";
import { listRequests } from "@/lib/db/repositories/requests";
import { getCertificationById } from "@/lib/db/repositories/certifications";
import { listGapRows } from "@/lib/db/repositories/certification-gaps";
import { getCurrentRole } from "@/lib/auth/current-role";
import { getCurrentUser } from "@/lib/auth/user";
import { canManageCertifications, canEdit as canEditUser } from "@/lib/auth/permissions";
import { RosterStatusBadge, RequestStatusBadge } from "@/components/certifications/status-badge";
import { BattalionGapsBadges } from "@/components/requests/battalion-gaps-badges";

export const dynamic = "force-dynamic";

export default async function BattalionDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const battalion = await getBattalionByCode(code);
  if (!battalion) notFound();

  const roster = await listRosterForBattalion(battalion.id);
  const requests = await listRequests({ battalionCode: code });
  const gapRows = await listGapRows();
  const certifications = new Map(
    (await Promise.all(roster.map(async (entry) => [entry.certification_id, await getCertificationById(entry.certification_id)] as const)))
  );
  const role = await getCurrentRole();
  const me = await getCurrentUser();
  const canEdit = canManageCertifications(role) && canEditUser(me);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold" style={{ color: battalion.color_hex }}>
        {battalion.name}
      </h1>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">פערי הסמכות</h2>
        <BattalionGapsBadges rows={gapRows} battalionId={battalion.id} canEdit={canEdit} />
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">דרישות</h2>
        {requests.map((r) => (
          <Link key={r.id} href={`/requests/${r.id}`} className="block border rounded-md p-2 text-sm hover:shadow-sm">
            <div className="flex items-center justify-between">
              <span>
                {r.requested_cert_type} ({r.quantity_needed})
              </span>
              <RequestStatusBadge status={r.status} />
            </div>
          </Link>
        ))}
        {requests.length === 0 && <p className="text-muted-foreground text-sm">אין דרישות.</p>}
      </div>

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">חיילים רשומים להסמכות</h2>
        {roster.map((entry) => {
          const cert = certifications.get(entry.certification_id);
          return (
            <Link
              key={entry.id}
              href={`/certifications/${entry.certification_id}`}
              className="block border rounded-md p-2 text-sm hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <span>
                  {entry.full_name} · {cert?.name}
                </span>
                <RosterStatusBadge status={entry.status} />
              </div>
            </Link>
          );
        })}
        {roster.length === 0 && <p className="text-muted-foreground text-sm">אין חיילים רשומים.</p>}
      </div>
    </div>
  );
}
