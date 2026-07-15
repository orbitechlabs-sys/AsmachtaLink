"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { FileDown, FileSpreadsheet, Loader2 } from "lucide-react";
import {
  REQUEST_STATUS_LABELS,
  URGENCY_LABELS,
  type Battalion,
  type BattalionRequest,
  type Urgency,
  type RequestStatus,
} from "@/lib/types";
import type { GapRow } from "@/lib/db/repositories/certification-gaps";
import { downloadBlob } from "@/lib/utils/download-file";
import { exportElementToPdf } from "@/lib/utils/export-pdf";

const CONTENT_ID = "requests-page-content";

export function RequestsExportActions({
  gapRows,
  gapBattalions,
  requests,
  battalionMap,
}: {
  gapRows: GapRow[];
  gapBattalions: Battalion[];
  requests: BattalionRequest[];
  battalionMap: Map<number, Battalion>;
}) {
  const [exportingPdf, setExportingPdf] = useState(false);

  async function exportPdf() {
    setExportingPdf(true);
    try {
      await exportElementToPdf(CONTENT_ID, "פערי_הסמכות_ודרישות_גדודים.pdf");
    } catch (err) {
      console.error("PDF export failed", err);
      toast.error("ייצוא ה-PDF נכשל");
    } finally {
      setExportingPdf(false);
    }
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const workbook = XLSX.utils.book_new();

    const gapSheetRows = gapRows.map((row) => {
      const record: Record<string, string | number> = {
        "שם ההסמכה": row.certification_name,
      };
      for (const b of gapBattalions) {
        record[b.name] = row.values[b.id] ?? 0;
      }
      record["סה״כ"] = row.total;
      return record;
    });
    const gapSheet = XLSX.utils.json_to_sheet(gapSheetRows);
    XLSX.utils.book_append_sheet(workbook, gapSheet, "פערי הסמכות");

    const requestRows = requests.map((r) => ({
      גדוד: battalionMap.get(r.battalion_id)?.name ?? "",
      "סוג הסמכה מבוקש": r.requested_cert_type,
      כמות: r.quantity_needed,
      דחיפות: URGENCY_LABELS[r.urgency as Urgency],
      סטטוס: REQUEST_STATUS_LABELS[r.status as RequestStatus],
      "נפתחה בתאריך": new Date(r.created_at).toLocaleDateString("he-IL"),
    }));
    const requestSheet = XLSX.utils.json_to_sheet(requestRows);
    XLSX.utils.book_append_sheet(workbook, requestSheet, "דרישות גדודים");

    const wbout = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    downloadBlob(
      new Blob([wbout], { type: "application/octet-stream" }),
      "פערי_הסמכות_ודרישות_גדודים.xlsx"
    );
  }

  return (
    <div className="no-print flex gap-2 flex-wrap">
      <Button onClick={exportPdf} disabled={exportingPdf}>
        {exportingPdf ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
        {exportingPdf ? "מכין PDF..." : "ייצוא ל-PDF"}
      </Button>
      <Button variant="outline" onClick={exportExcel}>
        <FileSpreadsheet className="size-4" />
        ייצוא ל-Excel
      </Button>
    </div>
  );
}

export { CONTENT_ID as REQUESTS_PAGE_CONTENT_ID };
