import { z } from "zod";
import { CERTIFICATION_STATUSES, type CertificationStatus } from "@/lib/types";

export const certificationSchema = z.object({
  template_id: z.coerce.number().int().nullish(),
  name: z.string().min(1, "שם ההסמכה נדרש"),
  domain: z.string().nullish(),
  start_date: z.string().min(1, "תאריך התחלה נדרש"),
  end_date: z.string().nullish(),
  location: z.string().nullish(),
  total_slots: z.coerce.number().int().positive().nullish(),
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

export type CertificationFormValues = z.infer<typeof certificationSchema>;

export const certificationStatusSchema = z.object({
  status: z.enum(CERTIFICATION_STATUSES as [CertificationStatus, ...CertificationStatus[]]),
  note: z.string().nullish(),
});
