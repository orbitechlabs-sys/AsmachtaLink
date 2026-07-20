import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/user";
import { canManageUsers } from "@/lib/auth/permissions";
import { listAllUsers, listPendingUsers } from "@/lib/db/repositories/users";
import { UsersManager } from "@/components/admin/users-manager";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "ניהול הרשאות · מערכת ניהול הסמכות",
};

export default async function PermissionsPage() {
  const me = await getCurrentUser();
  if (!canManageUsers(me)) redirect("/");

  const [pending, all] = await Promise.all([listPendingUsers(), listAllUsers()]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ניהול הרשאות משתמשים</h1>
      <UsersManager pending={pending} all={all} currentUserId={me!.id} />
    </div>
  );
}
