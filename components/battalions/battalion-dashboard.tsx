"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addWeeks,
  eachDayOfInterval,
  format,
  startOfWeek,
  subWeeks,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/ui/kpi-card";
import { RequestStatusBadge } from "@/components/certifications/status-badge";
import { BattalionRosterPanel } from "@/components/battalions/battalion-roster-panel";
import {
  assignLanes,
  WeekRow,
  WeekdayHeader,
  WEEK_LANE_HEIGHT,
  type DayNameGroup,
  type FillDot,
  type WeekBarMeta,
} from "@/components/calendar/week-row";
import type { CalendarItem } from "@/components/calendar/types";
import type { Battalion, BattalionRequest } from "@/lib/types";
import type {
  AdminConfirmationRow,
  BattalionAllocation,
  BattalionDashboardKpis,
  BattalionQuotaUsage,
  BattalionTask,
  QuarterKpi,
} from "@/lib/battalions/types";
import { openAllocationsOf, urgencyBand } from "@/lib/battalions/open-allocations";
import { ACTIVE_ROSTER_STATUSES } from "@/lib/utils/slots";
import { cn } from "@/lib/utils";

const MONTHS = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];

function quotaOf(a: BattalionAllocation): BattalionQuotaUsage {
  return {
    allocated: a.allocated_slots,
    used: a.registered,
    reserve: a.reserve,
    remaining: a.remaining,
    registration_lock_at: a.registration_lock_at,
    locked: !!a.registration_lock_at && new Date(a.registration_lock_at).getTime() < Date.now(),
  };
}

function fillDot(a: BattalionAllocation): FillDot {
  if (a.registered >= a.allocated_slots) return "full";
  if (a.registered === 0) return "none";
  return "part";
}

function countedNames(a: BattalionAllocation): string[] {
  return a.soldiers
    .filter((s) => s.is_reserve === 0 && ACTIVE_ROSTER_STATUSES.includes(s.status))
    .map((s) => `${s.full_name} · ${s.personal_number}`);
}

