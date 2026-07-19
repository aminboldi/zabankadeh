import { Controller, Get, Headers, UnauthorizedException } from "@nestjs/common";
import type { DashboardSummary } from "@zabankadeh/contracts";
import { DatabaseService } from "./database.service";

@Controller("admin")
export class AdminController {
  constructor(private readonly db: DatabaseService) {}

  @Get("dashboard")
  async dashboard(@Headers("x-admin-key") key?: string): Promise<DashboardSummary> {
    const expected = process.env.ADMIN_DEMO_KEY ?? "demo-admin";
    if (key !== expected) throw new UnauthorizedException();
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
    const applicants = await this.db.query<{ id: string; candidate_name: string; language: "en" | "de"; status: string }>(
      `select id, candidate_name, language, case when submitted_at is null then 'assessment_started' else 'placement_ready' end status
       from assessment_attempts order by created_at desc limit 5`,
    );
    return {
      activeStudents: Number(row.active_students),
      activeClasses: Number(row.active_classes),
      todaySessions: Number(row.today_sessions),
      outstandingRials: Number(row.outstanding_rials),
      recentApplicants: applicants.rows.map((a) => ({ id: a.id, name: a.candidate_name, language: a.language, status: a.status })),
    };
  }
}
