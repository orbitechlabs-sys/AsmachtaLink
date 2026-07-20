import { NextResponse } from "next/server";
import { markAllNotificationsRead, SUPER_ADMIN_NOTIFICATION_ROLE } from "@/lib/db/repositories/notifications";
import { getCurrentRole } from "@/lib/auth/current-role";
import { getCurrentUser } from "@/lib/auth/user";
import { isSuperAdmin } from "@/lib/auth/permissions";

export async function PATCH() {
  const role = await getCurrentRole();
  const user = await getCurrentUser();
  const extraRoles = isSuperAdmin(user) ? [SUPER_ADMIN_NOTIFICATION_ROLE] : [];
  await markAllNotificationsRead(role, extraRoles);
  return NextResponse.json({ ok: true });
}
