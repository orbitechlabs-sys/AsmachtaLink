import { z } from "zod";
import { REQUEST_STATUSES, URGENCY_LEVELS, type RequestStatus, type Urgency } from "@/lib/types";

export const requestSchema = z.object({
  battalion_id: z.coerce.number().int(),
  requested_cert_type: z.string().min(1, "סוג ההסמכה נדרש"),
  quantity_needed: z.coerce.number().int().positive("כמות נדרשת חייבת להיות חיובית"),
  reason: z.string().nullish(),
  urgency: z.enum(URGENCY_LEVELS as [Urgency, ...Urgency[]]).default("normal"),
  desired_date: z.string().nullish(),
  notes: z.string().nullish(),
});

export type RequestFormValues = z.infer<typeof requestSchema>;

export const requestStatusSchema = z.object({
  status: z.enum(REQUEST_STATUSES as [RequestStatus, ...RequestStatus[]]),
  note: z.string().nullish(),
});
