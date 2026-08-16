import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { BATTALION_SCOPED_HOME, scopedBattalionIdOf } from "@/lib/auth/battalion-scope";

/**
 * Server guard for the sections a battalion-scoped role may not open (הדרכות, הסמכות,
 * בנק הסמכות, ניהול…). Call it from the section's `layout.tsx` so every nested route is
 * covered.
 *
 * The proxy already redirects these paths, but it is deliberately best-effort (it swallows
 * database errors so a hiccup never locks the whole app out). This is the authoritative
 * check, run inside the page render with the user's real row — a hidden tab must not be
 * reachable by typing its URL.
 *
 * Global roles fall straight through, so their pages are unchanged.
 */
export async function requireGlobalSection(): Promise<void> {
  const user = await getCurrentUser();
  if (scopedBattalionIdOf(user) !== null) redirect(BATTALION_SCOPED_HOME);
}
