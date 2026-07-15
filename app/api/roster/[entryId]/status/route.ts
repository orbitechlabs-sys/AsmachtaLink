import { NextResponse } from "next/server";
import { updateRosterStatus } from "@/lib/db/repositories/roster";
import { rosterStatusSchema } from "@/lib/validation/roster";
import { getCurrentRole } from "@/lib/auth/current-role";
import { canApproveRoster } from "@/lib/auth/permissions";
import type { RosterStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const role = await getCurrentRole();
  if (!canApproveRoster(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { entryId } = await params;
  const body = await request.json();
  const parsed = rosterStatusSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const status = parsed.data.status as RosterStatus;
  try {
    await updateRosterStatus(
      Number(entryId),
      status,
      role,
      parsed.data.note ?? undefined,
      parsed.data.outcome_reason ?? undefined
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
