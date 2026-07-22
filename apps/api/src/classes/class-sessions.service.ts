import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type { ClassSessionSummary } from "@zabankadeh/contracts";
import { DatabaseService } from "../database.service";
import type { AuthUser } from "../auth/auth.types";

export type CreateClassSessionInput = { classId?: string; startsAt?: string; endsAt?: string; instructorId?: string; roomId?: string; status?: "scheduled" | "cancelled"; recurrenceRule?: "none" | "weekly"; occurrences?: number; meetingProvider?: "none" | "google_meet" | "skyroom" | "other"; meetingUrl?: string };

@Injectable()
export class ClassSessionsService {
  constructor(private readonly db: DatabaseService) {}
  async list(user?: AuthUser): Promise<ClassSessionSummary[]> {
    const teacherOnly = Boolean(user?.roles.some(({ role }) => role === "instructor") && !user.roles.some(({ role }) => ["owner", "branch_manager", "registrar", "academic_supervisor"].includes(role)));
    const visibility = teacherOnly ? "and p_teacher.mobile = $2" : "";
    const result = await this.db.query<{ id: string; class_id: string; class_code: string; level: string; language: "en" | "de"; starts_at: Date; ends_at: Date; instructor_id: string | null; room_id: string | null; instructor_name: string | null; room_name: string | null; status: string; recurrence_rule: "none" | "weekly"; meeting_provider: "none" | "google_meet" | "skyroom" | "other"; meeting_url: string | null }>(
      `select cs.id, cs.class_id, c.code class_code, pl.name_fa level, pr.language, cs.starts_at, cs.ends_at,
              coalesce(cs.instructor_id, c.instructor_id) instructor_id, coalesce(cs.room_id, c.room_id) room_id,
              cs.recurrence_rule, cs.meeting_provider, cs.meeting_url,
              ip.first_name || ' ' || ip.last_name instructor_name, r.name room_name, cs.status
       from class_sessions cs join classes c on c.id = cs.class_id and c.tenant_id = cs.tenant_id
       join program_levels pl on pl.id = c.level_id join programs pr on pr.id = pl.program_id
       left join instructors i on i.id = coalesce(cs.instructor_id, c.instructor_id)
       left join people ip on ip.id = i.person_id left join rooms r on r.id = coalesce(cs.room_id, c.room_id)
       left join people p_teacher on p_teacher.id = i.person_id and p_teacher.tenant_id = cs.tenant_id
       where cs.tenant_id = (select id from tenants where slug = $1 and status = 'active')
       ${visibility} order by cs.starts_at limit 200`, teacherOnly ? [process.env.TENANT_SLUG ?? "demo", user?.mobile] : [process.env.TENANT_SLUG ?? "demo"]);
    return result.rows.map((row) => ({ id: row.id, classId: row.class_id, classCode: row.class_code, level: row.level, language: row.language, startsAt: row.starts_at.toISOString(), endsAt: row.ends_at.toISOString(), instructorId: row.instructor_id, roomId: row.room_id, instructorName: row.instructor_name, roomName: row.room_name, status: row.status, recurrenceRule: row.recurrence_rule, meetingProvider: row.meeting_provider, meetingUrl: row.meeting_url }));
  }
  async create(input: CreateClassSessionInput): Promise<ClassSessionSummary> {
    if (!input.classId || !input.startsAt || !input.endsAt) throw new BadRequestException("Class, start time, and end time are required");
    const starts = new Date(input.startsAt); const ends = new Date(input.endsAt);
    if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || ends <= starts) throw new BadRequestException("Session times are invalid");
    const tenantId = await this.tenantId(); const recurrenceRule = input.recurrenceRule ?? "none"; const occurrences = recurrenceRule === "weekly" ? Math.min(Math.max(input.occurrences ?? 1, 1), 52) : 1;
    const result = await this.db.transaction(async (client) => {
      let firstId = "";
      for (let index = 0; index < occurrences; index++) {
        const sessionStarts = new Date(starts.getTime() + index * 7 * 86400000); const sessionEnds = new Date(ends.getTime() + index * 7 * 86400000);
        const conflict = await client.query("select 1 from class_sessions where tenant_id = $1 and room_id = $2 and starts_at < $4 and ends_at > $3 limit 1", [tenantId, input.roomId || null, sessionStarts, sessionEnds]);
        if (conflict.rowCount) throw new ConflictException("Room is already booked for one of these sessions");
        const inserted = await client.query<{ id: string }>(
          `insert into class_sessions (tenant_id, class_id, instructor_id, room_id, starts_at, ends_at, recurrence_rule, meeting_provider, meeting_url, status) values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
          [tenantId, input.classId, input.instructorId || null, input.roomId || null, sessionStarts, sessionEnds, recurrenceRule, input.meetingProvider ?? "none", input.meetingUrl?.trim() || null, input.status ?? "scheduled"],
        );
        if (!firstId) firstId = inserted.rows[0].id;
      }
      return firstId;
    });
    const sessions = await this.list(); const created = sessions.find((session) => session.id === result);
    if (!created) throw new ConflictException("Session was created but could not be loaded");
    return created;
  }
  async update(id: string, input: CreateClassSessionInput): Promise<ClassSessionSummary> {
    if (!input.classId || !input.startsAt || !input.endsAt) throw new BadRequestException("Class, start time, and end time are required");
    const starts = new Date(input.startsAt); const ends = new Date(input.endsAt); if (!Number.isFinite(starts.getTime()) || !Number.isFinite(ends.getTime()) || ends <= starts) throw new BadRequestException("Session times are invalid");
    const tenantId = await this.tenantId();
    const conflict = await this.db.query("select 1 from class_sessions where tenant_id = $1 and id <> $2 and room_id = $3 and starts_at < $5 and ends_at > $4 limit 1", [tenantId, id, input.roomId || null, starts, ends]); if (conflict.rowCount) throw new ConflictException("Room is already booked for this session");
    const result = await this.db.query<{ id: string }>("update class_sessions set class_id = $1, instructor_id = $2, room_id = $3, starts_at = $4, ends_at = $5, meeting_provider = $6, meeting_url = $7, status = $8 where id = $9 and tenant_id = $10 returning id", [input.classId, input.instructorId || null, input.roomId || null, starts, ends, input.meetingProvider ?? "none", input.meetingUrl?.trim() || null, input.status ?? "scheduled", id, tenantId]); if (!result.rows[0]) throw new ConflictException("Session was not found"); const session = (await this.list()).find((item) => item.id === id); if (!session) throw new ConflictException("Session was updated but could not be loaded"); return session;
  }
  async cancel(id: string): Promise<ClassSessionSummary> { const tenantId = await this.tenantId(); const result = await this.db.query("update class_sessions set status = 'cancelled' where id = $1 and tenant_id = $2 returning id", [id, tenantId]); if (!result.rows[0]) throw new ConflictException("Session was not found"); const session = (await this.list()).find((item) => item.id === id); if (!session) throw new ConflictException("Session was cancelled but could not be loaded"); return session; }
  private async tenantId() { const result = await this.db.query<{ id: string }>("select id from tenants where slug = $1 and status = 'active'", [process.env.TENANT_SLUG ?? "demo"]); if (!result.rows[0]) throw new ConflictException("Institute is not configured"); return result.rows[0].id; }
}
