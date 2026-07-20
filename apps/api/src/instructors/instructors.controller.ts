import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import type { InstructorSummary } from "@zabankadeh/contracts";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { InstructorsService, type CreateInstructorInput } from "./instructors.service";

@Controller("admin/instructors")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "academic_supervisor")
export class InstructorsController {
  constructor(private readonly instructors: InstructorsService) {}
  @Get() list(): Promise<InstructorSummary[]> { return this.instructors.list(); }
  @Post() create(@Body() body: CreateInstructorInput): Promise<InstructorSummary> { return this.instructors.create(body); }
}
