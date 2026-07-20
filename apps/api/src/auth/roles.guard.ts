import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@zabankadeh/contracts";
import type { AuthenticatedRequest } from "./auth.guard";
import { REQUIRED_ROLES } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<UserRole[]>(REQUIRED_ROLES, [context.getHandler(), context.getClass()]) ?? [];
    if (!required.length) return true;
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) throw new UnauthorizedException("Authentication required");
    if (!user.roles.some(({ role }) => required.includes(role))) throw new ForbiddenException("Insufficient role");
    return true;
  }
}
