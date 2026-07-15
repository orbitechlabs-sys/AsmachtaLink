import { execute, query, queryOne, withTransaction } from "@/lib/db/client";
import type { RosterEntry, RosterStatus } from "@/lib/types";
import { recordStatusChange } from "@/lib/db/repositories/audit";
import { createNotification } from "@/lib/db/repositories/notifications";

export async function listRosterForCertification(certificationId: number): Promise<RosterEntry[]> {
  return query<RosterEntry>(
    "SELECT * FROM roster_entries WHERE certification_id = $1 AND is_reserve = 0 ORDER BY created_at ASC",
    [certificationId]
  );
}

export async function listReserveForCertification(certificationId: number): Promise<RosterEntry[]> {
  return query<RosterEntry>(
    "SELECT * FROM roster_entries WHERE certification_id = $1 AND is_reserve = 1 ORDER BY created_at ASC",
    [certificationId]
  );
}

export async function listRosterForBattalion(battalionId: number): Promise<RosterEntry[]> {
  return query<RosterEntry>("SELECT * FROM roster_entries WHERE battalion_id = $1 ORDER BY created_at DESC", [battalionId]);
}

export async function getRosterEntry(id: number): Promise<RosterEntry | undefined> {
  return queryOne<RosterEntry>("SELECT * FROM roster_entries WHERE id = $1", [id]);
}

export interface RosterEntryInput {
  certification_id: number;
  battalion_id: number;
  full_name: string;
  personal_number: string;
  company_platoon?: string | null;
  phone?: string | null;
  commander_name?: string | null;
  commander_phone?: string | null;
  has_prior_certification?: boolean;
  prior_certification_details?: string | null;
  meets_prerequisite?: boolean | null;
  notes?: string | null;
  is_reserve?: boolean;
}

export async function addRosterEntry(input: RosterEntryInput, changedByRole: string): Promise<number> {
  return withTransaction(async (client) => {
    const result = await execute(
      `INSERT INTO roster_entries
          (certification_id, battalion_id, full_name, personal_number, company_platoon, phone,
           commander_name, commander_phone, has_prior_certification, prior_certification_details,
           meets_prerequisite, notes, is_reserve)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         RETURNING id`,
      [
        input.certification_id,
        input.battalion_id,
        input.full_name,
        input.personal_number,
        input.company_platoon ?? null,
        input.phone ?? null,
        input.commander_name ?? null,
        input.commander_phone ?? null,
        input.has_prior_certification ? 1 : 0,
        input.prior_certification_details ?? null,
        input.meets_prerequisite === undefined || input.meets_prerequisite === null
          ? null
          : input.meets_prerequisite
          ? 1
          : 0,
        input.notes ?? null,
        input.is_reserve ? 1 : 0,
      ],
      client
    );
    const id = (result.rows[0] as { id: number }).id;
    await recordStatusChange("roster_entry", id, null, "registered", changedByRole, undefined, client);

    const cert = await queryOne<{ name: string }>(
      "SELECT name FROM certifications WHERE id = $1", [input.certification_id], client
    );
    await createNotification({
      type: "soldier_added",
      target_role: "brigade",
      entity_type: "roster_entry",
      entity_id: id,
      message: `${input.full_name} נרשם להסמכה "${cert?.name ?? ""}"`,
    }, client);
    return id;
  });
}

export async function updateRosterEntry(id: number, input: Partial<RosterEntryInput>) {
  const existing = await getRosterEntry(id);
  if (!existing) throw new Error("Roster entry not found");
  await execute(
    `UPDATE roster_entries SET
      battalion_id = $1, full_name = $2, personal_number = $3, company_platoon = $4, phone = $5,
      commander_name = $6, commander_phone = $7, has_prior_certification = $8,
      prior_certification_details = $9, meets_prerequisite = $10, notes = $11, is_reserve = $12,
      updated_at = NOW()
     WHERE id = $13`,
  [
    input.battalion_id ?? existing.battalion_id,
    input.full_name ?? existing.full_name,
    input.personal_number ?? existing.personal_number,
    input.company_platoon ?? existing.company_platoon,
    input.phone ?? existing.phone,
    input.commander_name ?? existing.commander_name,
    input.commander_phone ?? existing.commander_phone,
    input.has_prior_certification !== undefined
      ? input.has_prior_certification
        ? 1
        : 0
      : existing.has_prior_certification,
    input.prior_certification_details ?? existing.prior_certification_details,
    input.meets_prerequisite !== undefined
      ? input.meets_prerequisite === null
        ? null
        : input.meets_prerequisite
        ? 1
        : 0
      : existing.meets_prerequisite,
    input.notes ?? existing.notes,
    input.is_reserve !== undefined ? (input.is_reserve ? 1 : 0) : existing.is_reserve,
    id,
  ]);
}

export async function updateRosterStatus(
  id: number,
  newStatus: RosterStatus,
  changedByRole: string,
  note?: string,
  outcomeReason?: string
) {
  const existing = await getRosterEntry(id);
  if (!existing) throw new Error("Roster entry not found");

  await withTransaction(async (client) => {
    await execute(
      `UPDATE roster_entries SET status = $1, outcome_reason = $2, updated_at = NOW() WHERE id = $3`,
      [newStatus, outcomeReason ?? existing.outcome_reason, id],
      client
    );
    await recordStatusChange("roster_entry", id, existing.status, newStatus, changedByRole, note, client);

    if (newStatus === "approved" || newStatus === "rejected") {
      const battalion = await queryOne<{ code: string }>(
        "SELECT code FROM battalions WHERE id = $1", [existing.battalion_id], client
      );
      await createNotification({
        type: newStatus === "approved" ? "soldier_approved" : "soldier_rejected",
        target_role: `battalion:${battalion?.code ?? existing.battalion_id}`,
        entity_type: "roster_entry",
        entity_id: id,
        message: `${existing.full_name} ${newStatus === "approved" ? "אושר" : "נדחה"} להסמכה`,
      }, client);
    }
  });
}

export async function deleteRosterEntry(id: number) {
  await execute("DELETE FROM roster_entries WHERE id = $1", [id]);
}
