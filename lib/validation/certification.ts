import { z } from "zod";
import { CERTIFICATION_STATUSES, type CertificationStatus } from "@/lib/types";

/** Base object schema. Kept as a plain ZodObject so `.partial()` still works for
 * PATCH. Cross-field validation (capacity required unless unlimited) lives in the
 * refined `certificationCreateSchema` / `certificationPatchSchema` below.
 *
 * Capacity model: `total_slots === null` means "unlimited" (אין מגבלה). The
 * `is_unlimited` flag is a UI-only convenience — it is NOT persisted; the server
 * normalizes capacity to NULL when it is set. An empty number input ("") is
 * coerced to `null` (not 0) so it can be treated as "missing".
 */
export const certificationSchema = z.object({
  template_id: z.coerce.number().int().nullish(),
  name: z.string().min(1, "שם ההסמכה נדרש"),
  domain: z.string().nullish(),
  start_date: z.string().min(1, "תאריך התחלה נדרש"),
  end_date: z.string().nullish(),
  location: z.string().nullish(),
  total_slots: z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? null : v),
    z.coerce.number().int().positive("מספר המקומות חייב להיות מספר חיובי").nullish()
  ),
  is_unlimited: z.boolean().default(false),
  gap_row_id: z.coerce.number().int().nullish(),
  registration_open: z.boolean().default(false),
  notes: z.string().nullish(),
  color_hex: z.string().regex(/^#[0-9a-fA-F]{6}$/, "צבע לא תקין").nullish(),
  prerequisites: z.array(z.string()).default([]),
  quotas: z
    .array(z.object({ battalion_id: z.number(), allocated_slots: z.number().int().min(0) }))
    .default([]),
  taxes: z
    .array(z.object({ role_name: z.string().min(1), is_fulfilled: z.boolean().default(false) }))
    .default([]),
});

/** Requires a positive capacity unless "unlimited" is set. Used for create (POST)
 * and the form resolver (create + edit). */
export const certificationCreateSchema = certificationSchema.superRefine((data, ctx) => {
  if (!data.is_unlimited && data.total_slots == null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["total_slots"],
      message: "יש להזין מספר מקומות או לסמן “אין מגבלה”",
    });
  }
});

/** Partial variant for PATCH. Only enforces the capacity rule when the caller
 * explicitly sends `is_unlimited: false` together with a null capacity. */
export const certificationPatchSchema = certificationSchema.partial().superRefine((data, ctx) => {
  if (data.is_unlimited === false && data.total_slots === null) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["total_slots"],
      message: "יש להזין מספר מקומות או לסמן “אין מגבלה”",
    });
  }
});

export type CertificationFormValues = z.infer<typeof certificationSchema>;

export const certificationStatusSchema = z.object({
  status: z.enum(CERTIFICATION_STATUSES as [CertificationStatus, ...CertificationStatus[]]),
  note: z.string().nullish(),
});
