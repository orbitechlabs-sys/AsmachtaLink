import { NextResponse } from "next/server";
import { certificationsByMonth } from "@/lib/db/repositories/reports";

export async function GET() {
  return NextResponse.json(await certificationsByMonth());
}
