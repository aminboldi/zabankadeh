import { describe, expect, it } from "vitest";
import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { ExecutionContext } from "@nestjs/common";
import type { UserRole } from "@zabankadeh/contracts";
import { RolesGuard } from "../src/auth/roles.guard";
import { StudentsController } from "../src/students/students.controller";
import { FinanceController } from "../src/finance.controller";
import { ClassSessionsController } from "../src/classes/class-sessions.controller";
import { AttendanceController } from "../src/classes/attendance.controller";
import { ReportsController } from "../src/reports.controller";

type ControllerType = { prototype: Record<string, unknown> };

function context(controller: ControllerType, method: string, roles: UserRole[]): ExecutionContext {
  return {
    getClass: () => controller,
    getHandler: () => controller.prototype[method],
    switchToHttp: () => ({
      getRequest: () => ({
        user: { id: "user", tenantId: "tenant", mobile: "09120000000", displayName: "Test", roles: roles.map((role) => ({ role })) },
      }),
    }),
  } as unknown as ExecutionContext;
}

describe("RolesGuard", () => {
  const guard = new RolesGuard(new Reflector());

  it("allows finance staff into finance and reporting", () => {
    expect(guard.canActivate(context(FinanceController, "list", ["finance"]))).toBe(true);
    expect(guard.canActivate(context(ReportsController, "overview", ["finance"]))).toBe(true);
  });

  it("keeps finance staff out of student records", () => {
    expect(() => guard.canActivate(context(StudentsController, "list", ["finance"]))).toThrow(ForbiddenException);
  });

  it("lets instructors see their sessions and record attendance, but not change the timetable", () => {
    expect(guard.canActivate(context(ClassSessionsController, "list", ["instructor"]))).toBe(true);
    expect(guard.canActivate(context(AttendanceController, "record", ["instructor"]))).toBe(true);
    expect(() => guard.canActivate(context(ClassSessionsController, "create", ["instructor"]))).toThrow(ForbiddenException);
  });

  it("lets registrars manage students but not access financial reporting", () => {
    expect(guard.canActivate(context(StudentsController, "create", ["registrar"]))).toBe(true);
    expect(() => guard.canActivate(context(ReportsController, "overview", ["registrar"]))).toThrow(ForbiddenException);
  });
});
