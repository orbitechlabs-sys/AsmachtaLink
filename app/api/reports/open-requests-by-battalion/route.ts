import { NextResponse } from "next/server";
import { openRequestsByBattalion } from "@/lib/db/repositories/reports";

export async function GET() {
  return NextResponse.json(await openRequestsByBattalion());
}
