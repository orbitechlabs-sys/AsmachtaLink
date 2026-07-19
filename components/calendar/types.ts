import type { CertificationStatus, CertificationWithCounts, Training } from "@/lib/types";
import { certificationColor } from "@/lib/utils/cert-colors";

export type CalendarBattalionRef = {
  code: string;
  name: string;
  color_hex: string;
};

export type CalendarItemKind = "certification" | "training";

/** A single time-bound entity rendered on the calendar. Certifications and trainings
 * are both projected into this unified shape so every view renders a color-coded
 * spanning bar the same way, driven by `kind`. */
export interface CalendarItem {
  kind: CalendarItemKind;
  /** Original entity id (unique only within a kind). */
  id: number;
  /** Stable key unique across kinds — use for React keys and lane maps. */
  key: string;
  name: string;
  start_date: string;
  end_date: string | null;
  location: string | null;
  href: string;
  /** Resolved bar color (the record's color_hex, with a stable per-name fallback). */
  color: string;
  battalions: CalendarBattalionRef[];
  /** 1 when brigade-wide open (always shown under a unit filter); 0 otherwise. */
  registration_open: number;
  // Certification-only extras (undefined for other kinds):
  status?: CertificationStatus;
  registered_count?: number;
  slots_remaining?: number | null;
  total_slots?: number | null;
}

/** Projects a certification (enriched with battalion refs) into a CalendarItem. */
export function certificationToCalendarItem(
  cert: CertificationWithCounts & { battalions: CalendarBattalionRef[] }
): CalendarItem {
  return {
    kind: "certification",
    id: cert.id,
    key: `certification-${cert.id}`,
    name: cert.name,
    start_date: cert.start_date,
    end_date: cert.end_date,
    location: cert.location,
    href: `/certifications/${cert.id}`,
    color: cert.color_hex || certificationColor(cert.name),
    battalions: cert.battalions,
    registration_open: cert.registration_open,
    status: cert.status,
    registered_count: cert.registered_count,
    slots_remaining: cert.slots_remaining,
    total_slots: cert.total_slots,
  };
}

/** Projects a training (with its distinct battalion refs) into a CalendarItem. Trainings
 * carry no status/slots and their location lives per-session, so those fields are omitted. */
export function trainingToCalendarItem(
  training: Training,
  battalions: CalendarBattalionRef[]
): CalendarItem {
  return {
    kind: "training",
    id: training.id,
    key: `training-${training.id}`,
    name: training.name,
    start_date: training.start_date,
    end_date: training.end_date,
    location: null,
    href: `/trainings/${training.id}`,
    color: training.color_hex || certificationColor(training.domain || training.name),
    battalions,
    registration_open: 0,
  };
}
