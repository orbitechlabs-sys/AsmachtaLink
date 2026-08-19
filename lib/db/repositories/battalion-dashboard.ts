import { query, queryOne, execute } from "@/lib/db/client";
import { ACTIVE_ROSTER_STATUSES } from "@/lib/utils/slots";
import {
  daysUntil,
  openAllocationsOf,
  remainingAllocatedSlots,
} from "@/lib/battalions/open-allocations";
import type { CertificationStatus } from "@/lib/types";
import type {
  AdminConfirmationRow,
  AllocationSoldier,
  BattalionAllocation,
  BattalionTask,
  QuarterKpi,
} from "@/lib/battalions/types";

export type {
  AdminConfirmationRow,
  AllocationSoldier,
  BattalionAllocation,
  BattalionTask,
  QuarterKpi,
} from "@/lib/battalions/types";
export { openAllocationsOf } from "@/lib/battalions/open-allocations";

const COUNTED_STATUSES = ACTIVE_ROSTER_STATUSES;

/**
 * Every certification this battalion has a quota on, with its soldiers.
 *
 * `remaining` uses the same definition as `getBattalionSummary`: allocated minus
 * non-reserve soldiers in an active status. Filtering to "still open" is
 * {@link isOpenAllocation} — call that rather than reimplementing it.
 */
export async function listBattalionAllocations(
  battalionId: number
): Promise<BattalionAllocation[]> {
  const rows = await query<{
    certification_id: number;
    name: string;
    location: string | null;
    start_date: string;
    end_date: string | null;
    status: CertificationStatus;
    color_hex: string | null;
    allocated_slots: number;
    registration_lock_at: string | null;
    registered: number;
    reserve: number;
  }>(
    `SELECT c.id AS certification_id, c.name, c.location, c.start_date, c.end_date, c.status,
            c.color_hex, q.allocated_slots, q.registration_lock_at,
            (SELECT COUNT(*)::int FROM roster_entries re
              WHERE re.certification_id = c.id AND re.battalion_id = $1
                AND re.is_reserve = 0 AND re.status = ANY($2::text[])) AS registered,
            (SELECT COUNT(*)::int FROM roster_entries re
              WHERE re.certification_id = c.id AND re.battalion_id = $1
                AND re.is_reserve = 1) AS reserve
       FROM certifications c
       JOIN certification_battalion_quotas q
         ON q.certification_id = c.id AND q.battalion_id = $1
      WHERE c.status != 'cancelled'
      ORDER BY c.start_date ASC, c.id ASC`,
    [battalionId, COUNTED_STATUSES]
  );

  const soldiers = await query<AllocationSoldier & { certification_id: number }>(
    `SELECT re.id, re.certification_id, re.full_name, re.personal_number, re.company_platoon,
            re.phone, re.is_reserve, re.status, re.meets_prerequisite
       FROM roster_entries re
      WHERE re.battalion_id = $1 AND re.certification_id IS NOT NULL
      ORDER BY re.is_reserve ASC, re.created_at ASC, re.id ASC`,
    [battalionId]
  );

  const byCert = new Map<number, AllocationSoldier[]>();
  for (const s of soldiers) {
    const list = byCert.get(s.certification_id) ?? [];
    list.push(s);
    byCert.set(s.certification_id, list);
  }

  return rows.map((r) => {
    const remaining = remainingAllocatedSlots(r.allocated_slots, r.registered);
    return {
      ...r,
      remaining,
      daysToClose: daysUntil(r.registration_lock_at),
      soldiers: byCert.get(r.certification_id) ?? [],
    };
  });
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
