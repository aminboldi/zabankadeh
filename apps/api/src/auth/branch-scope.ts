import { ForbiddenException } from "@nestjs/common";
import type { AuthUser } from "./auth.types";

/** Returns the branch ids a branch manager may access, or null for unrestricted users. */
export function managedBranchIds(user?: AuthUser): string[] | null {
  if (!user || user.roles.some(({ role }) => role === "owner")) return null;
  const branchIds = user.roles
    .filter(({ role, branchId }) => role === "branch_manager" && Boolean(branchId))
    .map(({ branchId }) => branchId as string);
  return branchIds.length ? [...new Set(branchIds)] : null;
}

export function assertBranchAllowed(user: AuthUser | undefined, branchId: string) {
  const allowed = managedBranchIds(user);
  if (allowed && !allowed.includes(branchId)) throw new ForbiddenException("This branch is outside your assigned scope");
}
