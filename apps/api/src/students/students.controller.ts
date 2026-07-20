import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { StudentDetail, StudentSummary } from "@zabankadeh/contracts";
import { AuthGuard } from "../auth/auth.guard";
import { Roles } from "../auth/roles.decorator";
import { RolesGuard } from "../auth/roles.guard";
import { StudentsService, type CreateStudentInput, type UpdateStudentInput } from "./students.service";

@Controller("admin/students")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "registrar")
export class StudentsController {
  constructor(private readonly students: StudentsService) {}

  @Get()
  list(@Query("q") query?: string): Promise<StudentSummary[]> {
    return this.students.list(query);
  }

  @Post()
  create(@Body() body: CreateStudentInput): Promise<StudentSummary> {
    return this.students.create(body);
  }

  @Get(":id")
  detail(@Param("id") id: string): Promise<StudentDetail> {
    return this.students.detail(id);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() body: UpdateStudentInput): Promise<StudentDetail> {
    return this.students.update(id, body);
  }
}
