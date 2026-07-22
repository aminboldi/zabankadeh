import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import type { AssessmentAttemptSummary } from "@zabankadeh/contracts";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AdminAssessmentService } from "./admin-assessment.service";

@Controller("admin/assessments")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "registrar", "academic_supervisor")
export class AdminAssessmentController {
  constructor(private readonly assessments: AdminAssessmentService) {}
  @Get("attempts") list(): Promise<AssessmentAttemptSummary[]> { return this.assessments.list(); }
  @Patch("attempts/:id/override") override(@Param("id") id: string, @Body() body: { band?: string; reason?: string }): Promise<AssessmentAttemptSummary> { return this.assessments.override(id, body); }
  @Post("attempts/:id/register-lead") registerLead(@Param("id") id: string): Promise<AssessmentAttemptSummary> { return this.assessments.registerLead(id); }
}
