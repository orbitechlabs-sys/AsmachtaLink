import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/auth/user";
import { approveUser, rejectUser, updateUserRole } from "@/lib/db/repositories/users";
import { userPatchSchema } from "@/lib/validation/admin";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdmin();
  if (gate instanceof NextResponse) return gate;
  const admin = gate;

  const { id } = await params;
  const body = await request.json();
  const parsed = userPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.action === "approve") {
    await approveUser({ id, role: parsed.data.role, approvedBy: admin.id });
  } else {
    // Prevent a super-admin from demoting themselves and losing access.
    if (id === admin.id && parsed.data.role !== "super_admin") {
      return NextResponse.json(
        { error: "לא ניתן לשנות את התפקיד של עצמך" },
        { status: 400 }
      );
    }
    await updateUserRole(id, parsed.data.role);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireSuperAdmin();
  if (gate instanceof NextResponse) return gate;
  const admin = gate;

  const { id } = await params;
  if (id === admin.id) {
    return NextResponse.json({ error: "לא ניתן למחוק את המשתמש שלך" }, { status: 400 });
  }

  await rejectUser(id);
  return NextResponse.json({ ok: true });
}
