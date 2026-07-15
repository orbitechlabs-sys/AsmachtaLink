import { NextResponse } from "next/server";
import { openForRegistration } from "@/lib/db/repositories/reports";

export async function GET() {
  return NextResponse.json(await openForRegistration());
}
