import { Module } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { DatabaseService } from "./database.service";
import { PublicController } from "./public.controller";
import { AssessmentController } from "./assessment/assessment.controller";
import { AssessmentService } from "./assessment/assessment.service";
import { AdminController } from "./admin.controller";
import { HealthController } from "./health.controller";
import { AuthController } from "./auth/auth.controller";
import { AuthService } from "./auth/auth.service";
import { AuthGuard } from "./auth/auth.guard";
import { RolesGuard } from "./auth/roles.guard";
import { AuditInterceptor } from "./audit.interceptor";
import { StudentsController } from "./students/students.controller";
import { StudentsService } from "./students/students.service";
import { InstructorsController } from "./instructors/instructors.controller";
import { InstructorsService } from "./instructors/instructors.service";
import { ClassesController } from "./classes/classes.controller";
import { ClassesService } from "./classes/classes.service";
import { ClassSessionsController } from "./classes/class-sessions.controller";
import { ClassSessionsService } from "./classes/class-sessions.service";
import { EnrollmentsController } from "./classes/enrollments.controller";
import { EnrollmentsService } from "./classes/enrollments.service";
import { AttendanceController } from "./classes/attendance.controller";
import { AttendanceService } from "./classes/attendance.service";
import { FinanceController } from "./finance.controller";
import { FinanceService } from "./finance.service";
import { ReportsController } from "./reports.controller";
import { ReportsService } from "./reports.service";
import { PaymentGatewayController } from "./payment-gateway.controller";
import { PaymentGatewayService } from "./integrations/payment-gateways";
import { AdminAssessmentController } from "./assessment/admin-assessment.controller";
import { AdminAssessmentService } from "./assessment/admin-assessment.service";

@Module({
  controllers: [HealthController, PublicController, AssessmentController, AdminController, AuthController, StudentsController, InstructorsController, ClassesController, ClassSessionsController, EnrollmentsController, AttendanceController, FinanceController, ReportsController, PaymentGatewayController, AdminAssessmentController],
  providers: [DatabaseService, AssessmentService, AuthService, StudentsService, InstructorsService, ClassesService, ClassSessionsService, EnrollmentsService, AttendanceService, FinanceService, ReportsService, PaymentGatewayService, AdminAssessmentService, AuthGuard, RolesGuard, { provide: APP_INTERCEPTOR, useClass: AuditInterceptor }],
})
export class AppModule {}
