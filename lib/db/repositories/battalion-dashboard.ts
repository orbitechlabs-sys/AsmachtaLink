import { query, queryOne, execute } from "@/lib/db/client";
import { ACTIVE_ROSTER_STATUSES } from "@/lib/utils/slots";
import {
  daysUntil,
  openAllocationsOf,
  remainingAllocatedSlots,
} from "@/lib/battalions/open-allocations";
import { computeSlotsRemaining } from "@/lib/utils/slots";
import { isRegistrationLocked } from "@/lib/utils/registration-lock";
import type { CertificationStatus } from "@/lib/types";
import type {
  AdminConfirmationRow,
  AllocationSoldier,
  BattalionActionItems,
  BattalionAllocation,
  BattalionTask,
  OpenToAllCertification,
  QuarterKpi,
} from "@/lib/battalions/types";

export type {
  AdminConfirmationRow,
  AllocationSoldier,
  BattalionActionItems,
  BattalionAllocation,
  BattalionTask,
  OpenToAllCertification,
  QuarterKpi,
} from "@/lib/battalions/types";
export { openAllocationsOf } from "@/lib/battalions/open-allocations";

const COUNTED_STATUSES = ACTIVE_ROSTER_STATUSES;

/**
 * Every certification this battalion has a STAKE in, with its soldiers.
 *
 * A stake is either side of the relationship, and it has to be either side:
 *   (a) the brigade allocated the battalion slots  (certification_battalion_quotas), or
 *   (b) the battalion has a soldier on the roster  (roster_entries).
 *
 * This used to be an INNER JOIN on the quota table, which silently dropped every
 * certification a battalion had soldiers on without a quota row. The mirror-image bug is
 * the one that actually bit: a brigade user opens a certification and allocates the
 * battalion slots but assigns nobody yet — the battalion has a real stake in that week and
 * saw nothing. Both directions are now covered by one LEFT JOIN pair plus an OR.
 *
 * DEDUPLICATION IS STRUCTURAL, not a DISTINCT: the quota join is on
 * (certification_id, battalion_id) and the roster side is pre-aggregated to one row per
 * certification, so neither can fan the certification out. A UNION would have needed a
 * DISTINCT and would have run the scan twice.
 *
 * NO N+1: the roster counts come from ONE grouped subquery over this battalion's rows, not
 * a correlated count per certification and not a query per row.
 *
 * `remaining` uses the same definition as `getBattalionSummary`: allocated minus
 * non-reserve soldiers in an active status, and null when there is no allocation to
 * subtract from. Filtering to "still open" is {@link isOpenAllocation} — call that rather
 * than reimplementing it.
 */
/** Inclusive 'yyyy-MM-dd' bounds. */
export interface DateRange {
  from: string;
  to: string;
}

