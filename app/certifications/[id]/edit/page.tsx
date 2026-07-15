import { notFound } from "next/navigation";
import {
  getCertificationById,
  listPrerequisites,
  listQuotas,
  listTaxes,
} from "@/lib/db/repositories/certifications";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { listTemplates } from "@/lib/db/repositories/templates";
import { listGapRows } from "@/lib/db/repositories/certification-gaps";
import { CertificationForm } from "@/components/certifications/certification-form";

export const dynamic = "force-dynamic";

export default async function EditCertificationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const cert = await getCertificationById(Number(id));
  if (!cert) notFound();

  const [battalions, templates, gapRows, prerequisiteRows, quotas, taxRows] = await Promise.all([
    listBattalions(),
    listTemplates(),
    listGapRows(),
    listPrerequisites(cert.id),
    listQuotas(cert.id),
    listTaxes(cert.id),
  ]);
  const prerequisites = prerequisiteRows.map((p) => p.description);
  const defaultQuotas: Record<number, number> = {};
  for (const q of quotas) defaultQuotas[q.battalion_id] = q.allocated_slots;
  const defaultTaxes = taxRows.map((t) => ({
    role_name: t.role_name,
    is_fulfilled: t.is_fulfilled === 1,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">עריכת הסמכה</h1>
      <CertificationForm
        battalions={battalions}
        templates={templates}
        gapRows={gapRows}
        certificationId={cert.id}
        defaultQuotas={defaultQuotas}
        defaultTaxes={defaultTaxes}
        defaultValues={{
          name: cert.name,
          domain: cert.domain ?? "",
          start_date: cert.start_date,
          end_date: cert.end_date ?? "",
          location: cert.location ?? "",
          total_slots: cert.total_slots ?? undefined,
          gap_row_id: cert.gap_row_id ?? undefined,
          registration_open: cert.registration_open === 1,
          notes: cert.notes ?? "",
          prerequisites,
        }}
      />
    </div>
  );
}
