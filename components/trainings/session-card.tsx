"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Battalion, TrainingSession } from "@/lib/types";

interface Props {
  trainingId: number;
  session: TrainingSession;
  battalion?: Battalion;
  battalions: Battalion[];
  canManage: boolean;
}

export function SessionCard({ trainingId, session, battalion, battalions, canManage }: Props) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    battalion_id: session.battalion_id,
    session_date: session.session_date,
    start_time: session.start_time,
    end_time: session.end_time,
    location: session.location ?? "",
    instructor_name: session.instructor_name ?? "",
    instructor_phone: session.instructor_phone ?? "",
  });

  const color = battalion?.color_hex ?? "#64748B";

  async function save() {
    setSaving(true);
    const res = await fetch(`/api/trainings/${trainingId}/sessions/${session.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error("העדכון נכשל");
      return;
    }
    toast.success("הבלוק עודכן");
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("למחוק את הבלוק?")) return;
    const res = await fetch(`/api/trainings/${trainingId}/sessions/${session.id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      toast.error("המחיקה נכשלה");
      return;
    }
    toast.success("הבלוק נמחק");
    router.refresh();
  }

  if (editing) {
    return (
      <div className="rounded-lg border p-3 space-y-2 bg-card">
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">יחידה</Label>
            <select
              className="border rounded-md h-9 px-2 w-full bg-background text-sm"
              value={form.battalion_id}
              onChange={(e) => setForm((f) => ({ ...f, battalion_id: Number(e.target.value) }))}
            >
              {battalions.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">תאריך</Label>
            <Input
              type="date"
              value={form.session_date}
              onChange={(e) => setForm((f) => ({ ...f, session_date: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">שעת התחלה</Label>
            <Input
              type="time"
              value={form.start_time}
              onChange={(e) => setForm((f) => ({ ...f, start_time: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">שעת סיום</Label>
            <Input
              type="time"
              value={form.end_time}
              onChange={(e) => setForm((f) => ({ ...f, end_time: e.target.value }))}
            />
          </div>
          <div className="space-y-1 col-span-2">
            <Label className="text-xs">מיקום</Label>
            <Input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">מדריך</Label>
            <Input
              value={form.instructor_name}
              onChange={(e) => setForm((f) => ({ ...f, instructor_name: e.target.value }))}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">טלפון מדריך</Label>
            <Input
              value={form.instructor_phone}
              onChange={(e) => setForm((f) => ({ ...f, instructor_phone: e.target.value }))}
            />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1 text-sm text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            <Check className="size-4" /> שמור
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" /> ביטול
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-lg p-3 shadow-sm text-white relative"
      style={{ backgroundColor: color }}
    >
      {canManage && (
        <div className="absolute top-2 left-2 flex gap-1">
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label="עריכה"
            className="p-1 rounded hover:bg-white/20"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={remove}
            aria-label="מחיקה"
            className="p-1 rounded hover:bg-white/20"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="font-semibold text-sm">
          גדוד {battalion?.code ?? "?"}
          {session.instructor_name ? ` · ${session.instructor_name}` : ""}
        </div>
        <span
          className="shrink-0 rounded bg-white/20 px-1.5 py-0.5 text-xs font-medium"
          dir="ltr"
        >
          {session.start_time}–{session.end_time}
        </span>
      </div>
      {session.location && <div className="text-sm mt-1">{session.location}</div>}
      {session.instructor_phone && (
        <div className="text-sm mt-0.5" dir="ltr">
          {session.instructor_phone}
        </div>
      )}
    </div>
  );
}
