import type { CSSProperties } from "react";

export function battalionChipStyle(colorHex: string): CSSProperties {
  return {
    backgroundColor: `${colorHex}22`,
    color: colorHex,
    borderColor: `${colorHex}55`,
  };
}

export function battalionBarStyle(colorHex: string): CSSProperties {
  return { backgroundColor: colorHex };
}
