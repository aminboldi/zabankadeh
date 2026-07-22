import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { cefrBands, type AssessmentAttemptSummary, type CefrBand } from "@zabankadeh/contracts";
import { DatabaseService } from "../database.service";
import { randomBytes } from "node:crypto";

@Injectable()
export class AdminAssessmentService {
  constructor(private readonly db: DatabaseService) {}
  async list(): Promise<AssessmentAttemptSummary[]> {
    const result = await this.db.query<AssessmentAttemptSummary & { candidate_name: string; candidate_mobile: string | null; age_band: AssessmentAttemptSummary["ageBand"]; recommended_band: AssessmentAttemptSummary["recommendedBand"]; override_band: AssessmentAttemptSummary["overrideBand"]; override_reason: string | null; student_id: string | null; submitted_at: string | null; created_at: string }>(
      `select id, candidate_name, candidate_mobile, language, age_band, score, recommended_band, confidence, override_band, override_reason, student_id, submitted_at, created_at
       from assessment_attempts where tenant_id = $1 order by created_at desc limit 200`, [await this.tenantId()],
    );
    return result.rows.map((row) => ({ id: row.id, candidateName: row.candidate_name, candidateMobile: row.candidate_mobile, language: row.language, ageBand: row.age_band, score: row.score, recommendedBand: row.recommended_band, confidence: row.confidence, overrideBand: row.override_band, overrideReason: row.override_reason, studentId: row.student_id, submittedAt: row.submitted_at, createdAt: row.created_at }));
  }
  async registerLead(attemptId: string): Promise<AssessmentAttemptSummary> {
    const tenantId = await this.tenantId();
    await this.db.transaction(async (client) => {
      const attempt = await client.query<{ candidate_name: string; candidate_mobile: string | null; student_id: string | null }>("select candidate_name, candidate_mobile, student_id from assessment_attempts where id = $1 and tenant_id = $2 for update", [attemptId, tenantId]);
      if (!attempt.rows[0]) throw new NotFoundException("Assessment attempt was not found");
      if (attempt.rows[0].student_id) return;
      if (attempt.rows[0].candidate_mobile) {
        const existing = await client.query<{ id: string }>("select s.id from students s join people p on p.id = s.person_id where s.tenant_id = $1 and p.mobile = $2 limit 1", [tenantId, attempt.rows[0].candidate_mobile.trim()]);
        if (existing.rows[0]) {
          await client.query("update assessment_attempts set student_id = $1 where id = $2 and tenant_id = $3", [existing.rows[0].id, attemptId, tenantId]);
          return;
        }
      }
      const nameParts = attempt.rows[0].candidate_name.trim().split(/\s+/).filter(Boolean);
      const firstName = nameParts.shift() ?? "زبان‌آموز";
      const lastName = nameParts.join(" ") || "بدون نام خانوادگی";
      const person = await client.query<{ id: string }>("insert into people (tenant_id, first_name, last_name, mobile) values ($1, $2, $3, nullif($4, '')) returning id", [tenantId, firstName, lastName, attempt.rows[0].candidate_mobile?.trim() ?? ""]);
      const student = await client.query<{ id: string }>("insert into students (tenant_id, person_id, student_number, status) values ($1, $2, $3, 'lead') returning id", [tenantId, person.rows[0].id, `LEAD-${randomBytes(4).toString("hex").toUpperCase()}`]);
      await client.query("update assessment_attempts set student_id = $1 where id = $2 and tenant_id = $3", [student.rows[0].id, attemptId, tenantId]);
    });
    return (await this.list()).find((item) => item.id === attemptId)!;
  }
  async override(id: string, input: { band?: string; reason?: string }): Promise<AssessmentAttemptSummary> {
    if (!input.band || !cefrBands.includes(input.band as CefrBand)) throw new BadRequestException("A valid CEFR band is required");
    const tenantId = await this.tenantId();
    const result = await this.db.query("update assessment_attempts set override_band = $1, override_reason = $2 where id = $3 and tenant_id = $4 returning id", [input.band, input.reason?.trim() || null, id, tenantId]);
    if (!result.rows[0]) throw new NotFoundException("Assessment attempt was not found");
    return (await this.list()).find((attempt) => attempt.id === id)!;
  }
  private async tenantId() { const result = await this.db.query<{ id: string }>("select id from tenants where slug = $1 and status = 'active'", [process.env.TENANT_SLUG ?? "demo"]); if (!result.rows[0]) throw new ConflictException("Institute is not configured"); return result.rows[0].id; }
}
