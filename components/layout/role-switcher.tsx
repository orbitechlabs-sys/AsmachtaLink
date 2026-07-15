"use client";

import { useEffect, useState } from "react";
import { useRole } from "@/lib/auth/role-context";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { ChevronDown, Shield } from "lucide-react";
import type { Battalion } from "@/lib/types";

export function RoleSwitcher() {
  const { role, setRole } = useRole();
  const [battalions, setBattalions] = useState<Battalion[]>([]);

  useEffect(() => {
    fetch("/api/battalions")
      .then((r) => r.json())
      .then(setBattalions)
      .catch(() => {});
  }, []);

  const currentBattalion = battalions.find((b) => `battalion:${b.code}` === role);
  const label = role === "brigade" ? "מטה חטיבה" : currentBattalion?.name ?? role;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-2 font-semibold"
          style={
            currentBattalion
              ? { borderColor: currentBattalion.color_hex, color: currentBattalion.color_hex }
              : undefined
          }
        >
          {currentBattalion ? (
            <span
              className="inline-block size-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: currentBattalion.color_hex }}
            />
          ) : (
            <Shield className="size-4 text-primary" />
          )}
          תצוגה כ: {label}
          <ChevronDown className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>בחר תצוגת משתמש</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => setRole("brigade")} className="font-medium">
          <Shield className="size-4 text-primary" />
          מטה חטיבה
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {battalions.map((b) => (
          <DropdownMenuItem key={b.code} onClick={() => setRole(`battalion:${b.code}`)}>
            <span
              className="inline-block size-2.5 rounded-full shadow-sm"
              style={{ backgroundColor: b.color_hex }}
            />
            {b.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
