import { ConflictException, Injectable } from "@nestjs/common";
import type { ReportOverview } from "@zabankadeh/contracts";
import { DatabaseService } from "./database.service";

@Injectable()
export class ReportsService {
  constructor(private readonly db: DatabaseService) {}

  async overview(): Promise<ReportOverview> {
    const tenantId = await this.tenantId();
    const result = await this.db.query<{ active_students: string; active_classes: string; scheduled_sessions: string; outstanding_rials: string; present: string; absent: string; late: string; excused: string }>(
      `select
         (select count(*) from students where tenant_id = $1 and status = 'active') active_students,
         (select count(*) from classes where tenant_id = $1 and status in ('active','draft')) active_classes,
         (select count(*) from class_sessions where tenant_id = $1 and status = 'scheduled' and starts_at >= now()) scheduled_sessions,
         (select coalesce(sum(balance_rials), 0) from invoices where tenant_id = $1 and status in ('issued','partial')) outstanding_rials,
         (select count(*) filter (where status = 'present') from attendance where tenant_id = $1) present,
         (select count(*) filter (where status = 'absent') from attendance where tenant_id = $1) absent,
         (select count(*) filter (where status = 'late') from attendance where tenant_id = $1) late,
         (select count(*) filter (where status = 'excused') from attendance where tenant_id = $1) excused`, [tenantId],
    );
    const row = result.rows[0]; const present = Number(row?.present ?? 0); const absent = Number(row?.absent ?? 0); const late = Number(row?.late ?? 0); const excused = Number(row?.excused ?? 0); const total = present + absent + late + excused;
    return { generatedAt: new Date().toISOString(), activeStudents: Number(row?.active_students ?? 0), activeClasses: Number(row?.active_classes ?? 0), scheduledSessions: Number(row?.scheduled_sessions ?? 0), outstandingRials: Number(row?.outstanding_rials ?? 0), attendance: { present, absent, late, excused, rate: total ? Math.round((present / total) * 100) : 0 } };
  }

  private async tenantId() { const result = await this.db.query<{ id: string }>("select id from tenants where slug = $1 and status = 'active'", [process.env.TENANT_SLUG ?? "demo"]); if (!result.rows[0]) throw new ConflictException("Institute is not configured"); return result.rows[0].id; }
}
