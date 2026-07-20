import Link from "next/link";
import { listCertifications } from "@/lib/db/repositories/certifications";
import { getCurrentUser } from "@/lib/auth/user";
import { canEdit } from "@/lib/auth/permissions";
import { CertificationStatusBadge } from "@/components/certifications/status-badge";
import { Button } from "@/components/ui/button";
import { DateRange } from "@/components/ui/date-range";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CertificationsPage() {
  const [certifications, me] = await Promise.all([listCertifications(), getCurrentUser()]);
  const canEditData = canEdit(me);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">הסמכות</h1>
        {canEditData && (
          <Button asChild>
            <Link href="/certifications/new">
              <Plus className="size-4" />
              הסמכה חדשה
            </Link>
          </Button>
        )}
      </div>

      <div className="border rounded-md overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>שם</TableHead>
              <TableHead>תחום</TableHead>
              <TableHead>תאריך</TableHead>
              <TableHead>מיקום</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>רשומים</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {certifications.map((c) => (
              <TableRow key={c.id} className="cursor-pointer">
                <TableCell>
                  <Link href={`/certifications/${c.id}`} className="hover:underline font-medium">
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell>{c.domain ?? "-"}</TableCell>
                <TableCell>
                  <DateRange start={c.start_date} end={c.end_date} />
                </TableCell>
                <TableCell>{c.location ?? "-"}</TableCell>
                <TableCell>
                  <CertificationStatusBadge status={c.status} />
                </TableCell>
                <TableCell>
                  {c.registered_count}
                  {c.slots_remaining !== null ? ` / ${c.total_slots}` : ""}
                </TableCell>
              </TableRow>
            ))}
            {certifications.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-6">
                  אין הסמכות עדיין.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
