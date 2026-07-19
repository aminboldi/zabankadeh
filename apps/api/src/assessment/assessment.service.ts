import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ageBands, targetLanguages, type AgeBand, type AssessmentAttempt, type AssessmentResult, type TargetLanguage } from "@zabankadeh/contracts";
import { DatabaseService } from "../database.service";
import { scoreAssessment, type SubmittedAnswer } from "./scoring";

type QuestionRow = {
  id: string;
  prompt: string;
  passage: string | null;
  audio_url: string | null;
  options: Array<{ id: string; label: string }>;
  correct_options: string[];
  skill: "grammar" | "vocabulary" | "reading" | "listening";
  points: number;
};

type AttemptRow = { id: string; question_ids: string[]; expires_at: Date; submitted_at: Date | null };

@Injectable()
export class AssessmentService {
  constructor(private readonly db: DatabaseService) {}

  async start(input: { language?: string; ageBand?: string; candidateName?: string; mobile?: string }): Promise<AssessmentAttempt> {
    if (!targetLanguages.includes(input.language as TargetLanguage)) throw new BadRequestException("Unsupported language");
    if (!ageBands.includes(input.ageBand as AgeBand)) throw new BadRequestException("Unsupported age band");
    if (!input.candidateName?.trim()) throw new BadRequestException("Candidate name is required");

    const tenant = await this.tenantId();
    const questions = await this.db.query<QuestionRow>(
      `select id, prompt, passage, audio_url, options, correct_options, skill, points
       from assessment_questions
       where tenant_id = $1 and language = $2 and (age_band = $3 or age_band = 'all') and status = 'published'
       order by random() limit 12`,
      [tenant, input.language, input.ageBand],
    );
    if (questions.rowCount === 0) throw new NotFoundException("No published assessment is available");

    const created = await this.db.query<{ id: string; expires_at: Date }>(
      `insert into assessment_attempts
       (tenant_id, candidate_name, candidate_mobile, language, age_band, question_ids, scoring_version, expires_at)
       values ($1, $2, $3, $4, $5, $6, 'v1', now() + interval '45 minutes')
       returning id, expires_at`,
      [tenant, input.candidateName.trim(), input.mobile?.trim() || null, input.language, input.ageBand, questions.rows.map((q) => q.id)],
    );

    return {
      id: created.rows[0].id,
      language: input.language as TargetLanguage,
      ageBand: input.ageBand as AgeBand,
      expiresAt: created.rows[0].expires_at.toISOString(),
      questions: questions.rows.map(({ correct_options: _answer, points: _points, audio_url, ...question }) => ({
        ...question,
        audioUrl: audio_url ?? undefined,
        passage: question.passage ?? undefined,
      })),
    };
  }

  async submit(attemptId: string, answers: SubmittedAnswer[]): Promise<AssessmentResult> {
    return this.db.transaction(async (client) => {
      const attemptResult = await client.query<AttemptRow>(
        "select id, question_ids, expires_at, submitted_at from assessment_attempts where id = $1 for update",
        [attemptId],
      );
      const attempt = attemptResult.rows[0];
      if (!attempt) throw new NotFoundException("Attempt not found");
      if (attempt.submitted_at) throw new ConflictException("Attempt was already submitted");
      if (attempt.expires_at.getTime() < Date.now()) throw new ConflictException("Attempt has expired");

      const questionResult = await client.query<QuestionRow>(
        `select id, skill, points, correct_options, prompt, passage, audio_url, options
         from assessment_questions where id = any($1::uuid[])`,
        [attempt.question_ids],
      );
      const scored = scoreAssessment(
        questionResult.rows.map((q) => ({ id: q.id, skill: q.skill, points: q.points, correctOptions: q.correct_options })),
        answers,
      );
      const confidence = questionResult.rows.length >= 10 ? "high" : questionResult.rows.length >= 6 ? "medium" : "low";
      await client.query(
        `update assessment_attempts
         set submitted_at = now(), answers = $2, score = $3, recommended_band = $4, confidence = $5, skill_scores = $6
         where id = $1`,
        [attemptId, JSON.stringify(answers), scored.score, scored.recommendedBand, confidence, JSON.stringify(scored.skillScores)],
      );
      return { attemptId, ...scored, confidence, provisional: true as const };
    });
  }

  private async tenantId() {
    const slug = process.env.TENANT_SLUG ?? "demo";
    const result = await this.db.query<{ id: string }>("select id from tenants where slug = $1 and status = 'active'", [slug]);
    if (!result.rows[0]) throw new NotFoundException("Institute is not configured");
    return result.rows[0].id;
  }
}
