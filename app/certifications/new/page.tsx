import { listBattalions } from "@/lib/db/repositories/battalions";
import { listTemplates } from "@/lib/db/repositories/templates";
import { listGapRows } from "@/lib/db/repositories/certification-gaps";
import { listPaletteColors } from "@/lib/db/repositories/course-colors";
import { randomPaletteColor } from "@/lib/utils/palette";
import { CertificationForm } from "@/components/certifications/certification-form";

export const dynamic = "force-dynamic";

export default async function NewCertificationPage() {
  const [battalions, templates, gapRows, palette] = await Promise.all([
    listBattalions(),
    listTemplates(),
    listGapRows(),
    listPaletteColors(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">הסמכה חדשה</h1>
      <CertificationForm
        battalions={battalions}
        templates={templates}
        gapRows={gapRows}
        palette={palette}
        defaultValues={{ color_hex: randomPaletteColor(palette) }}
      />
    </div>
  );
}
