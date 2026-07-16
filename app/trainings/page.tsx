import Link from "next/link";
import { listTrainings } from "@/lib/db/repositories/trainings";
import { getCurrentRole } from "@/lib/auth/current-role";
import { canManageTrainings } from "@/lib/auth/permissions";
import { Button } from "@/components/ui/button";
import { TrainingsListTabs } from "@/components/trainings/trainings-list-tabs";
import { Plus } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function TrainingsPage() {
  const [trainings, role] = await Promise.all([listTrainings(), getCurrentRole()]);
  const canManage = canManageTrainings(role);

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = trainings.filter((t) => (t.end_date || t.start_date) >= today);
  const past = trainings.filter((t) => (t.end_date || t.start_date) < today);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">הדרכות</h1>
        {canManage && (
          <Button asChild>
            <Link href="/trainings/new">
              <Plus className="size-4" />
              הדרכה חדשה
            </Link>
          </Button>
        )}
      </div>

      <TrainingsListTabs upcoming={upcoming} past={past} />
    </div>
  );
}
