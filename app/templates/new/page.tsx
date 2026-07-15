import { listGapRows } from "@/lib/db/repositories/certification-gaps";
import { TemplateForm } from "@/components/templates/template-form";

export const dynamic = "force-dynamic";

export default async function NewTemplatePage({
  searchParams,
}: {
  searchParams: Promise<{ name?: string; domain?: string }>;
}) {
  const { name, domain } = await searchParams;
  const gapRows = await listGapRows();
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">תבנית הסמכה חדשה</h1>
      <TemplateForm gapRows={gapRows} defaultName={name} defaultDomain={domain} />
    </div>
  );
}
