import type { CertificationStatus } from "@/lib/types";

/**
 * Allocations the green square and the `slot` open-task both read.
 *
 * One function, two call sites — so the square and the task list can never disagree
 * about whether a certification still has unnamed seats.
 */

export const OPEN_ALLOCATION_STATUSES: CertificationStatus[] = [
  "open",
  "full",
  "in_progress",
];

export interface AllocationFill {
  allocated_slots: number;
  /** Non-reserve soldiers occupying the allocation (status ≠ rejected / did_not_participate). */
  registered: number;
  status: CertificationStatus;
}

/** Seats still waiting for a name. Floored at 0. */
export function remainingAllocatedSlots(allocated: number, registered: number): number {
  return Math.max(allocated - registered, 0);
}

/** True when this battalion has a quota that is not yet fully named, on a live cycle. */
export function isOpenAllocation(row: AllocationFill): boolean {
  if (!OPEN_ALLOCATION_STATUSES.includes(row.status)) return false;
  if (row.allocated_slots <= 0) return false;
  return remainingAllocatedSlots(row.allocated_slots, row.registered) > 0;
}

export function daysUntil(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso) return null;
  const target = new Date(iso);
  if (Number.isNaN(target.getTime())) return null;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  return Math.round((end.getTime() - start.getTime()) / 86_400_000);
}

export type UrgencyBand = "hot" | "warm" | "cool";

export function urgencyBand(days: number | null): UrgencyBand {
  if (days === null) return "cool";
  if (days <= 5) return "hot";
  if (days <= 12) return "warm";
  return "cool";
}

/** Urgent first (fewest days to close), then most open seats. */
export function compareOpenAllocations<
  T extends { daysToClose: number | null; remaining: number },
>(a: T, b: T): number {
  const da = a.daysToClose ?? Number.POSITIVE_INFINITY;
  const db = b.daysToClose ?? Number.POSITIVE_INFINITY;
  if (da !== db) return da - db;
  return b.remaining - a.remaining;
}

/** Filter + sort used by both the green square and the `slot` open-task. */
export function openAllocationsOf<T extends AllocationFill & { remaining: number; daysToClose: number | null }>(
  rows: T[]
): T[] {
  return rows.filter(isOpenAllocation).sort(compareOpenAllocations);
}

