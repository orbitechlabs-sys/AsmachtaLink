import { NextResponse } from "next/server";
import { deleteRosterEntry, getRosterEntry, updateRosterEntry } from "@/lib/db/repositories/roster";
import { rosterEntrySchema } from "@/lib/validation/roster";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params;
  const entry = await getRosterEntry(Number(entryId));
  if (!entry) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(entry);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params;
  const body = await request.json();
  const parsed = rosterEntrySchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await updateRosterEntry(Number(entryId), parsed.data);
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ entryId: string }> }
) {
  const { entryId } = await params;
  await deleteRosterEntry(Number(entryId));
  return NextResponse.json({ ok: true });
}
