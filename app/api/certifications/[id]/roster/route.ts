import { NextResponse } from "next/server";
import { addRosterEntry, listRosterForCertification } from "@/lib/db/repositories/roster";
import { rosterEntrySchema } from "@/lib/validation/roster";
import { getCurrentRole } from "@/lib/auth/current-role";
import { REGISTRATION_LOCKED_MESSAGE } from "@/lib/utils/registration-lock";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  return NextResponse.json(await listRosterForCertification(Number(id)));
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const role = await getCurrentRole();
  const { id } = await params;
  const body = await request.json();
  const parsed = rosterEntrySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const result = await addRosterEntry(
    { ...parsed.data, certification_id: Number(id) },
    role
  );
  // The deadline binds the brigade side as well. It used to be checked only on the
  // battalion route, which made it a deadline for battalions rather than for the
  // certification — a global editor could still register after everyone else was locked out.
  if (!result.ok) {
    return NextResponse.json(
      { error: REGISTRATION_LOCKED_MESSAGE, reason: result.reason },
      { status: 403 }
    );
  }
  return NextResponse.json({ id: result.id }, { status: 201 });
}