export async function listBattalionAllocations(
  battalionId: number,
  range?: DateRange
): Promise<BattalionAllocation[]> {
  const rows = await query<{
    certification_id: number;
    name: string;
    location: string | null;
    start_date: string;
    end_date: string | null;
    status: CertificationStatus;
    color_hex: string | null;
    allocated_slots: number | null;
    registration_lock_date: string | null;
    registration_lock_hour: number | null;
    has_quota: boolean;
    has_roster: boolean;
    registered: number;
    reserve: number;
  }>(
    `SELECT c.id AS certification_id, c.name, c.location, c.start_date, c.end_date, c.status,
            c.color_hex, q.allocated_slots, c.registration_lock_date, c.registration_lock_hour,
            (q.certification_id IS NOT NULL) AS has_quota,
            (r.certification_id IS NOT NULL) AS has_roster,
            COALESCE(r.registered, 0) AS registered,
            COALESCE(r.reserve, 0) AS reserve
       FROM certifications c
       LEFT JOIN certification_battalion_quotas q
         ON q.certification_id = c.id AND q.battalion_id = $1
       LEFT JOIN (
         -- One pass over this battalion's roster rows, grouped. has_roster is the mere
         -- EXISTENCE of a row and is deliberately NOT (registered > 0): a battalion whose
         -- only soldier is on the reserve list, or was rejected, still has a stake worth
         -- showing.
         SELECT re.certification_id,
                COUNT(*) FILTER (
                  WHERE re.is_reserve = 0 AND re.status = ANY($2::text[])
                )::int AS registered,
                COUNT(*) FILTER (WHERE re.is_reserve = 1)::int AS reserve
           FROM roster_entries re
          WHERE re.battalion_id = $1 AND re.certification_id IS NOT NULL
          GROUP BY re.certification_id
       ) r ON r.certification_id = c.id
      WHERE c.status != 'cancelled'
        AND (q.certification_id IS NOT NULL OR r.certification_id IS NOT NULL)
        -- Overlap, not containment: a certification running Sun–Thu belongs to the week
        -- even if it started the previous one. A missing/empty end_date is a single-day
        -- cycle, so it falls back to start_date.
        -- Dates are TEXT 'yyyy-MM-dd', which sorts lexicographically, so these compare
        -- correctly without any parsing or timezone conversion.
        AND ($3::text IS NULL OR (
              c.start_date <= $4::text
          AND COALESCE(NULLIF(c.end_date, ''), c.start_date) >= $3::text
        ))
      ORDER BY c.start_date ASC, c.id ASC`,
    [battalionId, COUNTED_STATUSES, range?.from ?? null, range?.to ?? null]
  );

  // Scoped to the certifications just returned, so a one-week export does not pull every
  // soldier the battalion has ever registered. Still one query, not one per certification.
  const certIds = rows.map((r) => r.certification_id);
  const soldiers = certIds.length
    ? await query<AllocationSoldier & { certification_id: number }>(
        `SELECT re.id, re.certification_id, re.full_name, re.personal_number, re.company_platoon,
                re.phone, re.is_reserve, re.status, re.meets_prerequisite
           FROM roster_entries re
          WHERE re.battalion_id = $1 AND re.certification_id = ANY($2::int[])
          ORDER BY re.is_reserve ASC, re.created_at ASC, re.id ASC`,
        [battalionId, certIds]
      )
    : [];

  const byCert = new Map<number, AllocationSoldier[]>();
  for (const s of soldiers) {
    const list = byCert.get(s.certification_id) ?? [];
    list.push(s);
    byCert.set(s.certification_id, list);
  }

  return rows.map((r) => ({
    ...r,
    // null, not 0: "no allocation" and "an allocation with nothing left" are different
    // states, and a 0 here would make a roster-only certification look full.
    remaining: remainingAllocatedSlots(r.allocated_slots, r.registered),
    daysToClose: daysUntil(r.registration_lock_date),
    soldiers: byCert.get(r.certification_id) ?? [],
  }));
}

/**
 * The status that means "פתוחה להרשמה". Group B is specifically the registration WINDOW
 * being open, so it is this one status and not {@link OPEN_ALLOCATION_STATUSES}: `full`
 * has no seats left to offer and `in_progress` has already started.
 */
const REGISTRATION_OPEN_STATUS = "open";

/**
 * Everything the dashboard band asks a battalion to act on, in BOTH of its forms.
 *
 * GROUP A — seats allocated to this battalion, still unnamed. Derived from the
 * `allocations` the caller already fetched, through the very same `openAllocationsOf()`
 * the KPI card and the `slot` open-task read. That is the point of taking the array as an
 * argument rather than re-querying: three surfaces that must never disagree about whether
 * a certification still owes names now cannot, and the band costs no extra round trip.
 * `listBattalionTasks` above takes its allocations the same way.
 *
 * GROUP B — certifications open to EVERY battalion that this one has not touched. One
 * query, listed below. It cannot overlap Group A: Group A requires a quota row and Group B
 * requires that no quota row exists for the certification at all, so the band is
 * deduplicated structurally rather than by a post-pass. The explicit id check at the end is
 * a belt-and-braces guard, not the mechanism.
 *
 * NO N+1: one statement for Group B, none for Group A. The certification-wide registration
 * count comes from a single pre-grouped subquery, not a correlated count per row.
 *
 * THE LOCK IS APPLIED IN TYPESCRIPT, ON PURPOSE. `isRegistrationLocked()` resolves the
 * stored date+hour against Asia/Jerusalem's offset ON THAT DATE, which is DST-correct and
 * is the single definition every write path already enforces. Re-expressing it as SQL would
 * be a second, silently diverging lock concept — exactly what must not exist. The row count
 * here is small (open certifications with no quotas), so filtering in memory costs nothing.
 */
