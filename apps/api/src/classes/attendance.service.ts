import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { AttendanceEntry } from "@zabankadeh/contracts";
import { DatabaseService } from "../database.service";

@Injectable()
export class AttendanceService {
  constructor(private readonly db: DatabaseService) {}

  async list(sessionId: string): Promise<AttendanceEntry[]> {
    const tenantId = await this.tenantId();
    await this.assertSession(sessionId, tenantId);
    const result = await this.db.query<AttendanceEntry & { enrollment_id: string; student_id: string; student_number: string; first_name: string; last_name: string; recorded_at: string | null }>(
      `select e.id enrollment_id, s.id student_id, s.student_number, p.first_name, p.last_name,
              a.status, a.note, a.recorded_at
       from class_sessions cs join enrollments e on e.class_id = cs.class_id and e.tenant_id = cs.tenant_id and e.status in ('pending','active','frozen')
       join students s on s.id = e.student_id and s.tenant_id = e.tenant_id
       join people p on p.id = s.person_id and p.tenant_id = e.tenant_id
       left join attendance a on a.session_id = cs.id and a.enrollment_id = e.id and a.tenant_id = cs.tenant_id
       where cs.id = $1 and cs.tenant_id = $2 order by p.last_name, p.first_name`, [sessionId, tenantId],
    );
    return result.rows.map((row) => ({ enrollmentId: row.enrollment_id, studentId: row.student_id, studentNumber: row.student_number, firstName: row.first_name, lastName: row.last_name, status: row.status, note: row.note, recordedAt: row.recorded_at }));
  }

  async record(sessionId: string, enrollmentId: string, input: { status?: AttendanceEntry["status"]; note?: string }): Promise<AttendanceEntry> {
    if (!input.status || !["present", "absent", "late", "excused"].includes(input.status)) throw new BadRequestException("Attendance status is required");
    const tenantId = await this.tenantId();
    const valid = await this.db.query("select 1 from class_sessions cs join enrollments e on e.class_id = cs.class_id and e.tenant_id = cs.tenant_id where cs.id = $1 and e.id = $2 and cs.tenant_id = $3", [sessionId, enrollmentId, tenantId]);
    if (!valid.rows[0]) throw new NotFoundException("Session or enrollment was not found");
    await this.db.query(
      `insert into attendance (tenant_id, session_id, enrollment_id, status, note)
       values ($1,$2,$3,$4,$5)
       on conflict (session_id, enrollment_id) do update set status = excluded.status, note = excluded.note, recorded_at = now()`,
      [tenantId, sessionId, enrollmentId, input.status, input.note?.trim() || null],
    );
    const entries = await this.list(sessionId); const updated = entries.find((entry) => entry.enrollmentId === enrollmentId);
    if (!updated) throw new ConflictException("Attendance was recorded but could not be loaded");
    return updated;
  }

  private async assertSession(sessionId: string, tenantId: string) { const result = await this.db.query("select 1 from class_sessions where id = $1 and tenant_id = $2", [sessionId, tenantId]); if (!result.rows[0]) throw new NotFoundException("Session was not found"); }
  private async tenantId() { const result = await this.db.query<{ id: string }>("select id from tenants where slug = $1 and status = 'active'", [process.env.TENANT_SLUG ?? "demo"]); if (!result.rows[0]) throw new ConflictException("Institute is not configured"); return result.rows[0].id; }
}
