"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Trash2, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  USER_ROLES,
  USER_ROLE_LABELS,
  USER_STATUS_LABELS,
  type AppUser,
  type UserRole,
} from "@/lib/types";

function formatDate(iso: string) {
  const [date] = iso.split("T");
  const [year, month, day] = (date ?? "").split("-");
  return year && month && day ? `${day}/${month}/${year}` : iso;
}

function statusBadgeClass(status: AppUser["status"]) {
  switch (status) {
    case "approved":
      return "bg-emerald-500 text-white";
    case "pending":
      return "bg-amber-500 text-white";
    default:
      return "bg-rose-500 text-white";
  }
}

export function UsersManager({
  pending,
  all,
  currentUserId,
}: {
  pending: AppUser[];
  all: AppUser[];
  currentUserId: string;
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);

  async function patchUser(id: string, body: Record<string, unknown>, successMsg: string) {
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setBusyId(null);
    if (!res.ok) {
      toast.error("הפעולה נכשלה");
      return;
    }
    toast.success(successMsg);
    router.refresh();
  }

  async function deleteUser(id: string, name: string) {
    if (!confirm(`להסיר את הגישה של ${name}?`)) return;
    setBusyId(id);
    const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      toast.error("ההסרה נכשלה");
      return;
    }
    toast.success("הגישה הוסרה");
    router.refresh();
  }

  function approve(id: string, role: "viewer" | "editor") {
    patchUser(
      id,
      { action: "approve", role },
      role === "editor" ? "המשתמש אושר כעורך" : "המשתמש אושר כצופה"
    );
  }

  function changeRole(id: string, role: UserRole) {
    patchUser(id, { action: "set_role", role }, "התפקיד עודכן");
  }

  return (
    <div className="space-y-8">
      {/* Pending registrations */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <UserCheck className="size-5 text-amber-600" />
          ממתינים לאישור ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-sm text-muted-foreground">אין משתמשים הממתינים לאישור.</p>
        ) : (
          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>שם מלא</TableHead>
                  <TableHead>אימייל</TableHead>
                  <TableHead>תאריך הרשמה</TableHead>
                  <TableHead>פעולות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name ?? "-"}</TableCell>
                    <TableCell dir="ltr">{u.email}</TableCell>
                    <TableCell>{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          disabled={busyId === u.id}
                          onClick={() => approve(u.id, "viewer")}
                        >
                          <Check className="size-4" />
                          אישור כצופה
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={busyId === u.id}
                          onClick={() => approve(u.id, "editor")}
                        >
                          <Check className="size-4" />
                          אישור כעורך
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          disabled={busyId === u.id}
                          onClick={() => deleteUser(u.id, u.full_name ?? u.email)}
                        >
                          <Trash2 className="size-4" />
                          דחייה
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>

      {/* All users */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">כל המשתמשים ({all.length})</h2>
        <div className="border rounded-md overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>שם מלא</TableHead>
                <TableHead>אימייל</TableHead>
                <TableHead>תפקיד</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead>תאריך הרשמה</TableHead>
                <TableHead>פעולות</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {all.map((u) => {
                const isSelf = u.id === currentUserId;
                return (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">
                      {u.full_name ?? "-"}
                      {isSelf && <span className="text-muted-foreground"> (אתה)</span>}
                    </TableCell>
                    <TableCell dir="ltr">{u.email}</TableCell>
                    <TableCell>
                      <select
                        className="border rounded-md h-8 px-2 bg-background text-sm disabled:opacity-50"
                        value={u.role}
                        disabled={busyId === u.id || isSelf || u.status !== "approved"}
                        onChange={(e) => changeRole(u.id, e.target.value as UserRole)}
                      >
                        {USER_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {USER_ROLE_LABELS[r]}
                          </option>
                        ))}
                      </select>
                    </TableCell>
                    <TableCell>
                      <Badge className={statusBadgeClass(u.status)}>
                        {USER_STATUS_LABELS[u.status]}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatDate(u.created_at)}</TableCell>
                    <TableCell>
                      {!isSelf && u.status !== "rejected" && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          aria-label="הסרת גישה"
                          disabled={busyId === u.id}
                          onClick={() => deleteUser(u.id, u.full_name ?? u.email)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>
    </div>
  );
}
