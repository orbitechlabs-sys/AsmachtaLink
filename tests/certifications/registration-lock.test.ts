import { describe, it, expect } from "vitest";
import {
  isRegistrationLocked,
  todayIsoDate,
  formatLockDate,
  REGISTRATION_LOCKED_MESSAGE,
} from "@/lib/utils/registration-lock";

/**
 * The single registration deadline on a certification (migration 021).
 *
 * The boundary is the whole point of this suite. "נסגר ב-14" means the 14th is the last day
 * you may register, so off-by-one here does not look like a bug — it looks like the deadline
 * working, one day early, for everybody.
 */

describe("isRegistrationLocked — the boundary", () => {
  it("is open on the lock date itself", () => {
    // The deadline is a closing date, not a cutoff instant: the 14th is still yours.
    expect(isRegistrationLocked("2026-08-14", "2026-08-14")).toBe(false);
  });

  it("is closed the day after", () => {
    expect(isRegistrationLocked("2026-08-14", "2026-08-15")).toBe(true);
  });

  it("is open before", () => {
    expect(isRegistrationLocked("2026-08-14", "2026-08-13")).toBe(false);
  });

  it("treats no deadline as open, never as passed", () => {
    // A certification that was never given a deadline must not read as closed — that would
    // silently block registration on every certification with a NULL column.
    expect(isRegistrationLocked(null, "2026-08-15")).toBe(false);
    expect(isRegistrationLocked(undefined, "2026-08-15")).toBe(false);
    expect(isRegistrationLocked("", "2026-08-15")).toBe(false);
  });

  it("crosses month and year boundaries on text alone", () => {
    // Lexicographic ordering of zero-padded ISO dates IS chronological ordering, which is
    // why no parsing happens anywhere in the check.
    expect(isRegistrationLocked("2026-08-31", "2026-09-01")).toBe(true);
    expect(isRegistrationLocked("2026-12-31", "2027-01-01")).toBe(true);
    expect(isRegistrationLocked("2026-12-31", "2026-12-31")).toBe(false);
    expect(isRegistrationLocked("2026-09-01", "2026-08-31")).toBe(false);
  });
});

describe("todayIsoDate — the app's timezone, not the server's", () => {
  it("formats as yyyy-MM-dd", () => {
    expect(todayIsoDate()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("reports the Israeli calendar day, not the UTC one", () => {
    // 22:30 UTC on the 14th is already 01:30 on the 15th in Israel. Taking the UTC date here
    // would keep registration open for three extra hours every night.
    expect(todayIsoDate(new Date("2026-08-14T22:30:00Z"))).toBe("2026-08-15");
    // And the reverse direction: early-morning UTC is the same day in Israel.
    expect(todayIsoDate(new Date("2026-08-14T06:00:00Z"))).toBe("2026-08-14");
  });

  it("closes registration at Israeli midnight", () => {
    const lock = "2026-08-14";
    // 20:00 UTC = 23:00 Israel on the 14th — still open.
    expect(isRegistrationLocked(lock, todayIsoDate(new Date("2026-08-14T20:00:00Z")))).toBe(false);
    // 21:30 UTC = 00:30 Israel on the 15th — closed.
    expect(isRegistrationLocked(lock, todayIsoDate(new Date("2026-08-14T21:30:00Z")))).toBe(true);
  });
});

describe("display helpers", () => {
  it("formats a lock date for Hebrew UI", () => {
    expect(formatLockDate("2026-08-14")).toBe("14.08.2026");
  });

  it("returns null when there is no deadline, so callers can branch on it", () => {
    expect(formatLockDate(null)).toBeNull();
    expect(formatLockDate("")).toBeNull();
  });

  it("names the deadline, not a per-battalion allocation", () => {
    // One wording for every refusal path, and it must not imply the lock came from the
    // caller's own allocation — it is the certification's.
    expect(REGISTRATION_LOCKED_MESSAGE).toContain("ההרשמה להסמכה זו נסגרה");
    expect(REGISTRATION_LOCKED_MESSAGE).not.toContain("גדוד");
  });
});
