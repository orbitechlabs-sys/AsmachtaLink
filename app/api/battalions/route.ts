import { NextResponse } from "next/server";
import { listBattalions } from "@/lib/db/repositories/battalions";

export async function GET() {
  return NextResponse.json(await listBattalions());
}
