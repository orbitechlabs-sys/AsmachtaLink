"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  Check,
  CheckSquare,
  ChevronDown,
  Loader2,
  Pencil,
  RefreshCw,
  Save,
  Square,
  Trash2,
  X,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PivotBarChart } from "@/components/reports/pivot-bar-chart";
import { battalionBarStyle, battalionChipStyle } from "@/lib/utils/battalion-style";
import { cn } from "@/lib/utils";
import type { Battalion, PivotWidgetConfig } from "@/lib/types";
import type {
  BattalionSoldierCount,
  PivotDomainOption,
} from "@/lib/db/repositories/certification-pivot";

/** Comparable fingerprint of what a widget would be saved as. Ids are sorted so merely
 * unchecking and rechecking a box (which reorders the array) does not read as a change. */
function widgetFingerprint(name: string, config: PivotWidgetConfig): string {
  return JSON.stringify({
    name: name.trim(),
    battalionIds: [...config.battalionIds].sort((a, b) => a - b),
    certificationIds: [...config.certificationIds].sort((a, b) => a - b),
    fromDate: config.fromDate,
    toDate: config.toDate || null,
  });
}

/** Domain to preselect in the picker so opening "עריכה" on a saved widget shows the
 * checklist its certifications came from. */
function initialDomainFor(
  config: PivotWidgetConfig | null | undefined,
  domains: PivotDomainOption[]
): string {
  if (!config?.certificationIds.length) return "";
  const selected = new Set(config.certificationIds);
  return domains.find((d) => d.certifications.some((c) => selected.has(c.id)))?.domain ?? "";
}

/**
 * One widget: its own name, configuration and chart.
 *
 * A widget is either *saved* (persisted in `pivot_report_widgets`, visible to everyone,
 * `savedId` set) or *in-progress* (React state only). Live edits always stay in React
 * state; the database is the source of truth for what has been saved.
 *
 * Configuration state lives on this component rather than inside the collapsible panel,
 * so collapsing it (which unmounts the panel's DOM) never resets the config or chart.
 */
