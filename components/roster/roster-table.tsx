"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RosterStatusBadge } from "@/components/certifications/status-badge";
import { Trash2, Pencil } from "lucide-react";
import type { Battalion, RosterEntry } from "@/lib/types";

export function RosterTable({
  certificationId,
  entries,
  battalions,
  canManage,
}: {
  certificationId: number;
  entries: RosterEntry[];
  battalions: Battalion[];
  canManage: boolean;
}) {
  const router = useRouter();
  const battalionMap = new Map(battalions.map((b) => [b.id, b]));

  async function handleDelete(entryId: number) {
    if (!confirm("להסיר את החייל מההסמכה?")) return;
    const res = await fetch(`/api/roster/${entryId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("המחיקה נכשלה");
      return;
    }
    toast.success("החייל הוסר");
    router.refresh();
  }

  return (
    <div className="border rounded-md overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>שם</TableHead>
            <TableHead>מספר אישי</TableHead>
            <TableHead>גדוד</TableHead>
            <TableHead>פלוגה</TableHead>
            <TableHead>טלפון</TableHead>
            <TableHead>סטטוס</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map((e) => (
            <TableRow key={e.id}>
              <TableCell>{e.full_name}</TableCell>
              <TableCell>{e.personal_number}</TableCell>
              <TableCell>
                <span style={{ color: battalionMap.get(e.battalion_id)?.color_hex }}>
                  {battalionMap.get(e.battalion_id)?.name ?? "-"}
                </span>
              </TableCell>
              <TableCell>{e.company_platoon ?? "-"}</TableCell>
              <TableCell>{e.phone ?? "-"}</TableCell>
              <TableCell>
                <RosterStatusBadge status={e.status} />
              </TableCell>
              <TableCell className="flex gap-1 justify-end">
                <Button variant="ghost" size="icon" asChild>
                  <Link href={`/certifications/${certificationId}/roster/${e.id}/edit`}>
                    <Pencil className="size-4" />
                  </Link>
                </Button>
                {canManage && (
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(e.id)}>
                    <Trash2 className="size-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))}
          {entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground py-6">
                אין חיילים רשומים עדיין.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
