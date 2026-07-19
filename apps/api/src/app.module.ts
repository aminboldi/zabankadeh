import { Module } from "@nestjs/common";
import { DatabaseService } from "./database.service";
import { PublicController } from "./public.controller";
import { AssessmentController } from "./assessment/assessment.controller";
import { AssessmentService } from "./assessment/assessment.service";
import { AdminController } from "./admin.controller";
import { HealthController } from "./health.controller";

@Module({
  controllers: [HealthController, PublicController, AssessmentController, AdminController],
  providers: [DatabaseService, AssessmentService],
})
export class AppModule {}