export async function listBattalionActionItems(
  battalionId: number,
  allocations: BattalionAllocation[],
  now: Date = new Date()
): Promise<BattalionActionItems> {
  const awaitingNames = openAllocationsOf(allocations);

  const rows = await query<{
    certification_id: number;
    name: string;
    location: string | null;
    start_date: string;
    end_date: string | null;
    status: CertificationStatus;
    color_hex: string | null;
    total_slots: number | null;
    registration_lock_date: string | null;
    registration_lock_hour: number | null;
    registered_total: number;
  }>(
    `SELECT c.id AS certification_id, c.name, c.location, c.start_date, c.end_date, c.status,
            c.color_hex, c.total_slots, c.registration_lock_date, c.registration_lock_hour,
            COALESCE(reg.registered_total, 0) AS registered_total
       FROM certifications c
       LEFT JOIN (
         -- Certification-wide, NOT per battalion: an open-to-all cycle's capacity is shared,
         -- so the seats left over are what every unit is competing for.
         SELECT re.certification_id,
                COUNT(*) FILTER (
                  WHERE re.is_reserve = 0 AND re.status = ANY($2::text[])
                )::int AS registered_total
           FROM roster_entries re
          WHERE re.certification_id IS NOT NULL
          GROUP BY re.certification_id
       ) reg ON reg.certification_id = c.id
      WHERE c.status = $3::text
        -- "Open to all battalions" is the ABSENCE of any allocation: the moment the brigade
        -- gives even one unit a quota the cycle stops being everybody's.
        AND NOT EXISTS (
          SELECT 1 FROM certification_battalion_quotas q WHERE q.certification_id = c.id
        )
        -- Any row at all, reserve and inactive included: this battalion has already engaged
        -- with the certification, so the band has nothing left to prompt it about.
        AND NOT EXISTS (
          SELECT 1 FROM roster_entries re
           WHERE re.certification_id = c.id AND re.battalion_id = $1
        )
        -- NULL capacity is UNLIMITED and must survive this filter; it is never 0 and never a
        -- sentinel. A finite capacity has to have a seat actually left.
        AND (c.total_slots IS NULL OR c.total_slots > COALESCE(reg.registered_total, 0))
      ORDER BY c.start_date ASC, c.id ASC`,
    [battalionId, COUNTED_STATUSES, REGISTRATION_OPEN_STATUS]
  );

  const allocatedIds = new Set(awaitingNames.map((a) => a.certification_id));
  const openToAll: OpenToAllCertification[] = rows
    .filter((r) => !isRegistrationLocked(r, now) && !allocatedIds.has(r.certification_id))
    .map((r) => ({
      ...r,
      // NULL propagates as "unlimited" rather than collapsing to a number the band would
      // then add into a free-seat total that does not exist.
      remaining: computeSlotsRemaining(r.total_slots, r.registered_total),
      daysToClose: daysUntil(r.registration_lock_date, now),
    }));

  return { awaitingNames, openToAll };
}

/** `status='passed'` whose certification ended in the current quarter. */
export async function getQuarterCompletion(battalionId: number): Promise<QuarterKpi> {
  const row = await queryOne<QuarterKpi>(
    `SELECT
       COUNT(*) FILTER (WHERE re.status = 'passed')::int AS passed,
       COUNT(*) FILTER (WHERE re.status = ANY($2::text[]))::int AS registered
       FROM roster_entries re
       JOIN certifications c ON c.id = re.certification_id
      WHERE re.battalion_id = $1 AND re.is_reserve = 0
        AND date_trunc('quarter', COALESCE(NULLIF(c.end_date, '')::date, c.start_date::date))
            = date_trunc('quarter', CURRENT_DATE)`,
    [battalionId, COUNTED_STATUSES]
  );
  return row ?? { passed: 0, registered: 0 };
}

export async function listAdminConfirmations(
  battalionId: number
): Promise<AdminConfirmationRow[]> {
  return query<AdminConfirmationRow>(
    `SELECT re.id AS roster_entry_id, re.full_name, re.personal_number,
            c.id AS certification_id, c.name AS certification_name, c.end_date,
            GREATEST(
              (CURRENT_DATE - COALESCE(NULLIF(c.end_date, '')::date, CURRENT_DATE)),
              0
            )::int AS waiting_days,
            rac.confirmed_at::text AS confirmed_at
       FROM roster_entries re
       JOIN certifications c ON c.id = re.certification_id
       LEFT JOIN roster_admin_confirmations rac ON rac.roster_entry_id = re.id
      WHERE re.battalion_id = $1 AND re.status = 'passed' AND re.is_reserve = 0
      ORDER BY (rac.confirmed_at IS NOT NULL), waiting_days DESC, re.id`,
    [battalionId]
  );
}

export async function confirmAdmin(rosterEntryId: number, confirmedByRole: string): Promise<void> {
  await execute(
    `INSERT INTO roster_admin_confirmations (roster_entry_id, confirmed_by_role)
     VALUES ($1, $2)
     ON CONFLICT (roster_entry_id) DO NOTHING`,
    [rosterEntryId, confirmedByRole]
  );
}

export async function undoAdminConfirmation(rosterEntryId: number): Promise<void> {
  await execute(`DELETE FROM roster_admin_confirmations WHERE roster_entry_id = $1`, [
    rosterEntryId,
  ]);
}

/**
 * Battalion open-tasks. `slot` counts come from {@link openAllocationsOf} so they match
 * the green square. Navigation only — nothing here writes.
 */
