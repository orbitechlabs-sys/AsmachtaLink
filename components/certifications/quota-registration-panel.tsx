"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Loader2, Lock, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Battalion, CertificationBattalionQuota } from "@/lib/types";

/** Converts an ISO timestamp to the value a <input type="datetime-local"> expects
 * (local wall-clock, no timezone), so editing round-trips without UTC drift. */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}`;
}

function QuotaRow({
  certificationId,
  quota,
  battalionName,
  canManage,
  isMine,
  nowMs,
}: {
  certificationId: number;
  quota: CertificationBattalionQuota;
  battalionName: string;
  canManage: boolean;
  isMine: boolean;
  nowMs: number;
}) {
  const router = useRouter();
  const [lockInput, setLockInput] = useState(isoToLocalInput(quota.registration_lock_at));
  const [savingLock, setSavingLock] = useState(false);
  const [approving, setApproving] = useState(false);

  // `nowMs` is the server render time, passed in so this stays pure (no Date.now in
  // render) and hydration-stable. The server also enforces the deadline on the action.
  const locked =
    !!quota.registration_lock_at &&
    new Date(quota.registration_lock_at).getTime() < nowMs;

  async function saveLock(nextIso: string | null) {
    setSavingLock(true);
    const res = await fetch(`/api/certifications/${certificationId}/quotas/${quota.battalion_id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ registration_lock_at: nextIso }),
    });
    setSavingLock(false);
    if (!res.ok) {
      toast.error("שמירת מועד הנעילה נכשלה");
      return;
    }
    toast.success(nextIso ? "מועד הנעילה נשמר" : "מועד הנעילה בוטל");
    router.refresh();
  }

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
        {quota.registration_lock_at ? (
          <span
            className={`text-xs inline-flex items-center gap-1 ${
              locked ? "text-destructive" : "text-muted-foreground"
            }`}
          >
            <Lock className="size-3" />
            נעילת הרשמה: {new Date(quota.registration_lock_at).toLocaleString("he-IL")}
            {locked ? " (סגור)" : ""}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">ללא מועד נעילה</span>
        )}
      </div>

      {canManage && (
        <div className="flex items-end gap-2 flex-wrap">
          <div className="space-y-1">
            <Label className="text-xs">מועד נעילת הרשמה</Label>
            <Input
              type="datetime-local"
              className="h-8"
              value={lockInput}
              onChange={(e) => setLockInput(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            disabled={savingLock}
            onClick={() => saveLock(lockInput ? new Date(lockInput).toISOString() : null)}
          >
            {savingLock && <Loader2 className="size-4 animate-spin" />}
            שמור מועד
          </Button>
          {quota.registration_lock_at && (
            <Button
              size="sm"
              variant="outline"
              disabled={savingLock}
              onClick={() => {
                setLockInput("");
                saveLock(null);
              }}
            >
              בטל נעילה
            </Button>
          )}
        </div>
      )}

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

/** Per-allocation registration controls on the certification detail page:
 * brigade sets a registration lock deadline; the battalion approves (submits) its
 * trainee list until the deadline passes. */
export function QuotaRegistrationPanel({
  certificationId,
  quotas,
  battalions,
  canManage,
  myBattalionId,
  nowMs,
}: {
  certificationId: number;
  quotas: CertificationBattalionQuota[];
  battalions: Battalion[];
  canManage: boolean;
  myBattalionId: number | null;
  nowMs: number;
}) {
  const nameById = new Map(battalions.map((b) => [b.id, b.name]));
  if (quotas.length === 0) return null;

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">הרשמת מתאמנים לפי הקצאה</h2>
      <div className="space-y-2">
        {quotas.map((q) => (
          <QuotaRow
            key={q.id}
            certificationId={certificationId}
            quota={q}
            battalionName={nameById.get(q.battalion_id) ?? `גדוד ${q.battalion_id}`}
            canManage={canManage}
            isMine={myBattalionId === q.battalion_id}
            nowMs={nowMs}
          />
        ))}
      </div>
    </div>
  );
}
