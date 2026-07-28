import { NextResponse } from "next/server";
import { setQuotaRegistrationLock } from "@/lib/db/repositories/certifications";
import { quotaLockSchema } from "@/lib/validation/quota";
import { requireEditor } from "@/lib/auth/user";
import { getCurrentRole } from "@/lib/auth/current-role";
import { isBrigade } from "@/lib/auth/permissions";

/** Brigade sets/clears the registration lock deadline on a battalion's allocation. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; battalionId: string }> }
) {
  const gate = await requireEditor();
  if (gate instanceof NextResponse) return gate;
  const role = await getCurrentRole();
  if (!isBrigade(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { id, battalionId } = await params;
  const body = await request.json();
  const parsed = quotaLockSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const updated = await setQuotaRegistrationLock(
    Number(id),
    Number(battalionId),
    parsed.data.registration_lock_at
  );
  if (updated === 0) {
    return NextResponse.json({ error: "no allocation for this battalion" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
