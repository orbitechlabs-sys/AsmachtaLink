import { NextResponse } from "next/server";
import { completedCertifications } from "@/lib/db/repositories/reports";

export async function GET() {
  return NextResponse.json(await completedCertifications());
}
