import { z } from "zod";

/** Approve a pending user, granting either viewer or editor (not super_admin). */
export const approveUserSchema = z.object({
  action: z.literal("approve"),
  role: z.enum(["viewer", "editor"], { message: "יש לבחור תפקיד תקין" }),
});

/** Change an existing user's role. */
export const updateRoleSchema = z.object({
  action: z.literal("set_role"),
  role: z.enum(["super_admin", "editor", "viewer"], { message: "יש לבחור תפקיד תקין" }),
});

/** Discriminated PATCH body for /api/admin/users/[id]. */
export const userPatchSchema = z.discriminatedUnion("action", [
  approveUserSchema,
  updateRoleSchema,
]);

export type UserPatchInput = z.infer<typeof userPatchSchema>;
