/**
 * The registration lock on a certification — one date for every battalion.
 *
 * `certifications.registration_lock_date` is TEXT 'yyyy-MM-dd'. Two decisions are worth
 * stating, because both are the kind that go wrong silently:
 *
 * 1. THE LOCK DATE IS ITSELF STILL OPEN. A deadline of the 14th means "through the 14th",
 *    which is how anyone reads a closing date; registration shuts at the end of that day.
 *    So the comparison is `today > lockDate`, not `>=`.
 *
 * 2. THE COMPARISON IS ON STRINGS, NOT Date OBJECTS. ISO dates sort lexicographically, so
 *    string comparison IS date comparison here, with no parsing and no timezone in the
 *    middle. `new Date('2026-08-24') < new Date()` would drag UTC into it and close
 *    registration a few hours early or late depending on where the server runs.
 */

/** Israel Standard/Daylight Time. The deadline is a wall-clock day for the units using it,
 * so "today" must be today in Israel, not today in whichever region the server sits. */
const APP_TIME_ZONE = "Asia/Jerusalem";

// en-CA formats as yyyy-MM-dd, which is exactly the storage format.
const isoDateInZone = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date as 'yyyy-MM-dd' in the app's timezone. */
export function todayIsoDate(now: Date = new Date()): string {
  return isoDateInZone.format(now);
}

/**
 * Whether registration is closed. `lockDate` null means no deadline was ever set, which is
 * "open" — the absence of a deadline must never read as a passed one.
 *
 * `today` is injectable so callers that already have a render-time date can stay pure and
 * hydration-stable, and so the suite can test a boundary without mocking the clock.
 */
export function isRegistrationLocked(
  lockDate: string | null | undefined,
  today: string = todayIsoDate()
): boolean {
  if (!lockDate) return false;
  return today > lockDate;
}

/** The Hebrew refusal shown wherever the lock blocks a write. One string, one wording. */
export const REGISTRATION_LOCKED_MESSAGE =
  "ההרשמה להסמכה זו נסגרה — חלף מועד נעילת ההרשמה.";

/** Formats a lock date for display, e.g. "24.08.2026". Returns null when there is none. */
export function formatLockDate(lockDate: string | null | undefined): string | null {
  if (!lockDate) return null;
  const [y, m, d] = lockDate.split("-");
  return `${d}.${m}.${y}`;
}
