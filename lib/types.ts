export type CertificationStatus =
  | "draft"
  | "open"
  | "full"
  | "closed"
  | "in_progress"
  | "completed"
  | "cancelled";

export const CERTIFICATION_STATUSES: CertificationStatus[] = [
  "draft",
  "open",
  "full",
  "closed",
  "in_progress",
  "completed",
  "cancelled",
];

export const CERTIFICATION_STATUS_LABELS: Record<CertificationStatus, string> = {
  draft: "טיוטה",
  open: "פתוחה להרשמה",
  full: "מלאה",
  closed: "סגורה להרשמה",
  in_progress: "בביצוע",
  completed: "בוצעה",
  cancelled: "בוטלה",
};

export type RosterStatus =
  | "registered"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "participated"
  | "did_not_participate"
  | "did_not_report"
  | "passed"
  | "failed";

export const ROSTER_STATUSES: RosterStatus[] = [
  "registered",
  "pending_approval",
  "approved",
  "rejected",
  "participated",
  "did_not_participate",
  "did_not_report",
  "passed",
  "failed",
];

export const ROSTER_STATUS_LABELS: Record<RosterStatus, string> = {
  registered: "נרשם",
  pending_approval: "ממתין לאישור",
  approved: "אושר",
  rejected: "נדחה",
  participated: "השתתף",
  did_not_participate: "לא השתתף",
  did_not_report: "לא התייצב",
  passed: "עבר הסמכה",
  failed: "לא עבר הסמכה",
};

export type RequestStatus =
  | "opened"
  | "in_review"
  | "approved"
  | "rejected"
  | "certification_opened"
  | "closed";

export const REQUEST_STATUSES: RequestStatus[] = [
  "opened",
  "in_review",
  "approved",
  "rejected",
  "certification_opened",
  "closed",
];

export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  opened: "נפתחה",
  in_review: "בטיפול חטיבה",
  approved: "אושרה",
  rejected: "נדחתה",
  certification_opened: "הסמכה נפתחה בהתאם לדרישה",
  closed: "נסגרה",
};

export type Urgency = "low" | "normal" | "high" | "urgent";

export const URGENCY_LEVELS: Urgency[] = ["low", "normal", "high", "urgent"];

export const URGENCY_LABELS: Record<Urgency, string> = {
  low: "נמוכה",
  normal: "רגילה",
  high: "גבוהה",
  urgent: "דחוף",
};

export type EntityType = "certification" | "battalion_request" | "roster_entry";

export type Role = "brigade" | `battalion:${string}`;

export interface Battalion {
  id: number;
  code: string;
  name: string;
  color_hex: string;
  is_active: number;
}

export interface CertificationTemplate {
  id: number;
  name: string;
  domain: string | null;
  default_location: string | null;
  default_slots: number | null;
  default_notes: string | null;
  gap_row_id: number | null;
  checkin_details: string | null;
  duration_text: string | null;
  trainee_ratio: string | null;
  ammo_required: string | null;
  requirements_text: string | null;
  equipment_text: string | null;
  contacts_text: string | null;
  color_hex: string | null;
  created_at: string;
  updated_at: string;
}

export interface Certification {
  id: number;
  template_id: number | null;
  name: string;
  domain: string | null;
  start_date: string;
  end_date: string | null;
  location: string | null;
  total_slots: number | null;
  registration_open: number;
  status: CertificationStatus;
  notes: string | null;
  origin_request_id: number | null;
  gap_row_id: number | null;
  created_by_role: string;
  created_at: string;
  updated_at: string;
}

export interface CertificationWithCounts extends Certification {
  registered_count: number;
  slots_remaining: number | null;
}

export interface CertificationPrerequisite {
  id: number;
  certification_id: number;
  description: string;
}

export interface CertificationTax {
  id: number;
  certification_id: number;
  role_name: string;
  is_fulfilled: number;
  notes: string | null;
}

export interface CertificationBattalionQuota {
  id: number;
  certification_id: number;
  battalion_id: number;
  allocated_slots: number;
  notes: string | null;
}

export interface RosterEntry {
  id: number;
  certification_id: number;
  battalion_id: number;
  full_name: string;
  personal_number: string;
  company_platoon: string | null;
  phone: string | null;
  commander_name: string | null;
  commander_phone: string | null;
  has_prior_certification: number;
  prior_certification_details: string | null;
  meets_prerequisite: number | null;
  notes: string | null;
  status: RosterStatus;
  outcome_reason: string | null;
  is_reserve: number;
  created_at: string;
  updated_at: string;
}

export interface BattalionRequest {
  id: number;
  battalion_id: number;
  requested_cert_type: string;
  quantity_needed: number;
  reason: string | null;
  urgency: Urgency;
  desired_date: string | null;
  notes: string | null;
  status: RequestStatus;
  linked_certification_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface StatusHistoryEntry {
  id: number;
  entity_type: EntityType;
  entity_id: number;
  old_status: string | null;
  new_status: string;
  changed_by_role: string;
  note: string | null;
  changed_at: string;
}

export type NotificationType =
  | "certification_opened"
  | "opened_from_request"
  | "soldier_added"
  | "date_approaching"
  | "registration_closed"
  | "soldier_approved"
  | "soldier_rejected"
  | "certification_cancelled"
  | "certification_changed";

export interface Notification {
  id: number;
  type: NotificationType;
  target_role: string;
  entity_type: EntityType | null;
  entity_id: number | null;
  message: string;
  is_read: number;
  created_at: string;
}
