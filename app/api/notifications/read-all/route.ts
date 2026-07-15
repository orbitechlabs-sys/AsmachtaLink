import { NextResponse } from "next/server";
import { markAllNotificationsRead } from "@/lib/db/repositories/notifications";
import { getCurrentRole } from "@/lib/auth/current-role";

export async function PATCH() {
  const role = await getCurrentRole();
  await markAllNotificationsRead(role);
  return NextResponse.json({ ok: true });
}
