import { NextResponse } from "next/server";
import { addGapRow, listGapRows } from "@/lib/db/repositories/certification-gaps";
import { getCurrentRole } from "@/lib/auth/current-role";
import { canManageCertifications } from "@/lib/auth/permissions";

export async function GET() {
  return NextResponse.json(await listGapRows());
}

export async function POST(request: Request) {
  const role = await getCurrentRole();
  if (!canManageCertifications(role)) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { certification_name } = await request.json();
  if (!certification_name || typeof certification_name !== "string") {
    return NextResponse.json({ error: "certification_name required" }, { status: 400 });
  }
  const id = await addGapRow(certification_name);
  return NextResponse.json({ id });
}
