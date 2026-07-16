import { listBattalions } from "@/lib/db/repositories/battalions";
import { TrainingForm } from "@/components/trainings/training-form";

export const dynamic = "force-dynamic";

export default async function NewTrainingPage() {
  const battalions = await listBattalions();

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">הדרכה חדשה</h1>
      <TrainingForm battalions={battalions} />
    </div>
  );
}
