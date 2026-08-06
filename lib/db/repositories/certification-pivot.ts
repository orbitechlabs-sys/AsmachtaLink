import { query } from "@/lib/db/client";

/** One bar of the pivot chart: a battalion and how many of its soldiers appear on the
 * selected certifications. */
export interface BattalionSoldierCount {
  battalion_id: number;
  battalion_code: string;
  battalion_name: string;
  color_hex: string;
  soldier_count: number;
}

export interface PivotFilters {
  battalionIds: number[];
  certificationIds: number[];
  /** Inclusive lower bound on the certification's start date (yyyy-MM-dd). */
  fromDate: string;
  /** Inclusive upper bound on the certification's start date. null = open-ended. */
  toDate?: string | null;
}

/**
 * Per-battalion soldier counts across the selected certifications.
 *
 * Counting rule: EVERY roster entry is counted regardless of its state (registered /
 * passed / failed / reserve …) — the only filters are the selected certifications, the
 * selected battalions, and the certification's start date falling inside the range.
 *
 * Driven off `battalions` with a LEFT JOIN so a selected battalion with no soldiers
 * still comes back with 0 (one bar per selected battalion, always).
 */
export async function countSoldiersByBattalion(
  filters: PivotFilters
): Promise<BattalionSoldierCount[]> {
  return query<BattalionSoldierCount>(
    `SELECT b.id AS battalion_id,
            b.code AS battalion_code,
            b.name AS battalion_name,
            b.color_hex,
            COALESCE(counted.soldier_count, 0)::int AS soldier_count
       FROM battalions b
       LEFT JOIN (
         SELECT re.battalion_id, COUNT(*)::int AS soldier_count
           FROM roster_entries re
           JOIN certifications c ON c.id = re.certification_id
          WHERE re.certification_id = ANY($2::int[])
            AND c.start_date::date >= $3::date
            AND ($4::date IS NULL OR c.start_date::date <= $4::date)
          GROUP BY re.battalion_id
       ) counted ON counted.battalion_id = b.id
      WHERE b.id = ANY($1::int[])
      ORDER BY b.code`,
    [filters.battalionIds, filters.certificationIds, filters.fromDate, filters.toDate ?? null]
  );
}

export interface PivotCertificationOption {
  id: number;
  name: string;
  start_date: string;
}

/** A תחום (domain) and the certifications inside it, for the widget's pickers. */
export interface PivotDomainOption {
  domain: string;
  certifications: PivotCertificationOption[];
}

/** Label for certifications with no domain set, so they are still selectable. */
export const NO_DOMAIN_LABEL = "ללא תחום";

/** Distinct values of `certifications.domain` — the תחום column. */
export async function listDomains(): Promise<string[]> {
  const rows = await query<{ domain: string }>(
    `SELECT DISTINCT TRIM(domain) AS domain
       FROM certifications
      WHERE domain IS NOT NULL AND TRIM(domain) <> ''
      ORDER BY domain`
  );
  return rows.map((r) => r.domain);
}

/** Every domain with its certifications (id + name), grouped for the pickers.
 * Certifications without a domain are grouped under NO_DOMAIN_LABEL rather than
 * dropped, so nothing is unreachable from the UI. */
export async function listDomainsWithCertifications(): Promise<PivotDomainOption[]> {
  const rows = await query<{ domain: string | null; id: number; name: string; start_date: string }>(
    `SELECT NULLIF(TRIM(c.domain), '') AS domain, c.id, c.name, c.start_date
       FROM certifications c
      ORDER BY domain NULLS LAST, c.start_date DESC, c.name`
  );

  const byDomain = new Map<string, PivotCertificationOption[]>();
  for (const row of rows) {
    const key = row.domain ?? NO_DOMAIN_LABEL;
    if (!byDomain.has(key)) byDomain.set(key, []);
    byDomain.get(key)!.push({ id: row.id, name: row.name, start_date: row.start_date });
  }
  return [...byDomain.entries()].map(([domain, certifications]) => ({ domain, certifications }));
}