export async function listBattalionTasks(
  battalionId: number,
  allocations: BattalionAllocation[],
  pendingIdentity: number
): Promise<BattalionTask[]> {
  const tasks: BattalionTask[] = [];

  for (const a of openAllocationsOf(allocations)) {
    tasks.push({
      kind: "slot",
      certification_id: a.certification_id,
      days: a.daysToClose,
      count: a.remaining,
      text:
        a.registered === 0
          ? `${a.remaining} מקומות פנויים ב${a.name} — לא שובץ אף חייל`
          : `השלמת ${a.remaining} הקצאות פתוחות ל${a.name}`,
      sub: `${fmtDate(a.start_date)}${a.location ? ` · ${a.location}` : ""} · מולאו ${a.registered} מתוך ${a.allocated_slots}`,
    });
  }

  const pendingAdmin = await query<{
    certification_id: number;
    certification_name: string;
    n: number;
    oldest: number;
  }>(
    `SELECT c.id AS certification_id, c.name AS certification_name, COUNT(*)::int AS n,
            MAX(GREATEST((CURRENT_DATE - COALESCE(NULLIF(c.end_date, '')::date, CURRENT_DATE)), 0))::int AS oldest
       FROM roster_entries re
       JOIN certifications c ON c.id = re.certification_id
       LEFT JOIN roster_admin_confirmations rac ON rac.roster_entry_id = re.id
      WHERE re.battalion_id = $1 AND re.status = 'passed' AND re.is_reserve = 0
        AND rac.id IS NULL
      GROUP BY c.id, c.name`,
    [battalionId]
  );
  for (const row of pendingAdmin) {
    tasks.push({
      kind: "adm",
      certification_id: row.certification_id,
      days: row.oldest,
      count: row.n,
      text: `אישור שלישותי של ${row.n} חיילים מ${row.certification_name}`,
      sub: `ממתינים עד ${row.oldest} יום`,
    });
  }

  const prereq = await query<{
    certification_id: number;
    certification_name: string;
    n: number;
    start_date: string;
  }>(
    `SELECT c.id AS certification_id, c.name AS certification_name, COUNT(*)::int AS n, c.start_date
       FROM roster_entries re
       JOIN certifications c ON c.id = re.certification_id
      WHERE re.battalion_id = $1 AND re.is_reserve = 0
        AND re.meets_prerequisite IS NULL
        AND (
          EXISTS (SELECT 1 FROM certification_prerequisites p WHERE p.certification_id = c.id)
          OR EXISTS (
            SELECT 1 FROM certification_prerequisites p
             WHERE p.template_id = c.template_id AND c.template_id IS NOT NULL
          )
        )
      GROUP BY c.id, c.name, c.start_date`,
    [battalionId]
  );
  for (const row of prereq) {
    tasks.push({
      kind: "prq",
      certification_id: row.certification_id,
      days: daysUntil(row.start_date),
      count: row.n,
      text: `סימון דרישות מעבר ל-${row.n} חיילים ב${row.certification_name}`,
      sub: "דרישת מעבר לא סומנה",
    });
  }

  const docs = await query<{
    certification_id: number;
    certification_name: string;
    doc_type: string;
    n: number;
    start_date: string;
  }>(
    `SELECT c.id AS certification_id, c.name AS certification_name, crd.doc_type,
            COUNT(*)::int AS n, c.start_date
       FROM roster_entries re
       JOIN certifications c ON c.id = re.certification_id
       JOIN certification_required_documents crd ON crd.template_id = c.template_id
       LEFT JOIN roster_required_documents rrd
         ON rrd.roster_entry_id = re.id AND rrd.doc_type = crd.doc_type
      WHERE re.battalion_id = $1 AND re.is_reserve = 0
        AND c.template_id IS NOT NULL
        AND COALESCE(rrd.is_provided, 0) = 0
      GROUP BY c.id, c.name, crd.doc_type, c.start_date`,
    [battalionId]
  );
  for (const row of docs) {
    tasks.push({
      kind: "doc",
      certification_id: row.certification_id,
      days: daysUntil(row.start_date),
      count: row.n,
      text: `הוספת ${row.doc_type} ל-${row.n} חיילים ב${row.certification_name}`,
      sub: "מסמך חובה לפני תחילת ההסמכה",
    });
  }

  if (pendingIdentity > 0) {
    tasks.push({
      kind: "pn",
      certification_id: null,
      days: null,
      count: pendingIdentity,
      text: `${pendingIdentity} חיילים ממתינים למספר אישי`,
      sub: "נספרים במצבה, אך אינם ברי-שיבוץ להסמכה עד להשלמת הזהות",
    });
  }

  return tasks.sort((a, b) => (a.days ?? 999) - (b.days ?? 999) || b.count - a.count);
}

function fmtDate(iso: string): string {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}`;
}
