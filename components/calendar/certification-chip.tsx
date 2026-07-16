"use client";

import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { CertificationStatusBadge } from "@/components/certifications/status-badge";
import type { CalendarItem } from "@/components/calendar/types";
import { battalionBarStyle } from "@/lib/utils/battalion-style";

export function CertificationChip({ item }: { item: CalendarItem }) {
  const primaryColor = item.battalions[0]?.color_hex;
  return (
    <Link
      href={item.href}
      className="block rounded bg-card px-1.5 py-0.5 text-xs hover:shadow-md transition-shadow overflow-hidden border-e-4"
      style={{
        borderInlineEndColor: item.color ?? primaryColor ?? "var(--muted-foreground)",
        backgroundColor: item.color ? `${item.color}14` : undefined,
      }}
    >
      <div className="flex items-center gap-1">
        <div className="flex -space-x-0.5 shrink-0">
          {item.battalions.length > 0 ? (
            item.battalions.slice(0, 3).map((b) => (
              <span
                key={b.code}
                className="size-2 rounded-full border border-white"
                style={battalionBarStyle(b.color_hex)}
                title={b.name}
              />
            ))
          ) : (
            <span className="size-2 rounded-full bg-muted-foreground/40" title="כלל החטיבה" />
          )}
        </div>
        {item.kind === "training" && (
          <GraduationCap className="size-3 shrink-0 text-muted-foreground" aria-label="הדרכה" />
        )}
        <span className="truncate font-medium">{item.name}</span>
      </div>
      {item.location && (
        <div className="truncate text-[10px] text-muted-foreground leading-tight">{item.location}</div>
      )}
    </Link>
  );
}

export function CertificationChipDetailed({ item }: { item: CalendarItem }) {
  return (
    <Link
      href={item.href}
      className="block rounded-md border bg-card p-2 hover:shadow-md transition-shadow border-e-4"
      style={{ borderInlineEndColor: item.color ?? "var(--border)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate flex items-center gap-1">
          {item.kind === "training" && (
            <GraduationCap className="size-3.5 shrink-0 text-muted-foreground" aria-label="הדרכה" />
          )}
          {item.name}
        </span>
        {item.kind === "certification" && item.status ? (
          <CertificationStatusBadge status={item.status} />
        ) : (
          <span className="text-[10px] text-muted-foreground shrink-0">הדרכה</span>
        )}
      </div>
      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2">
        <span>{item.location ?? "ללא מיקום"}</span>
        {item.kind === "certification" && item.registered_count !== undefined && (
          <span>
            {item.registered_count}
            {item.slots_remaining !== null && item.slots_remaining !== undefined
              ? ` / ${item.total_slots}`
              : ""}{" "}
            רשומים
          </span>
        )}
      </div>
      {item.battalions.length > 0 && (
        <div className="flex gap-1 mt-1">
          {item.battalions.map((b) => (
            <span
              key={b.code}
              className="size-2 rounded-full"
              style={battalionBarStyle(b.color_hex)}
              title={b.name}
            />
          ))}
        </div>
      )}
    </Link>
  );
}
