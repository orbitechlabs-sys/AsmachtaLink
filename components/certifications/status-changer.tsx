"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { CertificationStatusBadge } from "@/components/certifications/status-badge";
import {
  CERTIFICATION_STATUS_LABELS,
  type Certification,
  type CertificationStatus,
} from "@/lib/types";

const VALID_TRANSITIONS: Record<CertificationStatus, CertificationStatus[]> = {
  draft: ["open", "cancelled"],
  open: ["full", "closed", "in_progress", "cancelled"],
  full: ["open", "closed", "in_progress", "cancelled"],
  closed: ["open", "in_progress", "cancelled"],
  in_progress: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export function CertificationStatusChanger({
  certification,
  canManage,
}: {
  certification: Certification;
  canManage: boolean;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  async function changeStatus(status: CertificationStatus) {
    setSubmitting(true);
    const res = await fetch(`/api/certifications/${certification.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("שינוי הסטטוס נכשל");
      return;
    }
    toast.success("הסטטוס עודכן");
    router.refresh();
  }

  const options = VALID_TRANSITIONS[certification.status] ?? [];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-muted-foreground">סטטוס:</span>
      <CertificationStatusBadge status={certification.status} />
      {canManage &&
        options.map((s) => (
          <Button key={s} size="sm" variant="outline" disabled={submitting} onClick={() => changeStatus(s)}>
            {CERTIFICATION_STATUS_LABELS[s]}
          </Button>
        ))}
    </div>
  );
}
