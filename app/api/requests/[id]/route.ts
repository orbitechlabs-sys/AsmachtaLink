import { NextResponse } from "next/server";
import { getRequest, updateRequest } from "@/lib/db/repositories/requests";
import { requestSchema } from "@/lib/validation/request";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const req = await getRequest(Number(id));
  if (!req) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json(req);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const parsed = requestSchema.partial().safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  await updateRequest(Number(id), parsed.data);
  return NextResponse.json({ ok: true });
}
