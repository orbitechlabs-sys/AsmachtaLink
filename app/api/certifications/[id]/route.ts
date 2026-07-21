import { NextResponse } from "next/server";
import {
  deleteCertification,
  getCertificationById,
  listPrerequisites,
  listQuotas,
  listTaxes,
  replacePrerequisites,
  replaceQuotas,
  replaceTaxes,
  updateCertification,
} from "@/lib/db/repositories/certifications";
import { certificationPatchSchema } from "@/lib/validation/certification";
import { getCurrentRole } from "@/lib/auth/current-role";
import { canManageCertifications } from "@/lib/auth/permissions";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const cert = await getCertificationById(Number(id));
  if (!cert) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    ...cert,
    prerequisites: await listPrerequisites(cert.id),
    quotas: await listQuotas(cert.id),
    taxes: await listTaxes(cert.id),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole();
  if (!canManageCertifications(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json();
  const parsed = certificationPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { prerequisites, quotas, taxes, is_unlimited, ...certInput } = parsed.data;
  // Normalize capacity only when is_unlimited was actually sent (partial update).
  if (is_unlimited !== undefined) {
    certInput.total_slots = is_unlimited ? null : certInput.total_slots ?? null;
  }
  await updateCertification(Number(id), certInput);
  if (prerequisites) await replacePrerequisites(Number(id), prerequisites);
  if (quotas) await replaceQuotas(Number(id), quotas);
  if (taxes) await replaceTaxes(Number(id), taxes);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole();
  if (!canManageCertifications(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { id } = await params;
  await deleteCertification(Number(id));
  return NextResponse.json({ ok: true });
}
