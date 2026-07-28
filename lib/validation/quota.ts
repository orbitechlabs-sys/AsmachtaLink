import { z } from "zod";

/** Registration lock deadline for a quota allocation. The UI sends a full ISO-8601
 * timestamp (built client-side via `new Date(datetimeLocalValue).toISOString()`, so
 * the wall-clock time the user picked is converted to a real instant — no UTC
 * off-by-one), or null to clear the lock. */
export const quotaLockSchema = z.object({
  registration_lock_at: z.string().datetime({ message: "מועד לא תקין" }).nullable(),
});

export type QuotaLockValues = z.infer<typeof quotaLockSchema>;

/** Trainee-approval payload for a quota allocation. `battalion_id` identifies the
 * allocation being approved and is cross-checked against the authenticated caller's
 * scope server-side. */
export const traineeApprovalSchema = z.object({
  battalion_id: z.coerce.number().int(),
});

export type TraineeApprovalValues = z.infer<typeof traineeApprovalSchema>;
