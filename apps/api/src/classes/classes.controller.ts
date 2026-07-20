import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { ClassOptions, ClassSummary } from "@zabankadeh/contracts";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { ClassesService, type CreateClassInput } from "./classes.service";

@Controller("admin/classes")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "registrar", "academic_supervisor")
export class ClassesController {
  constructor(private readonly classes: ClassesService) {}
  @Get() list(): Promise<ClassSummary[]> { return this.classes.list(); }
  @Get("options") options(): Promise<ClassOptions> { return this.classes.options(); }
  @Post() create(@Body() body: CreateClassInput): Promise<ClassSummary> { return this.classes.create(body); }
}
