import { isBattalionScoped, isBrigade, isSuperAdmin } from "@/lib/auth/permissions";
import { BATTALION_SCOPED_SECTIONS } from "@/lib/auth/battalion-scope";
import type { AppUser, Role } from "@/lib/types";

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
  { href: "/force-structure", label: "שניים לפנים" },
  { href: "/gaps", label: "פערים" },
  { href: "/reports", label: "דוחות" },
];

export const ADMIN_LINK: NavLink = { href: "/admin/permissions", label: "ניהול הרשאות" };

/**
 * Tabs that only mean anything inside a single battalion's context.
 *
 * Both read the force structure and the gaps of one battalion and carry no battalion in
 * their URL, so a brigade-wide view of them does not exist (spec §0.2.1 — no comparative
 * view, no battalion picker). A global user reaches them by choosing a battalion in the
 * existing role switcher; a plain brigade view simply does not show them.
 */
export const BATTALION_ONLY_LINKS: string[] = ["/force-structure", "/gaps"];

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

/**
 * Presentation-only narrowing of {@link navLinksFor} by the active view.
 *
 * `navLinksFor` remains the security boundary — it reads the authenticated row and is
 * the thing that decides what a user may see at all. This only hides the two
 * battalion-only tabs from a global user who has not selected a battalion, because
 * without one there is nothing for those screens to show. It can only ever remove links
 * from that result, never add any, so the cookie cannot widen anybody's navigation.
 */
export function navLinksForView(user: AppUser | null, role: Role): NavLink[] {
  const links = navLinksFor(user);
  if (!isBrigade(role)) return links;
  return links.filter((link) => !BATTALION_ONLY_LINKS.includes(link.href));
}
