"use client";

import Link from "next/link";
import { CertificationStatusBadge } from "@/components/certifications/status-badge";
import type { CalendarCertification } from "@/components/calendar/types";
import { battalionBarStyle } from "@/lib/utils/battalion-style";

export function CertificationChip({ cert }: { cert: CalendarCertification }) {
  const primaryColor = cert.battalions[0]?.color_hex;
  return (
    <Link
      href={`/certifications/${cert.id}`}
      className="block rounded bg-card px-1.5 py-0.5 text-xs hover:shadow-md transition-shadow overflow-hidden border-e-4"
      style={{
        borderInlineEndColor: primaryColor ?? "var(--muted-foreground)",
        backgroundColor: primaryColor ? `${primaryColor}14` : undefined,
      }}
    >
      <div className="flex items-center gap-1">
        <div className="flex -space-x-0.5 shrink-0">
          {cert.battalions.length > 0 ? (
            cert.battalions.slice(0, 3).map((b) => (
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
        <span className="truncate font-medium">{cert.name}</span>
      </div>
      {cert.location && (
        <div className="truncate text-[10px] text-muted-foreground leading-tight">{cert.location}</div>
      )}
    </Link>
  );
}

export function CertificationChipDetailed({ cert }: { cert: CalendarCertification }) {
  const primaryColor = cert.battalions[0]?.color_hex;
  return (
    <Link
      href={`/certifications/${cert.id}`}
      className="block rounded-md border bg-card p-2 hover:shadow-md transition-shadow border-e-4"
      style={{ borderInlineEndColor: primaryColor ?? "var(--border)" }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="font-medium text-sm truncate">{cert.name}</span>
        <CertificationStatusBadge status={cert.status} />
      </div>
      <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-2">
        <span>{cert.location ?? "ללא מיקום"}</span>
        <span>
          {cert.registered_count}
          {cert.slots_remaining !== null ? ` / ${cert.total_slots}` : ""} רשומים
        </span>
      </div>
      {cert.battalions.length > 0 && (
        <div className="flex gap-1 mt-1">
          {cert.battalions.map((b) => (
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
