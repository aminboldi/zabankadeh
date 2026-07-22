import { Controller, Get, UseGuards } from "@nestjs/common";
import type { ReportOverview } from "@zabankadeh/contracts";
import { AuthGuard } from "./auth/auth.guard";
import { Roles } from "./auth/roles.decorator";
import { RolesGuard } from "./auth/roles.guard";
import { ReportsService } from "./reports.service";

@Controller("admin/reports")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "finance", "academic_supervisor")
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get("overview") overview(): Promise<ReportOverview> { return this.reports.overview(); }
}
