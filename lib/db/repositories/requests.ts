import { execute, query, queryOne, withTransaction } from "@/lib/db/client";
import type { BattalionRequest, RequestStatus, Urgency } from "@/lib/types";
import { recordStatusChange } from "@/lib/db/repositories/audit";
import { createNotification } from "@/lib/db/repositories/notifications";
import { createCertification, CertificationInput } from "@/lib/db/repositories/certifications";

export interface RequestFilters {
  battalionCode?: string;
  status?: RequestStatus;
}

export async function listRequests(filters: RequestFilters = {}): Promise<BattalionRequest[]> {
  let sql = `SELECT r.* FROM battalion_requests r`;
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (filters.battalionCode) {
    sql += ` JOIN battalions b ON b.id = r.battalion_id`;
    conditions.push(`b.code = $${params.length + 1}`);
    params.push(filters.battalionCode);
  }
  if (filters.status) {
    conditions.push(`r.status = $${params.length + 1}`);
    params.push(filters.status);
  }
  if (conditions.length) sql += ` WHERE ` + conditions.join(" AND ");
  sql += ` ORDER BY r.created_at DESC`;

  return query<BattalionRequest>(sql, params);
}

export async function getRequest(id: number): Promise<BattalionRequest | undefined> {
  return queryOne<BattalionRequest>("SELECT * FROM battalion_requests WHERE id = $1", [id]);
}

export interface RequestInput {
  battalion_id: number;
  requested_cert_type: string;
  quantity_needed: number;
  reason?: string | null;
  urgency?: Urgency;
  desired_date?: string | null;
  notes?: string | null;
}

export async function createRequest(input: RequestInput): Promise<number> {
  return withTransaction(async (client) => {
    const result = await execute(
      `INSERT INTO battalion_requests
          (battalion_id, requested_cert_type, quantity_needed, reason, urgency, desired_date, notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id`,
      [
        input.battalion_id,
        input.requested_cert_type,
        input.quantity_needed,
        input.reason ?? null,
        input.urgency ?? "normal",
        input.desired_date ?? null,
        input.notes ?? null,
      ], client
    );
    const id = (result.rows[0] as { id: number }).id;
    await recordStatusChange("battalion_request", id, null, "opened", `battalion:${input.battalion_id}`, undefined, client);
    await createNotification({
      type: "certification_opened",
      target_role: "brigade",
      entity_type: "battalion_request",
      entity_id: id,
      message: `דרישה חדשה: ${input.quantity_needed} ל"${input.requested_cert_type}"`,
    }, client);
    return id;
  });
}

export async function updateRequest(id: number, input: Partial<RequestInput>) {
  const existing = await getRequest(id);
  if (!existing) throw new Error("Request not found");
  await execute(
    `UPDATE battalion_requests SET
      requested_cert_type = $1, quantity_needed = $2, reason = $3, urgency = $4, desired_date = $5, notes = $6,
      updated_at = NOW()
     WHERE id = $7`,
  [
    input.requested_cert_type ?? existing.requested_cert_type,
    input.quantity_needed ?? existing.quantity_needed,
    input.reason ?? existing.reason,
    input.urgency ?? existing.urgency,
    input.desired_date ?? existing.desired_date,
    input.notes ?? existing.notes,
    id,
  ]);
}

const VALID_TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  opened: ["in_review", "rejected"],
  in_review: ["approved", "rejected", "opened"],
  approved: ["certification_opened", "closed"],
  rejected: ["closed"],
  certification_opened: ["closed"],
  closed: [],
};

export async function updateRequestStatus(
  id: number,
  newStatus: RequestStatus,
  changedByRole: string,
  note?: string
) {
  const existing = await getRequest(id);
  if (!existing) throw new Error("Request not found");
  const allowed = VALID_TRANSITIONS[existing.status] ?? [];
  if (existing.status !== newStatus && !allowed.includes(newStatus)) {
    throw new Error(`Invalid transition from ${existing.status} to ${newStatus}`);
  }
  await withTransaction(async (client) => {
    await execute(
      `UPDATE battalion_requests SET status = $1, updated_at = NOW() WHERE id = $2`,
      [newStatus, id],
      client
    );
    await recordStatusChange("battalion_request", id, existing.status, newStatus, changedByRole, note, client);
  });
}

export async function openCertificationFromRequest(
  requestId: number,
  certInput: CertificationInput,
  changedByRole: string
): Promise<number> {
  const existing = await getRequest(requestId);
  if (!existing) throw new Error("Request not found");

  return withTransaction(async (client) => {
    const certId = await createCertification({
      ...certInput,
      origin_request_id: requestId,
      created_by_role: changedByRole,
    }, client);
    await execute(
      `UPDATE battalion_requests SET status = 'certification_opened', linked_certification_id = $1, updated_at = NOW()
       WHERE id = $2`, [certId, requestId], client
    );
    await recordStatusChange(
      "battalion_request",
      requestId,
      existing.status,
      "certification_opened",
      changedByRole,
      "נפתחה הסמכה בעקבות הדרישה",
      client
    );
    const battalion = await queryOne<{ code: string }>(
      "SELECT code FROM battalions WHERE id = $1", [existing.battalion_id], client
    );
    await createNotification({
      type: "opened_from_request",
      target_role: `battalion:${battalion?.code ?? existing.battalion_id}`,
      entity_type: "certification",
      entity_id: certId,
      message: `נפתחה הסמכה חדשה "${certInput.name}" בעקבות הדרישה שהגשתם`,
    }, client);
    return certId;
  });
}

export async function linkRequestToCertification(
  requestId: number,
  certificationId: number,
  changedByRole: string
) {
  const existing = await getRequest(requestId);
  if (!existing) throw new Error("Request not found");
  await withTransaction(async (client) => {
    await execute(
      `UPDATE battalion_requests SET status = 'certification_opened', linked_certification_id = $1, updated_at = NOW()
       WHERE id = $2`, [certificationId, requestId], client
    );
    await recordStatusChange(
      "battalion_request",
      requestId,
      existing.status,
      "certification_opened",
      changedByRole,
      "שויכה להסמכה קיימת",
      client
    );
  });
}
