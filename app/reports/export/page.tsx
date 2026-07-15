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

export default function ExportPickerPage() {
  const router = useRouter();
  const today = new Date();
  const [from, setFrom] = useState(toIso(today));
  const [to, setTo] = useState(toIso(addDays(today, 7)));

  function quickRange(days: number) {
    const start = new Date();
    setFrom(toIso(start));
    setTo(toIso(addDays(start, days)));
  }

  function openExport() {
    router.push(`/reports/export/print?from=${from}&to=${to}`);
  }

  return (
    <div className="space-y-6 max-w-xl">
      <h1 className="text-2xl font-bold">ייצוא סיכום הסמכות לפי טווח תאריכים</h1>
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
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>מתאריך</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>עד תאריך</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
      </div>
      <Button onClick={openExport}>הצג סיכום להדפסה / שיתוף</Button>
    </div>
  );
}
