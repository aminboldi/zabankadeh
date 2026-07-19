import { Body, Controller, Param, Post } from "@nestjs/common";
import { AssessmentService } from "./assessment.service";
import type { SubmittedAnswer } from "./scoring";

@Controller("public/assessments")
export class AssessmentController {
  constructor(private readonly assessments: AssessmentService) {}

  @Post("attempts")
  start(@Body() body: { language?: string; ageBand?: string; candidateName?: string; mobile?: string }) {
    return this.assessments.start(body);
  }

  @Post("attempts/:attemptId/submit")
  submit(@Param("attemptId") attemptId: string, @Body() body: { answers?: SubmittedAnswer[] }) {
    return this.assessments.submit(attemptId, Array.isArray(body.answers) ? body.answers : []);
  }
}
