import { NextResponse } from "next/server";
import { rosterCounts } from "@/lib/db/repositories/reports";

export async function GET() {
  return NextResponse.json(await rosterCounts());
}
