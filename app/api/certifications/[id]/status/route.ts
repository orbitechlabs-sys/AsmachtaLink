import { NextResponse } from "next/server";
import { updateCertificationStatus } from "@/lib/db/repositories/certifications";
import { certificationStatusSchema } from "@/lib/validation/certification";
import { getCurrentRole } from "@/lib/auth/current-role";
import { canManageCertifications } from "@/lib/auth/permissions";
import type { CertificationStatus } from "@/lib/types";

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
  const parsed = certificationStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  try {
    await updateCertificationStatus(
      Number(id),
      parsed.data.status as CertificationStatus,
      role,
      parsed.data.note ?? undefined
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
