import { NextResponse } from "next/server";
import { createRequest, listRequests } from "@/lib/db/repositories/requests";
import { requestSchema } from "@/lib/validation/request";
import { getCurrentRole } from "@/lib/auth/current-role";
import { battalionCodeOf, isBrigade } from "@/lib/auth/permissions";
import { getBattalionByCode } from "@/lib/db/repositories/battalions";
import type { RequestStatus } from "@/lib/types";

export async function GET(request: Request) {
  const role = await getCurrentRole();
  const url = new URL(request.url);
  const battalionCode = isBrigade(role)
    ? url.searchParams.get("battalion") ?? undefined
    : battalionCodeOf(role) ?? undefined;
  return NextResponse.json(
    await listRequests({
      battalionCode,
      status: (url.searchParams.get("status") as RequestStatus) ?? undefined,
    })
  );
}

export async function POST(request: Request) {
  const role = await getCurrentRole();
  const body = await request.json();
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  if (!isBrigade(role)) {
    const code = battalionCodeOf(role);
    const battalion = await getBattalionByCode(code ?? "");
    if (!battalion || battalion.id !== parsed.data.battalion_id) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
  }
  const id = await createRequest(parsed.data);
  return NextResponse.json({ id }, { status: 201 });
}
