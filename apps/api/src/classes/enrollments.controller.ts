import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from "@nestjs/common";
import type { ClassEnrollmentSummary } from "@zabankadeh/contracts";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { EnrollmentsService } from "./enrollments.service";
import type { AuthenticatedRequest } from "../auth/auth.guard";

@Controller("admin/classes/:classId/enrollments")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "registrar", "academic_supervisor")
export class EnrollmentsController {
  constructor(private readonly enrollments: EnrollmentsService) {}
  @Get() list(@Req() request: AuthenticatedRequest, @Param("classId") classId: string): Promise<ClassEnrollmentSummary[]> { return this.enrollments.list(classId, request.user); }
  @Post() create(@Req() request: AuthenticatedRequest, @Param("classId") classId: string, @Body() body: { studentId?: string; status?: ClassEnrollmentSummary["status"] }): Promise<ClassEnrollmentSummary> { return this.enrollments.create(classId, body, request.user); }
  @Patch("/:enrollmentId") update(@Req() request: AuthenticatedRequest, @Param("enrollmentId") enrollmentId: string, @Body() body: { status?: ClassEnrollmentSummary["status"] }): Promise<ClassEnrollmentSummary> { return this.enrollments.update(enrollmentId, body.status ?? "active", request.user); }
}
