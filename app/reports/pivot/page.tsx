import { format } from "date-fns";
import { listBattalions } from "@/lib/db/repositories/battalions";
import {
  countSoldiersByBattalion,
  listDomainsWithCertifications,
} from "@/lib/db/repositories/certification-pivot";
import { listSavedWidgets } from "@/lib/db/repositories/pivot-widgets";
import { pivotWidgetConfigSchema } from "@/lib/validation/pivot";
import { PivotWidgets, type SavedWidgetView } from "@/components/reports/pivot-widgets";

export const dynamic = "force-dynamic";

export default async function PivotReportPage() {
  // Picker data and saved widgets are read here so the first paint needs no client
  // round-trip; /api/reports/pivot/{options,widgets} serve the same data for refreshes.
  const [battalions, domains, saved] = await Promise.all([
    listBattalions(),
    listDomainsWithCertifications(),
    listSavedWidgets(),
  ]);

  // Counts for saved widgets are computed here so their charts are on screen right
  // away. `config` is jsonb, so it is re-validated before use — a hand-edited or stale
  // row degrades to "press עדכן" instead of throwing on the page.
  const savedWidgets: SavedWidgetView[] = await Promise.all(
    saved.map(async (widget) => {
      const parsed = pivotWidgetConfigSchema.safeParse(widget.config);
      return {
        widget,
        rows: parsed.success ? await countSoldiersByBattalion(parsed.data) : null,
      };
    })
  );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">פילוח הסמכות</h1>
      <PivotWidgets
        battalions={battalions}
        domains={domains}
        today={format(new Date(), "yyyy-MM-dd")}
        savedWidgets={savedWidgets}
      />
    </div>
  );
}
