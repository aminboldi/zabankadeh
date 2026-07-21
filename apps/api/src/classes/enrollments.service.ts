import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { ClassEnrollmentSummary } from "@zabankadeh/contracts";
import { DatabaseService } from "../database.service";

@Injectable()
export class EnrollmentsService {
  constructor(private readonly db: DatabaseService) {}

  async list(classId: string): Promise<ClassEnrollmentSummary[]> {
    const tenantId = await this.tenantId();
    await this.assertClass(classId, tenantId);
    const result = await this.db.query<ClassEnrollmentSummary & { student_id: string; student_number: string; first_name: string; last_name: string; enrolled_at: string }>(
      `select e.id, e.student_id, s.student_number, p.first_name, p.last_name, p.mobile, e.status, e.enrolled_at
       from enrollments e join students s on s.id = e.student_id and s.tenant_id = e.tenant_id
       join people p on p.id = s.person_id and p.tenant_id = e.tenant_id
       where e.tenant_id = $1 and e.class_id = $2 order by e.status, p.last_name, p.first_name`, [tenantId, classId],
    );
    return result.rows.map((row) => ({ id: row.id, studentId: row.student_id, studentNumber: row.student_number, firstName: row.first_name, lastName: row.last_name, mobile: row.mobile, status: row.status, enrolledAt: row.enrolled_at }));
  }

  async create(classId: string, input: { studentId?: string; status?: ClassEnrollmentSummary["status"] }): Promise<ClassEnrollmentSummary> {
    if (!input.studentId) throw new BadRequestException("Student is required");
    const tenantId = await this.tenantId();
    await this.assertClass(classId, tenantId);
    const student = await this.db.query("select 1 from students where id = $1 and tenant_id = $2", [input.studentId, tenantId]);
    if (!student.rows[0]) throw new NotFoundException("Student was not found");
    try {
      const result = await this.db.query<{ id: string }>("insert into enrollments (tenant_id, student_id, class_id, status) values ($1,$2,$3,$4) returning id", [tenantId, input.studentId, classId, input.status ?? "active"]);
      const enrollments = await this.list(classId); const created = enrollments.find((item) => item.id === result.rows[0].id);
      if (!created) throw new ConflictException("Enrollment was created but could not be loaded");
      return created;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("Student is already enrolled in this class");
      throw error;
    }
  }

  async update(id: string, status: ClassEnrollmentSummary["status"]): Promise<ClassEnrollmentSummary> {
    if (!["pending", "active", "frozen", "transferred", "cancelled", "completed"].includes(status)) throw new BadRequestException("Invalid enrollment status");
    const tenantId = await this.tenantId();
    const result = await this.db.query<{ class_id: string }>("update enrollments set status = $1 where id = $2 and tenant_id = $3 returning class_id", [status, id, tenantId]);
    if (!result.rows[0]) throw new NotFoundException("Enrollment was not found");
    const enrollments = await this.list(result.rows[0].class_id); const updated = enrollments.find((item) => item.id === id);
    if (!updated) throw new NotFoundException("Enrollment was not found");
    return updated;
  }

  private async assertClass(classId: string, tenantId: string) { const result = await this.db.query("select 1 from classes where id = $1 and tenant_id = $2", [classId, tenantId]); if (!result.rows[0]) throw new NotFoundException("Class was not found"); }
  private async tenantId() { const result = await this.db.query<{ id: string }>("select id from tenants where slug = $1 and status = 'active'", [process.env.TENANT_SLUG ?? "demo"]); if (!result.rows[0]) throw new ConflictException("Institute is not configured"); return result.rows[0].id; }
}

function isUniqueViolation(error: unknown): error is { code: string } { return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505"; }
