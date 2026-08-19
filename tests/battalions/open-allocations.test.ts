import { describe, expect, it } from "vitest";
import {
  compareOpenAllocations,
  isOpenAllocation,
  openAllocationsOf,
  remainingAllocatedSlots,
  urgencyBand,
} from "@/lib/battalions/open-allocations";

describe("open allocations (green square + slot tasks share this)", () => {
  it("remaining is allocated minus registered, floored at 0", () => {
    expect(remainingAllocatedSlots(8, 4)).toBe(4);
    expect(remainingAllocatedSlots(8, 8)).toBe(0);
    expect(remainingAllocatedSlots(8, 10)).toBe(0);
  });

  it("hides a fully named quota and a cancelled cycle", () => {
    expect(
      isOpenAllocation({ allocated_slots: 4, registered: 4, status: "open" })
    ).toBe(false);
    expect(
      isOpenAllocation({ allocated_slots: 4, registered: 1, status: "cancelled" })
    ).toBe(false);
    expect(
      isOpenAllocation({ allocated_slots: 4, registered: 1, status: "open" })
    ).toBe(true);
  });

  it("sorts urgent-first then by open seats", () => {
    const rows = [
      { daysToClose: 12, remaining: 6 },
      { daysToClose: 2, remaining: 1 },
      { daysToClose: 2, remaining: 5 },
    ];
    expect([...rows].sort(compareOpenAllocations).map((r) => r.remaining)).toEqual([5, 1, 6]);
  });

  it("urgency bands match the mockup", () => {
    expect(urgencyBand(3)).toBe("hot");
    expect(urgencyBand(9)).toBe("warm");
    expect(urgencyBand(20)).toBe("cool");
  });

  it("openAllocationsOf filters closed quotas then sorts like the square", () => {
    const rows = [
      { allocated_slots: 4, registered: 4, status: "open" as const, remaining: 0, daysToClose: 1 },
      { allocated_slots: 4, registered: 1, status: "open" as const, remaining: 3, daysToClose: 10 },
      { allocated_slots: 4, registered: 0, status: "open" as const, remaining: 4, daysToClose: 2 },
    ];
    expect(openAllocationsOf(rows).map((r) => r.remaining)).toEqual([4, 3]);
  });
});
