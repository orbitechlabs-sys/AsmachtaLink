import { query } from "@/lib/db/client";

export async function certificationsByMonth() {
  return query(
    `SELECT TO_CHAR(start_date::date, 'YYYY-MM') as month, COUNT(*)::int as count
       FROM certifications WHERE status != 'cancelled' GROUP BY month ORDER BY month`
  );
}

export async function openForRegistration() {
  return query(`SELECT * FROM certifications WHERE status = 'open' ORDER BY start_date`);
}

export async function completedCertifications() {
  return query(`SELECT * FROM certifications WHERE status = 'completed' ORDER BY start_date DESC`);
}

export async function openRequestsByBattalion() {
  return query(
    `SELECT b.name as battalion_name, b.color_hex, COUNT(*)::int as count
       FROM battalion_requests r
       JOIN battalions b ON b.id = r.battalion_id
       WHERE r.status NOT IN ('closed', 'rejected')
       GROUP BY b.id ORDER BY b.name`
  );
}

export async function gapsByBattalion() {
  return query(
    `SELECT b.name as battalion_name, b.color_hex,
              SUM(r.quantity_needed)::int as total_requested,
              (SELECT COUNT(*)::int FROM roster_entries re
               WHERE re.battalion_id = b.id AND re.status IN ('approved','participated','passed')) as fulfilled
       FROM battalion_requests r
       JOIN battalions b ON b.id = r.battalion_id
       WHERE r.status != 'closed'
       GROUP BY b.id ORDER BY b.name`
  );
}

export async function rosterCounts() {
  return query(
    `SELECT c.id, c.name, c.location, c.start_date, COUNT(re.id)::int as registered_count
       FROM certifications c
       LEFT JOIN roster_entries re ON re.certification_id = c.id
       WHERE c.status != 'cancelled'
       GROUP BY c.id ORDER BY c.start_date DESC`
  );
}
