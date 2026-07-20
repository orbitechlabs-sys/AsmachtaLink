import type { AppUser, Role } from "@/lib/types";

// --- Real per-user authorization (privilege axis: super_admin/editor/viewer) ---
// These operate on the authenticated AppUser (from lib/auth/user.ts) and are the
// authoritative gate. They are orthogonal to the organizational role below
// (brigade / battalion:CODE), which remains a view-scope selector.

/** Any approved user may read the app. */
export function canView(user: AppUser | null): boolean {
  return !!user && user.status === "approved";
}

/** Super-admins and editors (approved) may create/update/delete app data. */
export function canEdit(user: AppUser | null): boolean {
  return (
    !!user &&
    user.status === "approved" &&
    (user.role === "super_admin" || user.role === "editor")
  );
}

/** Only super-admins may manage users (approve, change roles, delete). */
export function canManageUsers(user: AppUser | null): boolean {
  return !!user && user.status === "approved" && user.role === "super_admin";
}

export function isSuperAdmin(user: AppUser | null): boolean {
  return canManageUsers(user);
}

// --- Organizational scope (unchanged): brigade vs battalion:CODE ---

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

export function canManageTrainings(role: Role): boolean {
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
