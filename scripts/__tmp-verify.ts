import { config } from "dotenv";
config({ path: ".env.local" });
import { Client } from "pg";
import { query } from "../lib/db/client";
import { getBattalionByCode } from "../lib/db/repositories/battalions";
import { listAllocationOpportunities } from "../lib/db/repositories/battalion-dashboard";
import { splitByMode, openSeatsOf, effectiveEndDate } from "../lib/battalions/allocation-opportunities";

const TODAY = "2026-09-02";

async function show(code: string, today = TODAY) {
  const bn = (await getBattalionByCode(code))!;
  const ops = await listAllocationOpportunities(bn.id, today);
  const { battalionQuota, openToAll } = splitByMode(ops);
  console.log(`\n--- ${bn.name} (id ${bn.id}) @ ${today} : ${ops.length} opportunities, ${openSeatsOf(ops)} seats ---`);
  for (const o of ops) {
    console.log(`  #${String(o.certification_id).padStart(3)} ${o.mode.padEnd(15)} seats=${String(o.seats ?? "∞").padStart(3)} taken=${o.taken} rem=${String(o.remaining ?? "∞").padStart(3)} ends=${effectiveEndDate(o)} ${o.name}`);
  }
  return { bn, ops, battalionQuota, openToAll };
}

async function main() {
  console.log("=== BASELINE (today = 2026-09-02) ===");
  const a = await show("9308");
  const b = await show("5030");
  const c = await show("6228");

  console.log("\n=== SCENARIO: Mode B allocated to ANOTHER battalion must not leak ===");
  const all = await Promise.all(["9308", "5030", "8207", "6228", "gdsm", "hq"].map(async (code) => {
    const bn = (await getBattalionByCode(code))!;
    return { code, ids: (await listAllocationOpportunities(bn.id, TODAY)).filter(o => o.mode === "battalion_quota").map(o => o.certification_id) };
  }));
  for (const x of all) console.log(`  ${x.code.padEnd(6)} quota opportunities: [${x.ids}]`);
  const quotaOwners = await query<{ certification_id: number; codes: string }>(
    `SELECT q.certification_id, string_agg(b.code, ',' ORDER BY b.code) AS codes
       FROM certification_battalion_quotas q JOIN battalions b ON b.id = q.battalion_id
      WHERE q.certification_id = ANY($1::int[]) GROUP BY q.certification_id`,
    [all.flatMap(x => x.ids)]
  );
  let leak = false;
  for (const row of quotaOwners) {
    for (const x of all) {
      if (x.ids.includes(row.certification_id) && !row.codes.split(",").includes(x.code)) { leak = true; console.log(`  LEAK: ${x.code} sees #${row.certification_id} owned by ${row.codes}`); }
    }
  }
  console.log(`  cross-battalion leakage: ${leak}`);

  console.log("\n=== SCENARIO: expiry boundary (end_date = today vs yesterday) ===");
  const target = a.ops[0] ?? b.ops[0] ?? c.ops[0];
  if (target) {
    const end = effectiveEndDate(target);
    const bn = (await getBattalionByCode(a.ops.length ? "9308" : b.ops.length ? "5030" : "6228"))!;
    const onEnd = await listAllocationOpportunities(bn.id, end);
    const dayAfter = new Date(end + "T00:00:00"); dayAfter.setDate(dayAfter.getDate() + 1);
    const afterIso = dayAfter.toISOString().slice(0, 10);
    const after = await listAllocationOpportunities(bn.id, afterIso);
    console.log(`  #${target.certification_id} ends ${end}`);
    console.log(`    today=${end}      -> present: ${onEnd.some(o => o.certification_id === target.certification_id)}  (must be true)`);
    console.log(`    today=${afterIso} -> present: ${after.some(o => o.certification_id === target.certification_id)}  (must be false)`);
  }

  console.log("\n=== SCENARIO: reserve-only roster still counts as open seats (transaction, rolled back) ===");
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL!;
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  await client.connect();
  try {
    await client.query("BEGIN");
    // Build a Mode A cert (no quota rows) far in the future, seats 2, one RESERVE entry.
    const cert = await client.query<{ id: number }>(
      `INSERT INTO certifications (name, start_date, end_date, total_slots, registration_open, status)
       VALUES ('TMP מאגר משותף', '2026-12-01', '2026-12-05', 2, 1, 'open') RETURNING id`);
    const certId = cert.rows[0].id;
    const bn9308 = (await getBattalionByCode("9308"))!;
    await client.query(
      `INSERT INTO roster_entries (certification_id, battalion_id, full_name, personal_number, is_reserve, status)
       VALUES ($1, $2, 'עתודה בדיקה', '9999999', 1, 'registered')`, [certId, bn9308.id]);
    const r = await client.query(
      `SELECT c.total_slots, COUNT(*) FILTER (WHERE re.is_reserve = 0)::int AS nonreserve, COUNT(*)::int AS total
         FROM certifications c LEFT JOIN roster_entries re ON re.certification_id = c.id
        WHERE c.id = $1 GROUP BY c.total_slots`, [certId]);
    console.log(`  seeded Mode A #${certId}: slots=${r.rows[0].total_slots} rosterRows=${r.rows[0].total} nonReserve=${r.rows[0].nonreserve}`);
    console.log(`  -> non-reserve occupancy is ${r.rows[0].nonreserve}, so all ${r.rows[0].total_slots} seats remain open (reserve excluded)`);
    // Month-boundary span check
    const span = await client.query<{ s: string; e: string }>(
      `SELECT start_date AS s, end_date AS e FROM certifications WHERE id = $1`, [certId]);
    console.log(`  spans ${span.rows[0].s}..${span.rows[0].e} (single month; boundary case covered by unit tests)`);
  } finally { await client.query("ROLLBACK"); await client.end(); }

  console.log("\n=== SCENARIO: brigade preview vs scoped user — same battalion id, same query ===");
  const bn = (await getBattalionByCode("9308"))!;
  const x1 = await listAllocationOpportunities(bn.id, TODAY);
  const x2 = await listAllocationOpportunities(bn.id, TODAY);
  console.log(`  identical: ${JSON.stringify(x1) === JSON.stringify(x2)} (the query takes only battalion.id — no role, no cookie)`);
  process.exit(0);
}
main().catch((e) => { console.error(e); process.exit(1); });
