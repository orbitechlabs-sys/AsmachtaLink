import { NextResponse } from "next/server";
import { addRosterEntry, listRosterForCertification } from "@/lib/db/repositories/roster";
import { rosterEntrySchema } from "@/lib/validation/roster";
import { getCurrentRole } from "@/lib/auth/current-role";

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
  const entryId = await addRosterEntry(
    { ...parsed.data, certification_id: Number(id) },
    role
  );
  return NextResponse.json({ id: entryId }, { status: 201 });
}
