import { listBattalions } from "@/lib/db/repositories/battalions";
import { listTemplates } from "@/lib/db/repositories/templates";
import { listGapRows } from "@/lib/db/repositories/certification-gaps";
import { CertificationForm } from "@/components/certifications/certification-form";

export const dynamic = "force-dynamic";

export default async function NewCertificationPage() {
  const [battalions, templates, gapRows] = await Promise.all([
    listBattalions(),
    listTemplates(),
    listGapRows(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">הסמכה חדשה</h1>
      <CertificationForm battalions={battalions} templates={templates} gapRows={gapRows} />
    </div>
  );
}
