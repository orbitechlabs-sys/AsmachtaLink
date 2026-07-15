import { notFound } from "next/navigation";
import { getCertificationById, listPrerequisites } from "@/lib/db/repositories/certifications";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { RosterForm } from "@/components/roster/roster-form";

export const dynamic = "force-dynamic";

export default async function NewRosterEntryPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ reserve?: string }>;
}) {
  const { id } = await params;
  const { reserve } = await searchParams;
  const cert = await getCertificationById(Number(id));
  if (!cert) notFound();
  const [battalions, prerequisites] = await Promise.all([listBattalions(), listPrerequisites(cert.id)]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">
        {reserve === "1" ? "הוספה לעתודה" : "הוספת חייל"} ל&quot;{cert.name}&quot;
      </h1>
      <RosterForm
        certificationId={cert.id}
        battalions={battalions}
        hasPrerequisite={prerequisites.length > 0}
        defaultIsReserve={reserve === "1"}
      />
    </div>
  );
}
