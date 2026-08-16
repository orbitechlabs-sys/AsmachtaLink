import { query } from "@/lib/db/client";

// Every function here takes an optional `battalionId`. It is supplied only for the two
// battalion-scoped roles (see getBattalionScope); when it is undefined the query is the
// original unfiltered one, so global roles keep their system-wide reports untouched.

/**
 * A certification "belongs" to a battalion when it has one of its soldiers on the roster,
 * or an allocation for it, or it is open to everyone — the same rule `listCertifications`
 * applies for its `battalionCode` filter, so the reports agree with the calendar.
 *
 * `$1` must be the battalion id.
 */
const CERT_BELONGS_TO_BATTALION = `(
  EXISTS (SELECT 1 FROM roster_entries re WHERE re.certification_id = c.id AND re.battalion_id = $1)
  OR EXISTS (SELECT 1 FROM certification_battalion_quotas q WHERE q.certification_id = c.id AND q.battalion_id = $1)
  OR c.registration_open = 1
)`;

/** `WHERE`/`AND` fragment plus params, empty when unscoped. */
function certScope(battalionId?: number): { clause: string; params: number[] } {
  return battalionId === undefined
    ? { clause: "", params: [] }
    : { clause: ` AND ${CERT_BELONGS_TO_BATTALION}`, params: [battalionId] };
}

export async function certificationsByMonth(battalionId?: number) {
  const { clause, params } = certScope(battalionId);
  return query(
    `SELECT TO_CHAR(c.start_date::date, 'YYYY-MM') as month, COUNT(*)::int as count
       FROM certifications c WHERE c.status != 'cancelled'${clause}
      GROUP BY month ORDER BY month`,
    params
  );
}

/**
 * Columns for the scoped variants. The full row (`c.*`) carries free text that can name
 * other units — `notes` ("גדוד 6228: 2 מקומות בעתודה"), `created_by_role`
 * (`battalion:9308`), `origin_request_id` — and the report renders none of it. Global
 * roles keep receiving `c.*` so their reports and Excel exports are byte-for-byte
 * unchanged.
 */
const REPORT_CERT_COLUMNS = "c.id, c.name, c.location, c.start_date, c.end_date, c.status";

export async function openForRegistration(battalionId?: number) {
  const { clause, params } = certScope(battalionId);
  const columns = battalionId === undefined ? "c.*" : REPORT_CERT_COLUMNS;
  return query(
    `SELECT ${columns} FROM certifications c WHERE c.status = 'open'${clause} ORDER BY c.start_date`,
    params
  );
}

export async function completedCertifications(battalionId?: number) {
  const { clause, params } = certScope(battalionId);
  const columns = battalionId === undefined ? "c.*" : REPORT_CERT_COLUMNS;
  return query(
    `SELECT ${columns} FROM certifications c WHERE c.status = 'completed'${clause} ORDER BY c.start_date DESC`,
    params
  );
}

export async function openRequestsByBattalion(battalionId?: number) {
  const scoped = battalionId !== undefined;
  return query(
    `SELECT b.name as battalion_name, b.color_hex, COUNT(*)::int as count
       FROM battalion_requests r
       JOIN battalions b ON b.id = r.battalion_id
       WHERE r.status NOT IN ('closed', 'rejected')${scoped ? " AND b.id = $1" : ""}
       GROUP BY b.id ORDER BY b.name`,
    scoped ? [battalionId] : []
  );
}

export async function gapsByBattalion(battalionId?: number) {
  const scoped = battalionId !== undefined;
  return query(
    `SELECT b.name as battalion_name, b.color_hex,
              SUM(r.quantity_needed)::int as total_requested,
              (SELECT COUNT(*)::int FROM roster_entries re
               WHERE re.battalion_id = b.id AND re.certification_id IS NOT NULL
                 AND re.status IN ('approved','participated','passed')) as fulfilled
       FROM battalion_requests r
       JOIN battalions b ON b.id = r.battalion_id
       WHERE r.status != 'closed'${scoped ? " AND b.id = $1" : ""}
       GROUP BY b.id ORDER BY b.name`,
    scoped ? [battalionId] : []
  );
}

export async function rosterCounts(battalionId?: number) {
  // Scoped: only the certifications that are theirs, and only their own soldiers counted
  // in `registered_count` — the headline number must not include other battalions.
  const { clause, params } = certScope(battalionId);
  const joinScope = battalionId === undefined ? "" : " AND re.battalion_id = $1";
  return query(
    `SELECT c.id, c.name, c.location, c.start_date, COUNT(re.id)::int as registered_count
       FROM certifications c
       LEFT JOIN roster_entries re ON re.certification_id = c.id${joinScope}
       WHERE c.status != 'cancelled'${clause}
       GROUP BY c.id ORDER BY c.start_date DESC`,
    params
  );
}
