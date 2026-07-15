import type { CertificationWithCounts } from "@/lib/types";

export type CalendarBattalionRef = {
  code: string;
  name: string;
  color_hex: string;
};

export type CalendarCertification = CertificationWithCounts & {
  battalions: CalendarBattalionRef[];
  color_hex?: string | null;
};
