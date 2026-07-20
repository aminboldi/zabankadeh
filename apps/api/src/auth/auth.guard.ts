import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import type { AuthUser } from "./auth.types";
import { readToken } from "./auth.controller";
import { AuthService } from "./auth.service";

export type AuthenticatedRequest = { headers: { authorization?: string; cookie?: string }; user?: AuthUser };

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.user = await this.auth.authenticate(readToken(request));
    return true;
  }
}
