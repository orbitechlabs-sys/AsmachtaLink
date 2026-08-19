import type { RosterStatus } from "@/lib/types";
import type { AllocationFill } from "@/lib/battalions/open-allocations";

/** Slots allocated to this battalion, or null when it has no allocation at all. */
export interface BattalionQuotaUsage {
  allocated: number | null;
  /** Non-reserve soldiers occupying the allocation. */
  used: number;
  /** Reserve soldiers — listed, never counted against the allocation. */
  reserve: number;
  /** allocated − used, floored at 0. null when there is no allocation. */
  remaining: number | null;
  registration_lock_at: string | null;
  /** True once the registration deadline on the allocation has passed. */
  locked: boolean;
}

export interface AllocationSoldier {
  id: number;
  full_name: string;
  personal_number: string;
  company_platoon: string | null;
  phone: string | null;
  is_reserve: number;
  status: RosterStatus;
  meets_prerequisite: number | null;
}

export interface BattalionAllocation extends AllocationFill {
  certification_id: number;
  name: string;
  location: string | null;
  start_date: string;
  end_date: string | null;
  color_hex: string | null;
  registration_lock_at: string | null;
  remaining: number;
  reserve: number;
  daysToClose: number | null;
  soldiers: AllocationSoldier[];
}

export interface QuarterKpi {
  passed: number;
  registered: number;
}

export interface AdminConfirmationRow {
  roster_entry_id: number;
  full_name: string;
  personal_number: string;
  certification_id: number;
  certification_name: string;
  end_date: string | null;
  waiting_days: number;
  confirmed_at: string | null;
}

export interface BattalionTask {
  kind: "doc" | "adm" | "slot" | "prq" | "pn";
  certification_id: number | null;
  days: number | null;
  text: string;
  sub: string;
  count: number;
}

/** The KPI slice the battalion dashboard reads. Kept here so the client never imports a
 * repository that pulls in `pg`. */
export interface BattalionDashboardKpis {
  gaps: { gap: number }[];
  totals: { remaining: number };
}
