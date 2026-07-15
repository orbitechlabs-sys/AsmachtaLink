import { NextResponse } from "next/server";
import { listNotifications } from "@/lib/db/repositories/notifications";
import { getCurrentRole } from "@/lib/auth/current-role";

export async function GET(request: Request) {
  const role = await getCurrentRole();
  const url = new URL(request.url);
  const unreadOnly = url.searchParams.get("unreadOnly") === "1";
  return NextResponse.json(await listNotifications(role, unreadOnly));
}
