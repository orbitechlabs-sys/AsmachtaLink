import { BATTALION_SCOPED_ROLES, type AppUser, type Role } from "@/lib/types";

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

// --- Battalion-scoped roles (additive; the functions above are untouched) ----------
// viewer_battalion / editor_battalion are limited to their own `battalion_id`.
//
// Note that `canEdit()` above deliberately returns FALSE for editor_battalion. That is
// what keeps them out of every pre-existing write endpoint (certifications, trainings,
// roster, files, …), which are all gated on `canEdit()` and are none of their business.
// Their one permitted write — a request for their own battalion — is gated by
// `canEditBattalion()` below, which takes the target battalion and can therefore check it.

/** True for the two battalion-scoped roles, regardless of approval status. */
export function isBattalionScoped(user: AppUser | null): boolean {
  return !!user && BATTALION_SCOPED_ROLES.includes(user.role);
}

/**
 * The battalion a user is confined to, or null when they are global (super_admin /
 * editor / viewer) and therefore see everything.
 *
 * Repository and API layers use this to decide whether to apply a battalion filter:
 * non-null → filter to that battalion; null → no filter (existing behaviour).
 */
export function getScopedBattalionId(user: AppUser | null): number | null {
  if (!user || user.status !== "approved") return null;
  return isBattalionScoped(user) ? user.battalion_id : null;
}

/** May this user edit data belonging to `battalionId`?
 *  - global editors/admins: yes (unchanged, any battalion)
 *  - editor_battalion: only their own battalion
 *  - everyone else (incl. viewer_battalion): no */
export function canEditBattalion(user: AppUser | null, battalionId: number): boolean {
  if (canEdit(user)) return true;
  return (
    !!user &&
    user.status === "approved" &&
    user.role === "editor_battalion" &&
    user.battalion_id === battalionId
  );
}

/** May this user perform ANY edit (without naming a target yet)? Use for showing an
 * "add" affordance; the actual write must still be checked with `canEditBattalion()`. */
export function canEditAnything(user: AppUser | null): boolean {
  return canEdit(user) || (!!user && user.status === "approved" && user.role === "editor_battalion");
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