export function BattalionDashboard({
  battalion,
  summary,
  allocations,
  tasks,
  adminRows,
  quarter,
  requests,
  calendarItems,
  canEdit,
  scopedCertLinks,
}: {
  battalion: Battalion;
  summary: BattalionDashboardKpis;
  allocations: BattalionAllocation[];
  tasks: BattalionTask[];
  adminRows: AdminConfirmationRow[];
  quarter: QuarterKpi;
  requests: BattalionRequest[];
  calendarItems: CalendarItem[];
  canEdit: boolean;
  scopedCertLinks: boolean;
}) {
  const router = useRouter();
  const certificationHref = (certificationId: number) =>
    scopedCertLinks
      ? `/battalions/${battalion.code}/certifications/${certificationId}`
      : `/certifications/${certificationId}`;
  const [openId, setOpenId] = useState<number | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));
  const [showConfirmed, setShowConfirmed] = useState(false);
  const [showDoneTasks, setShowDoneTasks] = useState(false);

  const open = useMemo(() => openAllocationsOf(allocations), [allocations]);
  const closingSoon = open.filter((a) => a.daysToClose !== null && a.daysToClose <= 3).length;
  const pendingAdmin = adminRows.filter((r) => !r.confirmed_at);
  const over30 = pendingAdmin.filter((r) => r.waiting_days > 30).length;
  const gapTotal = summary.gaps.reduce((s, g) => s + g.gap, 0);

  const byId = useMemo(
    () => new Map(allocations.map((a) => [a.certification_id, a])),
    [allocations]
  );

  function openAlloc(id: number, force = false) {
    setOpenId((prev) => (!force && prev === id ? null : id));
  }

  const week = eachDayOfInterval({ start: weekStart, end: addWeeks(weekStart, 1) }).slice(0, 7);
  const weekEnd = week[6];
  const weekBars = calendarItems;
  const laneOf = useMemo(() => assignLanes(weekBars), [weekBars]);

  const metaByKey: Record<string, WeekBarMeta> = {};
  for (const item of weekBars) {
    if (item.kind !== "certification") continue;
    const a = byId.get(item.id);
    if (!a) continue;
    metaByKey[item.key] = { fill: fillDot(a), battalionColor: battalion.color_hex };
  }

  const nameGroupsByDay: DayNameGroup[][] = week.map((day) => {
    const iso = format(day, "yyyy-MM-dd");
    return allocations
      .filter((a) => a.start_date.slice(0, 10) === iso)
      .map((a) => {
        const names = countedNames(a);
        return {
          key: String(a.certification_id),
          name: a.name,
          color: a.color_hex || "#6b7280",
          filled: a.registered,
          allocated: a.allocated_slots,
          slots: Array.from({ length: a.allocated_slots }, (_, i) => ({
            name: names[i] ?? null,
          })),
          onOpen: () => openAlloc(a.certification_id, true),
        };
      });
  });

  const selected = openId != null ? byId.get(openId) : undefined;
  const openSlots = open.reduce((s, a) => s + a.remaining, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <span
              className="w-3.5 h-7 rounded-full shrink-0"
              style={{ backgroundColor: battalion.color_hex }}
            />
            <h1 className="text-2xl font-extrabold" style={{ color: battalion.color_hex }}>
              {battalion.name}
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            סיכום גדודי מלא של כלל ההסמכות, הפערים, ההקצאות והמעקב השלישותי.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard label='סה"כ פערי הסמכות' value={gapTotal} color="var(--kpi-gap)" />
        <KpiCard
          label="מקומות שהוקצו וממתינים לשמות"
          value={summary.totals.remaining}
          color="var(--kpi-slots)"
          delta={`ב-${open.length} הסמכות${closingSoon ? ` · ${closingSoon} נסגרות תוך 3 ימים` : ""}`}
        />
        <KpiCard
          label="ממתינים לאישור שלישותי"
          value={pendingAdmin.length}
          color="var(--kpi-admin)"
          delta={over30 ? `${over30} מעל 30 יום` : undefined}
        />
        <KpiCard
          label="סיימו הסמכה ברבעון"
          value={quarter.passed}
          color="var(--kpi-quarter)"
          delta={`מתוך ${quarter.registered} שנרשמו`}
        />
      </div>

      {open.length > 0 && (
        <div
          className="rounded-[var(--radius)] p-4 border-2"
          style={{
            borderColor: "var(--fs-ok-line)",
            backgroundColor: "var(--fs-ok-bg)",
          }}
        >
          <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-extrabold rounded-full px-2 py-0.5 border bg-white"
                style={{ borderColor: "var(--fs-ok-line)", color: "var(--fs-ok-ink)" }}
              >
                {open.length} הסמכות · {openSlots} מקומות פנויים
              </span>
              <span className="text-xs" style={{ color: "var(--fs-ok-ink)" }}>
                לחיצה על הסמכה פותחת מילוי שמות במקום.
              </span>
            </div>
            <h2 className="text-[1.05rem] font-bold" style={{ color: "var(--fs-ok-ink)" }}>
              הקצאות שקיבלת — ממתינות לשמות
            </h2>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(218px,1fr))] gap-2.5">
            {open.map((a) => {
              const urg = urgencyBand(a.daysToClose);
              const hot = urg === "hot";
              return (
                <button
                  key={a.certification_id}
                  type="button"
                  onClick={() => openAlloc(a.certification_id)}
                  className={cn(
                    "bg-white rounded-xl p-2.5 flex flex-col gap-2 text-start border-[1.5px] transition hover:-translate-y-0.5 hover:shadow-md",
                    openId === a.certification_id && "border-2 shadow-lg",
                    hot ? "border-[var(--fs-bad-line)]" : "border-[var(--fs-ok-line)]"
                  )}
                >
                  <span className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block text-[0.86rem] font-extrabold leading-tight">{a.name}</span>
                      <span className="block text-[0.66rem] font-semibold text-muted-foreground mt-0.5">
                        {fmt(a.start_date)}
                        {a.location ? ` · ${a.location}` : ""}
                      </span>
                    </span>
                    {a.daysToClose !== null && (
                      <span
                        className={cn(
                          "text-[0.61rem] font-extrabold px-1.5 py-0.5 rounded-full shrink-0",
                          urg === "hot" && "bg-[var(--fs-bad-pill)] text-[var(--fs-bad-ink)]",
                          urg === "warm" && "bg-[#fdf0d8] text-[#8a5a10]",
                          urg === "cool" && "bg-[var(--fs-ok-pill)] text-[var(--fs-ok-ink)]"
                        )}
                      >
                        {a.daysToClose} ימים
                      </span>
                    )}
                  </span>
                  <span className="flex gap-0.5 flex-wrap">
                    {Array.from({ length: a.allocated_slots }, (_, i) => (
                      <b
                        key={i}
                        className={cn(
                          "w-[13px] h-[13px] rounded-[3px] block",
                          i < a.registered
                            ? "bg-[#0f9d6e]"
                            : hot
                              ? "bg-white border-[1.5px] border-[var(--fs-bad-line)]"
                              : "bg-white border-[1.5px] border-dashed border-[#c2c8cf]"
                        )}
                      />
                    ))}
                  </span>
                  <span className="flex items-center justify-between gap-2">
                    <span
                      className="text-[0.73rem] font-extrabold tabular-nums"
                      style={{ color: hot ? "var(--fs-bad-ink)" : "var(--fs-ok-ink)" }}
                    >
                      {a.registered}/{a.allocated_slots} מולאו · חסרים {a.remaining}
                    </span>
                    <span className="text-[0.66rem] font-extrabold" style={{ color: "#0f7a5c" }}>
                      {openId === a.certification_id ? "סגור ▲" : "מלא שמות ▾"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
          {selected && (
            <div className="mt-3 bg-white border-2 rounded-xl p-4" style={{ borderColor: "#0f7a5c" }}>
              <div className="flex items-start justify-between gap-2 flex-wrap pb-3 mb-2 border-b">
                <div>
                  <h3 className="font-bold" style={{ color: selected.color_hex ?? undefined }}>
                    {selected.name}
                  </h3>
                  <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                    {fmt(selected.start_date)}
                    {selected.end_date ? `–${fmt(selected.end_date)}` : ""}
                    {selected.location ? ` · ${selected.location}` : ""}
                    {` · הוקצו ${selected.allocated_slots} מקומות`}
                    {selected.daysToClose !== null
                      ? ` · סגירת רישום בעוד ${selected.daysToClose} ימים`
                      : ""}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button asChild variant="outline" size="xs">
                    <Link href={certificationHref(selected.certification_id)}>פתח את ההסמכה במלואה</Link>
                  </Button>
                  <Button variant="outline" size="xs" onClick={() => setOpenId(null)}>
                    סגור
                  </Button>
                </div>
              </div>
              <BattalionRosterPanel
                battalionId={battalion.id}
                certificationId={selected.certification_id}
                entries={selected.soldiers}
                quota={quotaOf(selected)}
                canEdit={canEdit}
                variant="inline"
                onSaved={() => router.refresh()}
              />
            </div>
          )}
        </div>
      )}

      <div className="rounded-[var(--radius)] border bg-card">
        <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-primary" />
            <h2 className="font-bold">לוח שנה — הסמכות עם הקצאות ל{battalion.name}</h2>
          </div>
          <div className="flex gap-1.5 text-xs font-semibold">
            <span className="rounded-full px-2 py-0.5 border bg-[oklch(0.62_0.16_155_/_0.13)] border-[oklch(0.62_0.16_155_/_0.4)] text-[oklch(0.4_0.13_155)]">
              מולא
            </span>
            <span className="rounded-full px-2 py-0.5 border bg-[oklch(0.76_0.16_70_/_0.16)]">חלקי</span>
            <span className="rounded-full px-2 py-0.5 border bg-[oklch(0.62_0.24_15_/_0.12)]">אין שמות</span>
          </div>
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap border rounded-md px-2.5 py-2">
            <span className="font-extrabold text-[0.95rem]">
              {week[0].getDate()}–{weekEnd.getDate()} ב{MONTHS[weekEnd.getMonth()]} {weekEnd.getFullYear()}
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setWeekStart(addWeeks(weekStart, 1))}
                aria-label="שבוע הבא"
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-xs"
                onClick={() => setWeekStart(subWeeks(weekStart, 1))}
                aria-label="שבוע קודם"
              >
                <ChevronRight className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="xs"
                onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 0 }))}
              >
                היום
              </Button>
              <input
                type="date"
                className="h-7 text-xs border rounded-md px-1.5 bg-background"
                onChange={(e) => {
                  if (e.target.value) {
                    setWeekStart(startOfWeek(new Date(e.target.value + "T00:00:00"), { weekStartsOn: 0 }));
                  }
                }}
              />
            </div>
          </div>
          <WeekdayHeader />
          <WeekRow
            week={week}
            barItems={weekBars}
            laneOf={laneOf}
            laneHeight={WEEK_LANE_HEIGHT}
            minCellHeight="formula"
            metaByKey={metaByKey}
            nameGroupsByDay={nameGroupsByDay}
            onBarClick={(item) => {
              if (item.kind === "certification") openAlloc(item.id, true);
            }}
            emptyWeekMessage="אין הסמכות עם הקצאה לגדוד בשבוע זה."
            alignDayNumber="end"
          />
        </div>
      </div>

      <div className="rounded-[var(--radius)] border bg-card">
        <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-[var(--chart-4)]" />
            <h2 className="font-bold">משימות פתוחות</h2>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold rounded-full px-2 py-0.5 border bg-[oklch(0.76_0.16_70_/_0.16)]">
              {tasks.length} משימות
            </span>
            <Button variant="outline" size="xs" onClick={() => setShowDoneTasks(!showDoneTasks)}>
              {showDoneTasks ? "הסתר שטופלו" : "הצג גם משימות שטופלו"}
            </Button>
          </div>
        </div>
        <div className="px-4 py-2">
          {tasks.length === 0 && (
            <p className="text-sm text-emerald-700 py-3">אין משימות פתוחות כרגע</p>
          )}
          {tasks.map((t, i) => {
            const urg =
              t.days !== null && t.days <= 5 ? "bad" : t.days !== null && t.days <= 12 ? "warn" : "";
            return (
              <div key={i} className="flex items-center gap-3 py-2 border-b border-dashed last:border-0">
                <span
                  className={cn(
                    "w-[26px] h-[26px] rounded-md grid place-items-center text-xs font-extrabold shrink-0",
                    t.kind === "doc" && "bg-[#fdf0d8] text-[#8a5a10]",
                    t.kind === "adm" && "bg-[#ede4fb] text-[#5b21b6]",
                    t.kind === "slot" && "bg-[var(--fs-bad-pill)] text-[var(--fs-bad-ink)]",
                    t.kind === "prq" && "bg-[#dbeafe] text-[#1d4ed8]",
                    t.kind === "pn" && "bg-amber-100 text-amber-900"
                  )}
                >
                  {t.kind === "doc" ? "📄" : t.kind === "adm" ? "✓" : t.kind === "slot" ? "▢" : t.kind === "pn" ? "#" : "!"}
                </span>
                <span className="flex-1 text-[0.83rem] leading-snug">
                  <span className="font-bold">{t.text}</span>
                  <span className="block text-[0.68rem] font-semibold text-muted-foreground">{t.sub}</span>
                </span>
                {urg && (
                  <span
                    className={cn(
                      "text-xs font-semibold rounded-full px-2 py-0.5 border",
                      urg === "bad" && "bg-[oklch(0.62_0.24_15_/_0.12)] text-[oklch(0.45_0.2_15)]",
                      urg === "warn" && "bg-[oklch(0.76_0.16_70_/_0.16)]"
                    )}
                  >
                    {t.days} ימים
                  </span>
                )}
                {t.kind === "slot" && t.certification_id != null ? (
                  <Button size="xs" variant="outline" onClick={() => openAlloc(t.certification_id!, true)}>
                    למלא שמות ‹
                  </Button>
                ) : t.kind === "pn" ? (
                  <Button size="xs" variant="outline" asChild>
                    <Link href="/force-structure/pending-identity">הצג רשימה ‹</Link>
                  </Button>
                ) : t.certification_id != null ? (
                  <Button size="xs" variant="outline" asChild>
                    <Link href={certificationHref(t.certification_id)}>לעמוד ההסמכה ‹</Link>
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-[var(--radius)] border bg-card">
        <div className="flex items-center justify-between gap-2 flex-wrap px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-4 rounded-full bg-[var(--chart-2)]" />
            <h2 className="font-bold">סיימו הסמכה — לוודא אישור שלישותי</h2>
          </div>
          <span className="text-xs font-semibold rounded-full px-2 py-0.5 border bg-accent">
            {pendingAdmin.length} חיילים
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted-foreground text-[0.78rem]">
                <th className="text-right font-bold px-2.5 py-2 border-b">חייל</th>
                <th className="text-right font-bold px-2.5 py-2 border-b">מ.א.</th>
                <th className="text-right font-bold px-2.5 py-2 border-b">הסמכה</th>
                <th className="text-right font-bold px-2.5 py-2 border-b">סיים</th>
                <th className="text-right font-bold px-2.5 py-2 border-b">ממתין</th>
                <th className="text-right font-bold px-2.5 py-2 border-b">אושר?</th>
              </tr>
            </thead>
            <tbody>
              {adminRows
                .filter((r) => showConfirmed || !r.confirmed_at)
                .map((r) => {
                  const waitCls =
                    r.waiting_days > 30 ? "bad" : r.waiting_days >= 14 ? "warn" : "ok";
                  return (
                    <tr
                      key={r.roster_entry_id}
                      className={cn("border-b last:border-0", r.confirmed_at && "opacity-55")}
                    >
                      <td className="px-2.5 py-2">{r.full_name}</td>
                      <td className="px-2.5 py-2 tabular-nums font-semibold">{r.personal_number}</td>
                      <td className="px-2.5 py-2">{r.certification_name}</td>
                      <td className="px-2.5 py-2 tabular-nums">{r.end_date ? fmt(r.end_date) : "—"}</td>
                      <td className="px-2.5 py-2">
                        {r.confirmed_at ? (
                          <span className="text-xs font-semibold rounded-full px-2 py-0.5 border bg-[oklch(0.62_0.16_155_/_0.13)]">
                            אושר {fmt(r.confirmed_at)}
                          </span>
                        ) : (
                          <span
                            className={cn(
                              "text-xs font-semibold rounded-full px-2 py-0.5 border",
                              waitCls === "bad" && "bg-[oklch(0.62_0.24_15_/_0.12)]",
                              waitCls === "warn" && "bg-[oklch(0.76_0.16_70_/_0.16)]",
                              waitCls === "ok" && "bg-[oklch(0.62_0.16_155_/_0.13)]"
                            )}
                          >
                            {r.waiting_days} יום
                          </span>
                        )}
                      </td>
                      <td className="px-2.5 py-2">
                        {r.confirmed_at ? (
                          <Button
                            size="xs"
                            variant="outline"
                            disabled={!canEdit}
                            onClick={async () => {
                              await fetch(`/api/roster/${r.roster_entry_id}/admin-confirmation`, {
                                method: "DELETE",
                              });
                              router.refresh();
                            }}
                          >
                            בטל אישור
                          </Button>
                        ) : (
                          <Button
                            size="xs"
                            disabled={!canEdit}
                            onClick={async () => {
                              await fetch(`/api/roster/${r.roster_entry_id}/admin-confirmation`, {
                                method: "PUT",
                              });
                              router.refresh();
                            }}
                          >
                            סמן כאושר
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              {adminRows.filter((r) => showConfirmed || !r.confirmed_at).length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-muted-foreground py-6">
                    אין ממתינים לאישור שלישותי.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {adminRows.some((r) => r.confirmed_at) && (
          <div className="px-4 py-2">
            <Button variant="ghost" size="xs" onClick={() => setShowConfirmed(!showConfirmed)}>
              {showConfirmed ? "הסתר מאושרים" : "הצג גם שורות מאושרות"}
            </Button>
          </div>
        )}
      </div>

      <div className="rounded-[var(--radius)] border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-[var(--chart-3)]" />
          <h2 className="font-bold">דרישות פתוחות ופעולות נדרשות</h2>
        </div>
        <div className="space-y-2">
          {requests.map((r) => (
            <Link
              key={r.id}
              href={`/requests/${r.id}`}
              className="flex items-center justify-between gap-2 border rounded-md px-2.5 py-2 text-sm hover:bg-muted/40"
            >
              <span>
                {r.requested_cert_type} · {r.quantity_needed} מקומות
              </span>
              <RequestStatusBadge status={r.status} />
            </Link>
          ))}
          {requests.length === 0 && <p className="text-sm text-muted-foreground">אין דרישות.</p>}
          {canEdit && (
            <Button asChild variant="outline" className="self-start">
              <Link href="/requests/new">+ פתיחת דרישה חדשה</Link>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function fmt(iso: string): string {
  const d = iso.slice(0, 10);
  const [, m, day] = d.split("-");
  return `${day}/${m}`;
}
