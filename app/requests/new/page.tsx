import { redirect } from "next/navigation";
import { listBattalions, getBattalionByCode } from "@/lib/db/repositories/battalions";
import { getCurrentRole } from "@/lib/auth/current-role";
import { getCurrentUser } from "@/lib/auth/user";
import { battalionCodeOf, canEdit, isBrigade } from "@/lib/auth/permissions";
import { RequestForm } from "@/components/requests/request-form";

export const dynamic = "force-dynamic";

export default async function NewRequestPage() {
  if (!canEdit(await getCurrentUser())) redirect("/requests");
  const role = await getCurrentRole();
  const allBattalions = await listBattalions();
  const battalions = isBrigade(role)
    ? allBattalions
    : allBattalions.filter((b) => b.code === battalionCodeOf(role));
  const defaultBattalion = isBrigade(role)
    ? undefined
    : (await getBattalionByCode(battalionCodeOf(role) ?? ""))?.id;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">דרישת הסמכה חדשה</h1>
      <RequestForm battalions={battalions.length ? battalions : allBattalions} defaultBattalionId={defaultBattalion} />
    </div>
  );
}
