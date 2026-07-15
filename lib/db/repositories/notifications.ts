import { execute, query } from "@/lib/db/client";
import type { EntityType, Notification, NotificationType } from "@/lib/types";
import type { PoolClient } from "pg";

export async function createNotification(
  input: {
    type: NotificationType;
    target_role: string;
    entity_type?: EntityType;
    entity_id?: number;
    message: string;
  },
  client?: PoolClient
) {
  await execute(
    `INSERT INTO notifications (type, target_role, entity_type, entity_id, message)
     VALUES ($1, $2, $3, $4, $5)`,
    [input.type, input.target_role, input.entity_type ?? null, input.entity_id ?? null, input.message],
    client
  );
}

export async function listNotifications(
  targetRole: string,
  unreadOnly = false
): Promise<Notification[]> {
  const roles = targetRole === "brigade" ? ["brigade"] : [targetRole, "battalion:all"];
  const placeholders = roles.map((_, index) => `$${index + 1}`).join(",");
  const sql = `SELECT * FROM notifications WHERE target_role IN (${placeholders}) ${
    unreadOnly ? "AND is_read = 0" : ""
  } ORDER BY created_at DESC`;
  return query<Notification>(sql, roles);
}

export async function markNotificationRead(id: number) {
  await execute("UPDATE notifications SET is_read = 1 WHERE id = $1", [id]);
}

export async function markAllNotificationsRead(targetRole: string) {
  const roles = targetRole === "brigade" ? ["brigade"] : [targetRole, "battalion:all"];
  const placeholders = roles.map((_, index) => `$${index + 1}`).join(",");
  await execute(`UPDATE notifications SET is_read = 1 WHERE target_role IN (${placeholders})`, roles);
}
