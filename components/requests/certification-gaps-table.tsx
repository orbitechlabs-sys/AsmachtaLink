"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Trash2 } from "lucide-react";
import type { Battalion } from "@/lib/types";
import type { GapRow } from "@/lib/db/repositories/certification-gaps";

export function CertificationGapsTable({
  rows,
  battalions,
  canEdit,
}: {
  rows: GapRow[];
  battalions: Battalion[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [newName, setNewName] = useState("");
  const [adding, setAdding] = useState(false);

  async function updateValue(rowId: number, battalionId: number, value: string) {
    const gapCount = Math.max(0, Number(value) || 0);
    await fetch(`/api/certification-gaps/${rowId}/value`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ battalion_id: battalionId, gap_count: gapCount }),
    });
    startTransition(() => router.refresh());
  }

  async function addRow() {
    const name = newName.trim();
    if (!name) return;
    setAdding(true);
    try {
      await fetch("/api/certification-gaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ certification_name: name }),
      });
      setNewName("");
      startTransition(() => router.refresh());
    } finally {
      setAdding(false);
    }
  }

  async function removeRow(rowId: number) {
    if (!window.confirm("למחוק את שורת ההסמכה הזו?")) return;
    await fetch(`/api/certification-gaps/${rowId}`, { method: "DELETE" });
    startTransition(() => router.refresh());
  }

  const grandTotals = battalions.map((b) => rows.reduce((sum, r) => sum + (r.values[b.id] ?? 0), 0));
  const grandTotal = grandTotals.reduce((a, b) => a + b, 0);

  return (
    <div className="rounded-lg border overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-primary text-primary-foreground">
            <th className="p-2 text-start font-bold">שם ההסמכה</th>
            {battalions.map((b) => (
              <th key={b.id} className="p-2 font-bold" style={{ backgroundColor: b.color_hex }}>
                {b.name}
              </th>
            ))}
            <th className="p-2 font-bold bg-muted-foreground/20">סה״כ</th>
            {canEdit && <th className="p-2 w-10"></th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t">
              <td className="p-2 font-medium">{row.certification_name}</td>
              {battalions.map((b) => (
                <td key={b.id} className="p-1 text-center">
                  {canEdit ? (
                    <Input
                      type="number"
                      min={0}
                      defaultValue={row.values[b.id] ?? 0}
                      className="h-8 w-16 text-center mx-auto"
                      onBlur={(e) => updateValue(row.id, b.id, e.target.value)}
                    />
                  ) : (
                    (row.values[b.id] ?? 0)
                  )}
                </td>
              ))}
              <td className="p-2 text-center font-bold bg-muted/50">{row.total}</td>
              {canEdit && (
                <td className="p-1 text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-7 text-muted-foreground hover:text-destructive"
                    onClick={() => removeRow(row.id)}
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </td>
              )}
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={battalions.length + 2} className="p-3 text-center text-muted-foreground">
                אין נתונים עדיין.
              </td>
            </tr>
          )}
        </tbody>
        {rows.length > 0 && (
          <tfoot>
            <tr className="border-t-2 bg-muted/30">
              <td className="p-2 font-bold">סה״כ</td>
              {grandTotals.map((t, i) => (
                <td key={i} className="p-2 text-center font-bold">
                  {t}
                </td>
              ))}
              <td className="p-2 text-center font-bold">{grandTotal}</td>
              {canEdit && <td></td>}
            </tr>
          </tfoot>
        )}
      </table>
      {canEdit && (
        <div className="flex items-center gap-2 p-2 border-t">
          <Input
            placeholder="שם הסמכה חדשה..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addRow()}
            className="h-8 max-w-xs"
          />
          <Button size="sm" variant="outline" onClick={addRow} disabled={adding || !newName.trim()}>
            <Plus className="size-4" />
            הוסף הסמכה
          </Button>
        </div>
      )}
    </div>
  );
}
