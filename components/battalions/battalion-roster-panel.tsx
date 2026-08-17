"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Loader2, Lock, Plus, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { RosterStatusBadge } from "@/components/certifications/status-badge";
import type { RosterEntry } from "@/lib/types";
import type { BattalionQuotaUsage } from "@/lib/db/repositories/roster";

interface Draft {
  full_name: string;
  personal_number: string;
  company_platoon: string;
  phone: string;
  commander_name: string;
  commander_phone: string;
  notes: string;
  is_reserve: boolean;
}

function emptyDraft(isReserve: boolean): Draft {
  return {
    full_name: "",
    personal_number: "",
    company_platoon: "",
    phone: "",
    commander_name: "",
    commander_phone: "",
    notes: "",
    is_reserve: isReserve,
  };
}

/**
 * The battalion's own list of soldiers on one certification, plus the add form, bounded by
 * the allocation the brigade gave it. The counter and the disabled state here are a
 * convenience only — the limit itself is enforced by the endpoint, which is also what
 * produces the Hebrew message shown on refusal.
 */
export function BattalionRosterPanel({
  battalionId,
  certificationId,
  entries,
  quota,
  canEdit,
}: {
  battalionId: number;
  certificationId: number;
  entries: RosterEntry[];
  quota: BattalionQuotaUsage;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [removingId, setRemovingId] = useState<number | null>(null);
  const [movingId, setMovingId] = useState<number | null>(null);

  const base = `/api/battalions/${battalionId}/certifications/${certificationId}/roster`;
  const noAllocation = quota.allocated === null;
  const full = quota.remaining !== null && quota.remaining < 1;
  // With the allocation full the only way left in is the עתודה, which by design sits
  // outside it — so a new row starts pre-marked as reserve.
  const startsAsReserve = full;

  function patch(next: Partial<Draft>) {
    setDraft((prev) => (prev ? { ...prev, ...next } : prev));
  }

  async function submit() {
    if (!draft) return;
    if (!draft.full_name.trim() || !draft.personal_number.trim()) {
      toast.error("שם מלא ומספר אישי נדרשים");
      return;
    }
    setSubmitting(true);
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        full_name: draft.full_name.trim(),
        personal_number: draft.personal_number.trim(),
        company_platoon: draft.company_platoon,
        phone: draft.phone,
        commander_name: draft.commander_name,
        commander_phone: draft.commander_phone,
        notes: draft.notes,
        is_reserve: draft.is_reserve,
      }),
    });
    setSubmitting(false);
    if (!res.ok) {
      // The server's own Hebrew wording (quota full, no allocation, deadline passed) is
      // the most precise thing to show.
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(
        typeof body?.error === "string" ? body.error : "הוספת החייל נכשלה"
      );
      return;
    }
    toast.success(draft.is_reserve ? "החייל נוסף לעתודה" : "החייל נוסף להסמכה");
    setDraft(null);
    router.refresh();
  }

  /** Moves a soldier between the עתודה and the allocation. Going INTO the allocation takes a
   * slot, so the server applies the same limit an addition faces. */
  async function toggleReserve(entry: RosterEntry) {
    const toReserve = entry.is_reserve === 0;
    setMovingId(entry.id);
    const res = await fetch(`${base}/${entry.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_reserve: toReserve }),
    });
    setMovingId(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof body?.error === "string" ? body.error : "העברת החייל נכשלה");
      return;
    }
    toast.success(toReserve ? "החייל הועבר לעתודה" : "החייל הועבר להקצאה");
    router.refresh();
  }

  async function remove(entry: RosterEntry) {
    if (!confirm(`להסיר את ${entry.full_name} מההסמכה?`)) return;
    setRemovingId(entry.id);
    const res = await fetch(`${base}/${entry.id}`, { method: "DELETE" });
    setRemovingId(null);
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { error?: unknown } | null;
      toast.error(typeof body?.error === "string" ? body.error : "המחיקה נכשלה");
      return;
    }
    toast.success("החייל הוסר");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <h2 className="text-lg font-semibold">חיילי הגדוד בהסמכה</h2>
        {canEdit && !quota.locked && !noAllocation && (
          <Button
            size="sm"
            variant={draft ? "outline" : "default"}
            onClick={() => setDraft(draft ? null : emptyDraft(startsAsReserve))}
          >
            {draft ? <X className="size-4" /> : <Plus className="size-4" />}
            {draft ? "ביטול" : "הוסף חייל"}
          </Button>
        )}
      </div>

      {noAllocation && (
        <p className="text-sm rounded-md border border-amber-200 bg-amber-50 p-2.5 text-amber-800">
          לא הוקצו לגדוד מקומות בהסמכה זו. שיבוץ חיילים יתאפשר לאחר שהחטיבה תקצה מקומות
          לגדוד.
        </p>
      )}
      {quota.locked && (
        <p className="text-sm rounded-md border border-rose-200 bg-rose-50 p-2.5 text-rose-800 inline-flex items-center gap-1.5">
          <Lock className="size-4" />
          ההרשמה נסגרה — חלף מועד הנעילה
          {quota.registration_lock_at
            ? ` (${new Date(quota.registration_lock_at).toLocaleString("he-IL")})`
            : ""}
          .
        </p>
      )}
      {!noAllocation && full && !quota.locked && (
        <p className="text-sm rounded-md border border-amber-200 bg-amber-50 p-2.5 text-amber-800">
          ההקצאה לגדוד מלאה ({quota.used} מתוך {quota.allocated}). ניתן להוסיף חיילים
          נוספים כעתודה בלבד.
        </p>
      )}

      {draft && (
        <div className="rounded-md border p-3 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>שם מלא</Label>
              <Input
                value={draft.full_name}
                onChange={(e) => patch({ full_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>מספר אישי</Label>
              <Input
                value={draft.personal_number}
                onChange={(e) => patch({ personal_number: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>פלוגה / מסגרת</Label>
              <Input
                value={draft.company_platoon}
                onChange={(e) => patch({ company_platoon: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>טלפון</Label>
              <Input value={draft.phone} onChange={(e) => patch({ phone: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label>שם המפקד</Label>
              <Input
                value={draft.commander_name}
                onChange={(e) => patch({ commander_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>טלפון המפקד</Label>
              <Input
                value={draft.commander_phone}
                onChange={(e) => patch({ commander_phone: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-2.5">
            <Checkbox
              id="battalion-roster-reserve"
              checked={draft.is_reserve}
              onCheckedChange={(v) => patch({ is_reserve: Boolean(v) })}
            />
            <Label htmlFor="battalion-roster-reserve" className="text-amber-800">
              רישום כעתודה (מחוץ למכסת ההקצאות של הגדוד)
            </Label>
          </div>

          <div className="space-y-1.5">
            <Label>הערות</Label>
            <Textarea value={draft.notes} onChange={(e) => patch({ notes: e.target.value })} />
          </div>

          <div className="flex gap-2">
            <Button onClick={submit} disabled={submitting || (full && !draft.is_reserve)}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {draft.is_reserve ? "הוסף לעתודה" : "הוסף חייל"}
            </Button>
            <Button variant="outline" onClick={() => setDraft(null)}>
              ביטול
            </Button>
          </div>
        </div>
      )}

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>מספר אישי</TableHead>
              <TableHead>פלוגה</TableHead>
              <TableHead>טלפון</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>עתודה</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="font-medium">{e.full_name}</TableCell>
                <TableCell>{e.personal_number}</TableCell>
                <TableCell>{e.company_platoon ?? "-"}</TableCell>
                <TableCell>{e.phone ?? "-"}</TableCell>
                <TableCell>
                  <RosterStatusBadge status={e.status} />
                </TableCell>
                <TableCell>
                  {e.is_reserve === 1 ? (
                    <span className="text-xs text-amber-700 font-semibold">עתודה</span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell className="text-end whitespace-nowrap">
                  {canEdit && !quota.locked && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs"
                        disabled={movingId === e.id || (e.is_reserve === 1 && full)}
                        onClick={() => toggleReserve(e)}
                      >
                        {movingId === e.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <ArrowLeftRight className="size-4" />
                        )}
                        {e.is_reserve === 1 ? "העבר להקצאה" : "העבר לעתודה"}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={removingId === e.id}
                        onClick={() => remove(e)}
                      >
                        {removingId === e.id ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                      </Button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                  הגדוד לא שיבץ עדיין חיילים להסמכה זו.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
