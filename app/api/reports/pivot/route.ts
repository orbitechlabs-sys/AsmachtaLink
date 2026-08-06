import { NextResponse } from "next/server";
import { countSoldiersByBattalion } from "@/lib/db/repositories/certification-pivot";
import { pivotQuerySchema } from "@/lib/validation/pivot";
import { requireApprovedUser } from "@/lib/auth/user";

/** Per-battalion soldier counts for the certification-pivot widgets.
 * POST (not GET) because the payload is two id arrays plus a range. */
export async function POST(request: Request) {
  // Read-only report: any approved user may run it. Gated on the server-side identity
  // — the active_role cookie is a view-scope selector, never an authorization source.
  const gate = await requireApprovedUser();
  if (gate instanceof NextResponse) return gate;

  const body = await request.json();
  const parsed = pivotQuerySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  return NextResponse.json(await countSoldiersByBattalion(parsed.data));
}
