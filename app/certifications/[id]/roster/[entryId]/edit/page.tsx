import { notFound, redirect } from "next/navigation";
import { getCertificationById, listPrerequisites } from "@/lib/db/repositories/certifications";
import { getRosterEntry } from "@/lib/db/repositories/roster";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { getCurrentRole } from "@/lib/auth/current-role";
import { getCurrentUser } from "@/lib/auth/user";
import { canApproveRoster, canEdit } from "@/lib/auth/permissions";
import { RosterForm } from "@/components/roster/roster-form";
import { RosterStatusChanger } from "@/components/roster/roster-status-changer";

export const dynamic = "force-dynamic";

export default async function EditRosterEntryPage({
  params,
}: {
  params: Promise<{ id: string; entryId: string }>;
}) {
  const { id, entryId } = await params;
  if (!canEdit(await getCurrentUser())) redirect(`/certifications/${id}`);
  const [cert, entry] = await Promise.all([getCertificationById(Number(id)), getRosterEntry(Number(entryId))]);
  if (!cert || !entry) notFound();
  const [battalions, prerequisites] = await Promise.all([listBattalions(), listPrerequisites(cert.id)]);
  const role = await getCurrentRole();
  const canManage = canApproveRoster(role);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">עריכת {entry.full_name} - {cert.name}</h1>
      <RosterStatusChanger entry={entry} canManage={canManage} />
      <RosterForm
        certificationId={cert.id}
        battalions={battalions}
        entry={entry}
        hasPrerequisite={prerequisites.length > 0}
      />
    </div>
  );
}
