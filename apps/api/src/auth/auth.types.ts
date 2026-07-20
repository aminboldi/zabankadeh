import type { UserRole } from "@zabankadeh/contracts";

export type AuthUser = {
  id: string;
  tenantId: string;
  mobile: string;
  displayName: string;
  roles: Array<{ role: UserRole; branchId?: string }>;
};

export type AuthSession = { token: string; expiresAt: string; user: AuthUser };
