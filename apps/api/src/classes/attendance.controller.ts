import { Body, Controller, Get, Param, Put, Req, UseGuards } from "@nestjs/common";
import type { AttendanceEntry } from "@zabankadeh/contracts";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { AttendanceService } from "./attendance.service";
import type { AuthenticatedRequest } from "../auth/auth.guard";

@Controller("admin/class-sessions/:sessionId/attendance")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "registrar", "academic_supervisor", "instructor")
export class AttendanceController {
  constructor(private readonly attendance: AttendanceService) {}
  @Get() list(@Req() request: AuthenticatedRequest, @Param("sessionId") sessionId: string): Promise<AttendanceEntry[]> { return this.attendance.list(sessionId, request.user); }
  @Put(":enrollmentId") record(@Req() request: AuthenticatedRequest, @Param("sessionId") sessionId: string, @Param("enrollmentId") enrollmentId: string, @Body() body: { status?: AttendanceEntry["status"]; note?: string }): Promise<AttendanceEntry> { return this.attendance.record(sessionId, enrollmentId, body, request.user); }
}
