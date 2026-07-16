import { notFound } from "next/navigation";
import { getTrainingById, listSessionsForTraining } from "@/lib/db/repositories/trainings";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { TrainingForm } from "@/components/trainings/training-form";

export const dynamic = "force-dynamic";

export default async function EditTrainingPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const training = await getTrainingById(Number(id));
  if (!training) notFound();

  const [sessions, battalions] = await Promise.all([
    listSessionsForTraining(training.id),
    listBattalions(),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">עריכת הדרכה</h1>
      <TrainingForm
        battalions={battalions}
        trainingId={training.id}
        defaultValues={{
          name: training.name,
          domain: training.domain ?? "",
          start_date: training.start_date,
          end_date: training.end_date ?? "",
          contact_name: training.contact_name ?? "",
          contact_phone: training.contact_phone ?? "",
          notes: training.notes ?? "",
        }}
        defaultSessions={sessions}
      />
    </div>
  );
}
