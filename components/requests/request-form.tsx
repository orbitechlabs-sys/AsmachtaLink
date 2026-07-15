"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { z } from "zod";
import { requestSchema, type RequestFormValues } from "@/lib/validation/request";

type RequestInputValues = z.input<typeof requestSchema>;
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { URGENCY_LABELS, URGENCY_LEVELS, type Battalion } from "@/lib/types";

export function RequestForm({
  battalions,
  defaultBattalionId,
}: {
  battalions: Battalion[];
  defaultBattalionId?: number;
}) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestInputValues, unknown, RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: {
      battalion_id: defaultBattalionId ?? battalions[0]?.id,
      requested_cert_type: "",
      quantity_needed: 1,
      reason: "",
      urgency: "normal",
      desired_date: "",
      notes: "",
    },
  });

  async function onSubmit(values: RequestFormValues) {
    setSubmitting(true);
    const res = await fetch("/api/requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error("שליחת הדרישה נכשלה");
      return;
    }
    toast.success("הדרישה נשלחה");
    router.push("/requests");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-xl">
      <div className="space-y-1.5">
        <Label>גדוד</Label>
        <select
          className="border rounded-md h-9 px-2 w-full bg-background"
          disabled={battalions.length === 1}
          {...register("battalion_id", { valueAsNumber: true })}
        >
          {battalions.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>סוג ההסמכה הנדרשת</Label>
        <Input {...register("requested_cert_type")} placeholder="לדוגמה: נהגי טיגריס" />
        {errors.requested_cert_type && (
          <p className="text-xs text-destructive">{errors.requested_cert_type.message}</p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>כמות חיילים נדרשת</Label>
          <Input type="number" min={1} {...register("quantity_needed", { valueAsNumber: true })} />
        </div>
        <div className="space-y-1.5">
          <Label>דחיפות</Label>
          <select className="border rounded-md h-9 px-2 w-full bg-background" {...register("urgency")}>
            {URGENCY_LEVELS.map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABELS[u]}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="space-y-1.5">
        <Label>תאריך רצוי (אופציונלי)</Label>
        <Input type="date" {...register("desired_date")} />
      </div>
      <div className="space-y-1.5">
        <Label>סיבה / פער מבצעי</Label>
        <Textarea {...register("reason")} />
      </div>
      <div className="space-y-1.5">
        <Label>הערות נוספות</Label>
        <Textarea {...register("notes")} />
      </div>
      <div className="flex gap-2">
        <Button type="submit" disabled={submitting}>
          שלח דרישה
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          ביטול
        </Button>
      </div>
    </form>
  );
}
