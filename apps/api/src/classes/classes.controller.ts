import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import type { ClassOptions, ClassSummary } from "@zabankadeh/contracts";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ClassesService, type CreateClassInput } from "./classes.service";
import type { AuthenticatedRequest } from "../auth/auth.guard";

@Controller("admin/classes")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "registrar", "academic_supervisor")
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}
  @Get() list(@Req() request: AuthenticatedRequest): Promise<ClassSummary[]> { return this.classes.list(request.user); }
  @Get("options") options(@Req() request: AuthenticatedRequest): Promise<ClassOptions> { return this.classes.options(request.user); }
  @Post() create(@Req() request: AuthenticatedRequest, @Body() body: CreateClassInput): Promise<ClassSummary> { return this.classes.create(body, request.user); }
}