export function PivotWidgetCard({
  savedId,
  defaultName,
  battalions,
  domains,
  defaultFromDate,
  initialConfig,
  initialRows,
  onRemove,
  onSaved,
  onDeleted,
}: {
  /** Set for a persisted widget; null/undefined for an in-progress one. */
  savedId?: string | null;
  defaultName: string;
  battalions: Battalion[];
  domains: PivotDomainOption[];
  defaultFromDate: string;
  initialConfig?: PivotWidgetConfig | null;
  /** Counts computed on the server so a saved widget shows its chart immediately. */
  initialRows?: BattalionSoldierCount[] | null;
  /** Drops an in-progress widget from local state. */
  onRemove: () => void;
  /** Called after a successful save, so the board can reload from the database. */
  onSaved: () => void;
  /** Called after a successful delete. */
  onDeleted: () => void;
}) {
  const isSaved = Boolean(savedId);

  const [name, setName] = useState(defaultName);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(defaultName);
  const [configOpen, setConfigOpen] = useState(false);
  const [fromDate, setFromDate] = useState(initialConfig?.fromDate ?? defaultFromDate);
  const [toDate, setToDate] = useState(initialConfig?.toDate ?? "");
  const [battalionIds, setBattalionIds] = useState<number[]>(initialConfig?.battalionIds ?? []);
  const [activeDomain, setActiveDomain] = useState(() => initialDomainFor(initialConfig, domains));
  const [certificationIds, setCertificationIds] = useState<number[]>(
    initialConfig?.certificationIds ?? []
  );
  const [rows, setRows] = useState<BattalionSoldierCount[] | null>(initialRows ?? null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // What this widget looks like in the database right now. Re-baselined after every
  // successful save so "שמור" goes quiet again until the next edit.
  const [savedFingerprint, setSavedFingerprint] = useState(() =>
    initialConfig ? widgetFingerprint(defaultName, initialConfig) : ""
  );

  // The checklist below is the single source of truth for which certifications are
  // selected — there is deliberately no separate "selected" chip row.
  const domainCertifications =
    domains.find((d) => d.domain === activeDomain)?.certifications ?? [];
  const domainCertIds = domainCertifications.map((c) => c.id);
  const allInDomainSelected =
    domainCertIds.length > 0 && domainCertIds.every((id) => certificationIds.includes(id));

  function startEditingName() {
    setDraftName(name);
    setEditingName(true);
  }

  function commitName() {
    const trimmed = draftName.trim();
    // An empty name would leave the card unlabelled — keep the previous one.
    if (trimmed) setName(trimmed);
    setEditingName(false);
  }

  function toggleBattalion(id: number) {
    setBattalionIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]
    );
  }

  function toggleCertification(id: number) {
    setCertificationIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    );
  }

  /** Select-all / clear-all scoped to the domain on screen. Selections made in other
   * domains are left exactly as they are. */
  function toggleAllInDomain() {
    setCertificationIds((prev) => {
      const inDomain = new Set(domainCertIds);
      const allSelected =
        domainCertIds.length > 0 && domainCertIds.every((id) => prev.includes(id));
      if (allSelected) return prev.filter((id) => !inDomain.has(id));
      return [...prev, ...domainCertIds.filter((id) => !prev.includes(id))];
    });
  }

  /** Client-side mirror of lib/validation/pivot.ts, for both "עדכן" and "שמור". */
  function configError(): string | null {
    if (!fromDate) return "יש להזין תאריך התחלה";
    if (toDate && toDate < fromDate) return "תאריך הסיום חייב להיות מתאריך ההתחלה או אחריו";
    if (battalionIds.length === 0) return "יש לבחור לפחות גדוד אחד";
    if (certificationIds.length === 0) return "יש לבחור לפחות הסמכה אחת";
    return null;
  }

  function currentConfig(): PivotWidgetConfig {
    return { battalionIds, certificationIds, fromDate, toDate: toDate || null };
  }

  // A saved widget with unsaved edits (name included) offers "שמור" again; an untouched
  // one just shows that it is saved.
  const hasUnsavedChanges =
    !isSaved || widgetFingerprint(name, currentConfig()) !== savedFingerprint;

  async function apply() {
    const invalid = configError();
    if (invalid) return setError(invalid);

    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/reports/pivot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Field names must match lib/validation/pivot.ts exactly.
        body: JSON.stringify(currentConfig()),
      });
      if (!res.ok) throw new Error("request failed");
      setRows(await res.json());
    } catch {
      setError("טעינת הנתונים נכשלה");
    } finally {
      setLoading(false);
    }
  }

  async function save() {
    const invalid = configError();
    if (invalid) return setError(invalid);

    setError(null);
    setSaving(true);
    try {
      const config = currentConfig();
      const res = await fetch(
        savedId ? `/api/reports/pivot/widgets/${savedId}` : "/api/reports/pivot/widgets",
        {
          method: savedId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, config }),
        }
      );
      if (!res.ok) throw new Error("request failed");

      if (savedId) {
        // The card stays where it is: re-baseline so "שמור שינויים" goes quiet, and
        // refresh the chart so what is on screen matches what was just stored.
        setSavedFingerprint(widgetFingerprint(name, config));
        toast.success("השינויים נשמרו");
        await apply();
      } else {
        toast.success("הווידג׳ט נשמר וזמין לכל המשתמשים");
      }
      onSaved();
    } catch {
      toast.error("שמירת הווידג׳ט נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!savedId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/reports/pivot/widgets/${savedId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("request failed");
      toast.success("הווידג׳ט נמחק");
      setConfirmDelete(false);
      onDeleted();
    } catch {
      toast.error("מחיקת הווידג׳ט נכשלה");
      setConfirmDelete(false);
    } finally {
      setDeleting(false);
    }
  }

  const total = rows?.reduce((sum, r) => sum + r.soldier_count, 0) ?? 0;

  return (
    <section className={cn("space-y-3 border rounded-lg p-4", isSaved && "border-primary/30")}>
      <Collapsible open={configOpen} onOpenChange={setConfigOpen} className="space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="font-semibold">
              {editingName ? (
                <Input
                  autoFocus
                  value={draftName}
                  onChange={(e) => setDraftName(e.target.value)}
                  onBlur={commitName}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitName();
                    } else if (e.key === "Escape") {
                      e.preventDefault();
                      // Discard the draft; onBlur does not fire on unmount.
                      setEditingName(false);
                    }
                  }}
                  className="h-7 w-56 px-2 font-semibold"
                  aria-label="שם הווידג׳ט"
                />
              ) : (
                <button
                  type="button"
                  onClick={startEditingName}
                  title="לחץ לשינוי השם"
                  className="text-start rounded px-1 -mx-1 hover:bg-accent transition-colors truncate max-w-full"
                >
                  {name}
                </button>
              )}
            </h2>
            <p className="text-xs text-muted-foreground">
              מספר החיילים הרשומים מכל גדוד בהסמכות שנבחרו
            </p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <CollapsibleTrigger asChild>
              <Button variant="outline" size="sm">
                <Pencil className="size-4" />
                עריכה
                <ChevronDown
                  className={cn("size-4 transition-transform", configOpen && "rotate-180")}
                />
              </Button>
            </CollapsibleTrigger>

            {isSaved ? (
              <>
                {hasUnsavedChanges ? (
                  <Button size="sm" onClick={save} disabled={saving}>
                    {saving ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Save className="size-4" />
                    )}
                    שמור שינויים
                  </Button>
                ) : (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground px-1">
                    <Check className="size-3.5" />
                    נשמר
                  </span>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="size-4" />
                  מחק
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" size="sm" onClick={save} disabled={saving}>
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  שמור
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="הסרת ווידג׳ט"
                  onClick={onRemove}
                >
                  <X className="size-4" />
                </Button>
              </>
            )}
          </div>
        </div>

        <CollapsibleContent className="space-y-3 border-t pt-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">החל מתאריך</Label>
              <Input
                type="date"
                className="h-8"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">עד תאריך (אופציונלי)</Label>
              <Input
                type="date"
                className="h-8"
                value={toDate ?? ""}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">גדודים</Label>
            <div className="flex flex-wrap items-center gap-2">
              {battalions.map((b) => {
                const selected = battalionIds.includes(b.id);
                return (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => toggleBattalion(b.id)}
                    className={cn(
                      "text-xs font-semibold px-3 py-1 rounded-full border transition-all",
                      selected ? "text-white border-transparent shadow-sm" : "opacity-60"
                    )}
                    style={
                      selected ? battalionBarStyle(b.color_hex) : battalionChipStyle(b.color_hex)
                    }
                  >
                    {b.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">תחום</Label>
            <select
              className="border rounded-md h-8 px-2 w-full bg-background text-sm"
              value={activeDomain}
              onChange={(e) => setActiveDomain(e.target.value)}
            >
              <option value="">— בחר תחום —</option>
              {domains.map((d) => (
                <option key={d.domain} value={d.domain}>
                  {d.domain} ({d.certifications.length})
                </option>
              ))}
            </select>
          </div>

          {activeDomain && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs">הסמכות בתחום {activeDomain}</Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-6 px-2 text-xs"
                  disabled={domainCertifications.length === 0}
                  onClick={toggleAllInDomain}
                >
                  {allInDomainSelected ? (
                    <>
                      <Square className="size-3" />
                      נקה הכל
                    </>
                  ) : (
                    <>
                      <CheckSquare className="size-3" />
                      סמן הכל
                    </>
                  )}
                </Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 max-h-44 overflow-y-auto border rounded-md p-2">
                {domainCertifications.map((c) => (
                  <label key={c.id} className="flex items-start gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={certificationIds.includes(c.id)}
                      onChange={() => toggleCertification(c.id)}
                    />
                    <span>
                      {c.name}
                      <span className="text-muted-foreground text-xs"> · {c.start_date}</span>
                    </span>
                  </label>
                ))}
                {domainCertifications.length === 0 && (
                  <p className="text-sm text-muted-foreground">אין הסמכות בתחום זה.</p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={apply} disabled={loading}>
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <RefreshCw className="size-4" />
              )}
              עדכן
            </Button>
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {rows === null ? (
        <p className="text-sm text-muted-foreground border-t pt-3">
          בחר גדודים, תחום והסמכות ולחץ „עדכן“ להצגת הפילוח.
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground border-t pt-3">אין גדודים להצגה.</p>
      ) : (
        <div className="border-t pt-3 space-y-1">
          <p className="text-xs text-muted-foreground">
            סה״כ {total} חיילים · {certificationIds.length} הסמכות · מ־{fromDate}
            {toDate ? ` עד ${toDate}` : " ואילך"}
          </p>
          <PivotBarChart rows={rows} />
        </div>
      )}

      <AlertDialog
        open={confirmDelete}
        onOpenChange={(open) => {
          if (!open && !deleting) setConfirmDelete(false);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת ווידג׳ט</AlertDialogTitle>
            <AlertDialogDescription>
              האם אתה בטוח שברצונך למחוק את &quot;{name}&quot;? הווידג׳ט יימחק עבור כל
              המשתמשים.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className={cn(buttonVariants({ variant: "destructive" }))}
              disabled={deleting}
              onClick={(e) => {
                // Keep the dialog open while the request runs; close on outcome.
                e.preventDefault();
                remove();
              }}
            >
              {deleting && <Loader2 className="size-4 animate-spin" />}
              אישור
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
