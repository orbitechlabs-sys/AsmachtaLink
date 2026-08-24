"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock, LockOpen, CheckCircle2, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { formatLockDate, isRegistrationLocked } from "@/lib/utils/registration-lock";
import type { Battalion, CertificationBattalionQuota } from "@/lib/types";

/**
 * Registration controls on the certification detail page.
 *
 * ONE registration deadline for the whole certification, not one per battalion. Each
 * allocation used to carry its own date input and save button, which repeated the same
 * control for every battalion down the page and let two battalions end up with deadlines
 * that disagreed. Migration 021 moved the date onto `certifications`, so the control moved
 * with it — up here, once, and collapsed by default.
 */

/** One allocation: its quota and its trainee-list approval. No deadline of its own. */
function QuotaRow({
  certificationId,
  quota,
  battalionName,
  canManage,
  isMine,
  locked,
}: {
  certificationId: number;
  quota: CertificationBattalionQuota;
  battalionName: string;
  canManage: boolean;
  isMine: boolean;
  /** The certification's lock state — the same value for every row. */
  locked: boolean;
}) {
  const router = useRouter();
  const [approving, setApproving] = useState(false);

  async function approveTrainees() {
    setApproving(true);
    const res = await fetch(
      `/api/certifications/${certificationId}/quotas/${quota.battalion_id}/approve-trainees`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ battalion_id: quota.battalion_id }),
      }
    );
    setApproving(false);
    if (res.status === 403) {
      toast.error("ההרשמה נסגרה — חלף מועד הנעילה");
      router.refresh();
      return;
    }
    if (!res.ok) {
      toast.error("אישור רשימת המתאמנים נכשל");
      return;
    }
    const data = (await res.json()) as { submitted: number };
    toast.success(`רשימת המתאמנים אושרה (${data.submitted} חיילים)`);
    router.refresh();
  }

  return (
    <div className="rounded-md border p-3 space-y-2">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="font-medium text-sm">
          {battalionName} · הקצאה: {quota.allocated_slots}
        </span>
      </div>

      {(isMine || canManage) && (
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" disabled={approving || locked} onClick={approveTrainees}>
            {approving ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            אשר רשימת מתאמנים
          </Button>
          {locked && (
            <span className="text-xs text-destructive">ההרשמה סגורה — חלף מועד הנעילה</span>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * The single certification-level deadline, collapsed by default.
 *
 * Saves through the existing `PATCH /api/certifications/[id]` rather than an endpoint of its
 * own — the deadline is a field of the certification now, so it goes where every other
 * certification field goes. A partial PATCH carrying only this key leaves the rest alone.
 */
function LockDateSection({
  certificationId,
  lockDate,
  locked,
  canManage,
}: {
  certificationId: number;
  lockDate: string | null;
  locked: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(lockDate ?? "");
  const [saving, setSaving] = useState(false);

  const formatted = formatLockDate(lockDate);

  async function save(next: string | null) {
    setSaving(true);
    const res = await fetch(`/api/certifications/${certificationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration_lock_date: next }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("שמירת מועד נעילת ההרשמה נכשלה");
      return;
    }
    toast.success(next ? "מועד נעילת ההרשמה נשמר" : "מועד נעילת ההרשמה בוטל");
    router.refresh();
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger
        className={cn(
          "w-full flex items-center justify-between gap-2 rounded-md border px-3 py-2 text-sm",
          "hover:bg-muted transition-colors"
        )}
      >
        <ChevronDown
          className={cn("size-4 shrink-0 transition-transform", open && "rotate-180")}
        />
        <span className="flex items-center gap-2 font-medium">
          {formatted ? (
            <span
              className={cn(
                "inline-flex items-center gap-1 text-xs",
                locked ? "text-destructive" : "text-muted-foreground"
              )}
            >
              <Lock className="size-3" />
              {formatted}
              {locked ? " (ההרשמה סגורה)" : ""}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
              <LockOpen className="size-3" />
              ללא מועד נעילה
            </span>
          )}
          מועד נעילת הרשמה
        </span>
      </CollapsibleTrigger>

      <CollapsibleContent>
        <div className="rounded-md border border-t-0 rounded-t-none px-3 py-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            מועד אחד לכל הגדודים. עד סוף היום שנבחר ניתן להירשם; מהיום שאחריו ההרשמה נסגרת
            לכולם — גם למנהלי הגדודים וגם לחטיבה.
          </p>
          {canManage ? (
            <div className="flex items-end gap-2 flex-wrap">
              <div className="space-y-1">
                <Label className="text-xs">מועד נעילת הרשמה</Label>
                <Input
                  type="date"
                  className="h-8"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                />
              </div>
              <Button size="sm" disabled={saving} onClick={() => save(value || null)}>
                {saving && <Loader2 className="size-4 animate-spin" />}
                שמור מועד
              </Button>
              {lockDate && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={saving}
                  onClick={() => {
                    setValue("");
                    save(null);
                  }}
                >
                  בטל נעילה
                </Button>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              {formatted ? `ההרשמה נסגרת בתום ${formatted}.` : "לא נקבע מועד נעילה להסמכה זו."}
            </p>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function QuotaRegistrationPanel({
  certificationId,
  quotas,
  battalions,
  canManage,
  myBattalionId,
  registrationLockDate,
  today,
}: {
  certificationId: number;
  quotas: CertificationBattalionQuota[];
  battalions: Battalion[];
  canManage: boolean;
  myBattalionId: number | null;
  /** The certification's single deadline, 'yyyy-MM-dd' or null. */
  registrationLockDate: string | null;
  /** Server render date as 'yyyy-MM-dd', passed in so this stays pure (no clock read in
   * render) and hydration-stable. The server enforces the deadline on every write anyway. */
  today: string;
}) {
  const nameById = new Map(battalions.map((b) => [b.id, b.name]));
  const locked = isRegistrationLocked(registrationLockDate, today);

  // The deadline belongs to the certification, so it shows even with no allocations yet —
  // otherwise there would be no way to set it before the quotas are entered.
  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">הרשמת מתאמנים לפי הקצאה</h2>

      <LockDateSection
        certificationId={certificationId}
        lockDate={registrationLockDate}
        locked={locked}
        canManage={canManage}
      />

      {quotas.length > 0 && (
        <div className="space-y-2">
          {quotas.map((q) => (
            <QuotaRow
              key={q.id}
              certificationId={certificationId}
              quota={q}
              battalionName={nameById.get(q.battalion_id) ?? `גדוד ${q.battalion_id}`}
              canManage={canManage}
              isMine={myBattalionId === q.battalion_id}
              locked={locked}
            />
          ))}
        </div>
      )}
    </div>
  );
}
