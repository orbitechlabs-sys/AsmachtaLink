"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays, format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function toIso(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export function DateRangePicker({ from, to }: { from: string; to: string }) {
  const router = useRouter();
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);

  function apply(newFrom: string, newTo: string) {
    setDraftFrom(newFrom);
    setDraftTo(newTo);
    router.push(`/reports?from=${newFrom}&to=${newTo}`);
  }

  function quickRange(days: number) {
    const start = new Date();
    apply(toIso(start), toIso(addDays(start, days)));
  }

  return (
    <div className="no-print flex flex-wrap items-end gap-3 rounded-lg border p-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => quickRange(7)}>
          שבוע קדימה
        </Button>
        <Button variant="outline" size="sm" onClick={() => quickRange(14)}>
          שבועיים קדימה
        </Button>
        <Button variant="outline" size="sm" onClick={() => quickRange(30)}>
          חודש קדימה
        </Button>
      </div>
      <div className="flex items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">מתאריך</Label>
          <Input
            type="date"
            value={draftFrom}
            onChange={(e) => setDraftFrom(e.target.value)}
            className="h-8"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">עד תאריך</Label>
          <Input type="date" value={draftTo} onChange={(e) => setDraftTo(e.target.value)} className="h-8" />
        </div>
        <Button size="sm" onClick={() => apply(draftFrom, draftTo)}>
          עדכן
        </Button>
      </div>
    </div>
  );
}
