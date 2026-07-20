import { NextResponse } from "next/server";
import { listNotifications, SUPER_ADMIN_NOTIFICATION_ROLE } from "@/lib/db/repositories/notifications";
import { getCurrentRole } from "@/lib/auth/current-role";
import { getCurrentUser } from "@/lib/auth/user";
import { isSuperAdmin } from "@/lib/auth/permissions";

export async function GET(request: Request) {
  const role = await getCurrentRole();
  const user = await getCurrentUser();
  const extraRoles = isSuperAdmin(user) ? [SUPER_ADMIN_NOTIFICATION_ROLE] : [];
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "1";
  return NextResponse.json(await listNotifications(role, unreadOnly, extraRoles));
}
