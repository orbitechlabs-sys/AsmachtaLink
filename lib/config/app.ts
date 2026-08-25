/**
 * The system's name, in one place.
 *
 * Every header, page title and brand mark reads from here, so the next rename is a one-line
 * change instead of a grep across a dozen files — which is exactly how the previous name
 * ended up in seven `metadata.title` strings, two components and a mockup.
 *
 * NOT the place for infrastructure identifiers. The Supabase project ref, the Vercel
 * project, env var names, the `logo228.png` asset path, database tables and the migration
 * files all keep their existing names: renaming those buys nothing and breaks deploys.
 */

/** The Hebrew display name — what users see. */
export const APP_NAME = "שורש אלון";

/**
 * The English identifier, for code, docs and package metadata. Never rendered to users.
 * The npm-safe form is `shoresh-alon` (see package.json `name`, which must be lowercase
 * kebab-case); this PascalCase form is for prose and comments.
 */
export const APP_NAME_EN = "ShoreshAlon";

/**
 * The owning formation. KEPT alongside the name, and worth saying why: the brigade is not
 * decoration here — the logo asset is the 228 mark, every PDF/Excel export header carries
 * it, and the system serves one brigade's battalions. "שורש אלון" alone would read as a
 * product name detached from the unit it belongs to. Dropping it is a one-line change here
 * if that ever becomes the preference.
 */
export const BRIGADE_LABEL = "228";

/** The full brand line: "שורש אלון · 228". Used by the top nav and the auth card. */
export const APP_NAME_WITH_BRIGADE = `${APP_NAME} · ${BRIGADE_LABEL}`;

/**
 * A browser-tab title for one screen: `pageTitle("התחברות")` → "התחברות · שורש אלון".
 *
 * The separator is a middot with spaces, matching what the header uses. Called with no
 * argument it returns the bare brand line, so the root layout and a leaf route cannot
 * drift apart in formatting.
 */
export function pageTitle(screen?: string): string {
  return screen ? `${screen} · ${APP_NAME}` : APP_NAME_WITH_BRIGADE;
}
