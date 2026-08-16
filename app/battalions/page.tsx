import Link from "next/link";
import { listBattalions } from "@/lib/db/repositories/battalions";
import { getBattalionScope } from "@/lib/auth/scope";

export const dynamic = "force-dynamic";

export default async function BattalionsPage() {
  // Battalion-scoped roles see only their own battalion; global roles see all.
  const scope = await getBattalionScope();
  const all = await listBattalions();
  const battalions = scope ? all.filter((b) => b.id === scope.battalionId) : all;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">גדודים</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {battalions.map((b) => (
          <Link
            key={b.id}
            href={`/battalions/${b.code}`}
            className="rounded-lg border-e-4 bg-card shadow-sm p-4 hover:shadow-md transition-shadow flex items-center gap-3"
            style={{ borderInlineEndColor: b.color_hex }}
          >
            <span
              className="size-8 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: b.color_hex }}
            />
            <span className="font-bold text-lg">{b.name}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
