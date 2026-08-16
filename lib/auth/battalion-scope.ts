import type { AppUser } from "@/lib/types";
import { BATTALION_SCOPED_ROLES } from "@/lib/types";

/**
 * The only sections a battalion-scoped user may reach: calendar, requests, battalions,
 * reports. Single source of truth — the navigation and the proxy's page gate both read
 * this list, so they can never drift apart.
 */
export const BATTALION_SCOPED_SECTIONS: string[] = [
  "/calendar",
  "/requests",
  "/battalions",
  "/reports",
];

/** Where a scoped user lands when they aim at a section that is not theirs. */
export const BATTALION_SCOPED_HOME = "/calendar";

/**
 * Paths every authenticated user needs regardless of section (identity, notifications,
 * auth pages, the pending screen). Kept separate so the section list above stays purely
 * about the four visible tabs.
 */
const ALWAYS_ALLOWED_PREFIXES = [
  "/api",
  "/login",
  "/signup",
  "/reset-password",
  "/update-password",
  "/auth",
  "/pending",
  "/notifications",
];

/**
 * The only API subtrees a battalion-scoped role may call. Hiding a section's page is not
 * enough — its API would still answer — so everything outside the four sections
 * (certifications, trainings, templates, roster, files, audit, admin, …) is refused in
 * the proxy. Each handler listed here scopes its own rows to the caller's battalion.
 */
const BATTALION_SCOPED_API_PREFIXES = [
  "/api/me",
  "/api/role",
  "/api/notifications",
  "/api/battalions",
  "/api/requests",
  "/api/reports",
  "/api/certification-gaps",
];

function matches(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

/** True when the role string is one of the two battalion-scoped roles. Takes a raw
 * string so the proxy can call it with a value read straight from the database. */
export function isBattalionScopedRole(role: string): boolean {
  return (BATTALION_SCOPED_ROLES as string[]).includes(role);
}

/** May a battalion-scoped user open this page path? */
export function isPathAllowedForScopedRole(pathname: string): boolean {
  if (pathname === "/") return true; // the root redirects onward
  if (ALWAYS_ALLOWED_PREFIXES.some((p) => matches(pathname, p))) return true;
  return BATTALION_SCOPED_SECTIONS.some((p) => matches(pathname, p));
}

/** May a battalion-scoped user call this API path at all? Read-scoping to their own
 * battalion still happens inside each handler; this only keeps them out of the APIs
 * belonging to sections they cannot see. */
export function isApiAllowedForScopedRole(pathname: string): boolean {
  return BATTALION_SCOPED_API_PREFIXES.some((p) => matches(pathname, p));
}

/** Scoped users may create requests for their own battalion — that is their only write.
 * Everything else stays denied by `canEdit()` inside the individual handlers. */
export function isWriteAllowedForBattalionEditor(pathname: string, method: string): boolean {
  return method === "POST" && pathname === "/api/requests";
}

/** Convenience for server components: the battalion a user is confined to, or null. */
export function scopedBattalionIdOf(user: AppUser | null): number | null {
  if (!user || user.status !== "approved") return null;
  return isBattalionScopedRole(user.role) ? user.battalion_id : null;
}
