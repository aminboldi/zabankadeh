import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { ClassSessionSummary } from "@zabankadeh/contracts";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ClassSessionsService, type CreateClassSessionInput } from "./class-sessions.service";
import type { AuthenticatedRequest } from "../auth/auth.guard";

@Controller("admin/class-sessions")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "registrar", "academic_supervisor", "instructor")
export class ClassSessionsController {
  constructor(private readonly sessions: ClassSessionsService) {}
  @Get() list(@Req() request: AuthenticatedRequest): Promise<ClassSessionSummary[]> { return this.sessions.list(request.user); }
  @Roles("owner", "branch_manager", "registrar", "academic_supervisor")
  @Post() create(@Body() body: CreateClassSessionInput): Promise<ClassSessionSummary> { return this.sessions.create(body); }
  @Roles("owner", "branch_manager", "registrar", "academic_supervisor")
  @Patch(":id") update(@Param("id") id: string, @Body() body: CreateClassSessionInput): Promise<ClassSessionSummary> { return this.sessions.update(id, body); }
  @Roles("owner", "branch_manager", "registrar", "academic_supervisor")
  @Post(":id/cancel") cancel(@Param("id") id: string): Promise<ClassSessionSummary> { return this.sessions.cancel(id); }
}
