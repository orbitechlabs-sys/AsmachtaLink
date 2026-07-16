"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Menu, X } from "lucide-react";
import { RoleSwitcher } from "@/components/layout/role-switcher";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/calendar", label: "לוח שנה" },
  { href: "/trainings", label: "הדרכות" },
  { href: "/certifications", label: "הסמכות" },
  { href: "/requests", label: "דרישות גדודים" },
  { href: "/templates", label: "בנק הסמכות" },
  { href: "/battalions", label: "גדודים" },
  { href: "/reports", label: "דוחות" },
];

export function MainNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-card relative border-b-2 border-primary/20">
      <div className="absolute inset-x-0 bottom-0 h-[3px] bg-gradient-to-l from-primary via-chart-2 to-chart-4" />
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 p-3">
        <Link href="/calendar" className="font-extrabold shrink-0 text-lg bg-gradient-to-l from-primary to-chart-2 bg-clip-text text-transparent">
          מערכת ניהול הסמכות · 228
        </Link>

        <nav className="hidden md:flex items-center gap-1 flex-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors",
                pathname?.startsWith(link.href) && "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <RoleSwitcher />
          <NotificationBell />
        </div>

        <button
          className="md:hidden p-2"
          onClick={() => setOpen((o) => !o)}
          aria-label="תפריט"
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t p-3 flex flex-col gap-1">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className={cn(
                "px-3 py-2 rounded-md text-sm font-medium hover:bg-accent transition-colors",
                pathname?.startsWith(link.href) && "bg-primary text-primary-foreground"
              )}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex items-center gap-2 pt-2 border-t mt-1">
            <RoleSwitcher />
            <NotificationBell />
          </div>
        </div>
      )}
    </header>
  );
}
