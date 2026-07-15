import type { Role } from "@/lib/types";

export function isBrigade(role: Role): boolean {
  return role === "brigade";
}

export function battalionCodeOf(role: Role): string | null {
  return role.startsWith("battalion:") ? role.slice("battalion:".length) : null;
}

export function canManageCertifications(role: Role): boolean {
  return isBrigade(role);
}

export function canApproveRoster(role: Role): boolean {
  return isBrigade(role);
}

export function canApproveRequests(role: Role): boolean {
  return isBrigade(role);
}

export function canSubmitRequest(role: Role, battalionId: number, battalionCodeById: (id: number) => string | null): boolean {
  if (isBrigade(role)) return true;
  return battalionCodeOf(role) === battalionCodeById(battalionId);
}

export function canRegisterSoldier(role: Role): boolean {
  // Brigade or any battalion may register a soldier to an open certification.
  return true;
}

export function canViewBattalionData(role: Role, battalionCode: string): boolean {
  if (isBrigade(role)) return true;
  return battalionCodeOf(role) === battalionCode;
}
