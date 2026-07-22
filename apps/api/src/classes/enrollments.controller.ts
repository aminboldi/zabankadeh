import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { ClassEnrollmentSummary } from "@zabankadeh/contracts";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { EnrollmentsService } from "./enrollments.service";

@Controller("admin/classes/:classId/enrollments")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "registrar", "academic_supervisor")
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}
  @Get() list(@Param("classId") classId: string): Promise<ClassEnrollmentSummary[]> { return this.enrollments.list(classId); }
  @Post() create(@Param("classId") classId: string, @Body() body: { studentId?: string; status?: ClassEnrollmentSummary["status"] }): Promise<ClassEnrollmentSummary> { return this.enrollments.create(classId, body); }
  @Patch("/:enrollmentId") update(@Param("enrollmentId") enrollmentId: string, @Body() body: { status?: ClassEnrollmentSummary["status"] }): Promise<ClassEnrollmentSummary> { return this.enrollments.update(enrollmentId, body.status ?? "active"); }
}
