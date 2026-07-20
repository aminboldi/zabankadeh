import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Observable, tap } from "rxjs";
import { DatabaseService } from "./database.service";
import type { AuthenticatedRequest } from "./auth/auth.guard";

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);

  constructor(private readonly db: DatabaseService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest & {
      method: string;
      originalUrl?: string;
      url?: string;
      params?: Record<string, string>;
      body?: unknown;
    }>();

    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next.handle();

    return next.handle().pipe(
      tap(() => void this.record(request)),
    );
  }

  private async record(request: AuthenticatedRequest & {
    method: string;
    originalUrl?: string;
    url?: string;
    params?: Record<string, string>;
    body?: unknown;
  }) {
    const user = request.user;
    if (!user) return;

    const route = (request.originalUrl ?? request.url ?? "/").split("?")[0];
    const segments = route.split("/").filter(Boolean);
    const entityType = segments[1] ?? "request";
    const entityId = request.params?.id ?? segments.at(-1) ?? entityType;

    try {
      await this.db.query(
        `insert into audit_events
         (tenant_id, actor_user_id, action, entity_type, entity_id, after_data)
         values ($1, $2, $3, $4, $5, $6)`,
        [user.tenantId, user.id, `${request.method} ${route}`, entityType, entityId, null],
      );
    } catch (error) {
      // Auditing must never turn a successful business operation into a 500.
      this.logger.warn(`Could not record audit event: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
