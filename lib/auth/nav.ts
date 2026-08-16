import { isBattalionScoped, isSuperAdmin } from "@/lib/auth/permissions";
import { BATTALION_SCOPED_SECTIONS } from "@/lib/auth/battalion-scope";
import type { AppUser } from "@/lib/types";

export interface NavLink {
  href: string;
  label: string;
}

/** Every section of the app, in display order. */
export const NAV_LINKS: NavLink[] = [
  { href: "/calendar", label: "לוח שנה" },
  { href: "/trainings", label: "הדרכות" },
  { href: "/certifications", label: "הסמכות" },
  { href: "/requests", label: "דרישות גדודים" },
  { href: "/templates", label: "בנק הסמכות" },
  { href: "/battalions", label: "גדודים" },
  { href: "/reports", label: "דוחות" },
];

export const ADMIN_LINK: NavLink = { href: "/admin/permissions", label: "ניהול הרשאות" };

/**
 * The tabs a user may see, derived from their AUTHENTICATED database row.
 *
 * Resolved on the server and passed down as props: the navigation must never be built
 * from the `active_role` cookie (a UI view selector any client can set) nor from a
 * client-side fetch, which renders the full list until it resolves.
 *
 * Battalion-scoped roles get exactly their four sections; every other role keeps the
 * navigation it had before.
 */
export function navLinksFor(user: AppUser | null): NavLink[] {
  if (!user || user.status !== "approved") return [];
  if (isBattalionScoped(user)) {
    return NAV_LINKS.filter((link) => BATTALION_SCOPED_SECTIONS.includes(link.href));
  }
  if (isSuperAdmin(user)) return [...NAV_LINKS, ADMIN_LINK];
  return NAV_LINKS;
}
