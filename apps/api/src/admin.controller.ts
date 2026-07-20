import { Controller, Get, UseGuards } from "@nestjs/common";
import type { DashboardSummary } from "@zabankadeh/contracts";
import { DatabaseService } from "./database.service";
import { AuthGuard } from "./auth/auth.guard";
import { Roles } from "./auth/roles.decorator";
import { RolesGuard } from "./auth/roles.guard";

@Controller("admin")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "registrar", "finance", "academic_supervisor")
export class AdminController {
  constructor(private readonly db: DatabaseService) {}

  @Get("dashboard")
  async dashboard(): Promise<DashboardSummary> {
    const slug = process.env.TENANT_SLUG ?? "demo";
    const result = await this.db.query<{
      active_students: string; active_classes: string; today_sessions: string; outstanding_rials: string;
    }>(
      `select
        (select count(*) from students s where s.tenant_id = t.id and s.status = 'active') active_students,
        (select count(*) from classes c where c.tenant_id = t.id and c.status = 'active') active_classes,
        (select count(*) from class_sessions cs where cs.tenant_id = t.id and cs.starts_at::date = current_date) today_sessions,
        (select coalesce(sum(i.balance_rials), 0) from invoices i where i.tenant_id = t.id and i.status in ('issued','partial')) outstanding_rials
       from tenants t where t.slug = $1`,
      [slug],
    );
    const row = result.rows[0] ?? { active_students: "0", active_classes: "0", today_sessions: "0", outstanding_rials: "0" };
    const schedule = await this.db.query<{
      id: string; starts_at: Date; ends_at: Date; class_code: string; level: string;
      language: "en" | "de"; instructor_name: string | null; room_name: string | null;
    }>(
      `select cs.id, cs.starts_at, cs.ends_at, c.code class_code, pl.name_fa level,
              p.first_name || ' ' || p.last_name instructor_name, r.name room_name,
              pr.language
       from class_sessions cs
       join classes c on c.id = cs.class_id and c.tenant_id = cs.tenant_id
       join program_levels pl on pl.id = c.level_id and pl.tenant_id = cs.tenant_id
       join programs pr on pr.id = pl.program_id and pr.tenant_id = cs.tenant_id
       left join instructors i on i.id = coalesce(cs.instructor_id, c.instructor_id) and i.tenant_id = cs.tenant_id
       left join people p on p.id = i.person_id and p.tenant_id = cs.tenant_id
       left join rooms r on r.id = coalesce(cs.room_id, c.room_id) and r.tenant_id = cs.tenant_id
       where cs.tenant_id = (select id from tenants where slug = $1) and cs.starts_at::date = current_date
       order by cs.starts_at`,
      [slug],
    );
    const applicants = await this.db.query<{ id: string; candidate_name: string; language: "en" | "de"; status: string }>(
      `select id, candidate_name, language, case when submitted_at is null then 'assessment_started' else 'placement_ready' end status
       from assessment_attempts where tenant_id = (select id from tenants where slug = $1)
       order by created_at desc limit 5`,
      [slug],
    );
    return {
      activeStudents: Number(row.active_students),
      activeClasses: Number(row.active_classes),
      todaySessions: Number(row.today_sessions),
      outstandingRials: Number(row.outstanding_rials),
      todaySchedule: schedule.rows.map((session) => ({
        id: session.id,
        startsAt: session.starts_at.toISOString(),
        endsAt: session.ends_at.toISOString(),
        classCode: session.class_code,
        level: session.level,
        language: session.language,
        instructorName: session.instructor_name,
        roomName: session.room_name,
      })),
      recentApplicants: applicants.rows.map((a) => ({ id: a.id, name: a.candidate_name, language: a.language, status: a.status })),
    };
  }
}
