import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type { ClassOptions, ClassSummary } from "@zabankadeh/contracts";
import { DatabaseService } from "../database.service";

@Injectable()
export class ClassesService {
  constructor(private readonly db: DatabaseService) {}
  async list(): Promise<ClassSummary[]> {
    const result = await this.db.query<ClassSummary & { class_code: string; level: string; language: "en" | "de"; age_band: "child" | "teen" | "adult"; branch_name: string; instructor_name: string | null; room_name: string | null; capacity: number; fee_rials: string; class_type: "in_person" | "online" | "hybrid"; status: string }>(
      `select c.id, c.code class_code, pl.name_fa level, pr.language, pr.age_band, b.name_fa branch_name,
              c.class_type,
              ip.first_name || ' ' || ip.last_name instructor_name, r.name room_name, c.capacity, c.fee_rials, c.status
       from classes c join branches b on b.id = c.branch_id and b.tenant_id = c.tenant_id
       join program_levels pl on pl.id = c.level_id and pl.tenant_id = c.tenant_id
       join programs pr on pr.id = pl.program_id and pr.tenant_id = c.tenant_id
       left join instructors i on i.id = c.instructor_id and i.tenant_id = c.tenant_id
       left join people ip on ip.id = i.person_id and ip.tenant_id = c.tenant_id
       left join rooms r on r.id = c.room_id and r.tenant_id = c.tenant_id
       where c.tenant_id = (select id from tenants where slug = $1 and status = 'active')
       order by c.status, c.code`, [process.env.TENANT_SLUG ?? "demo"]);
    return result.rows.map((row) => ({ id: row.id, code: row.class_code, level: row.level, language: row.language, ageBand: row.age_band, branchName: row.branch_name, instructorName: row.instructor_name, roomName: row.room_name, capacity: row.capacity, feeRials: Number(row.fee_rials), classType: row.class_type, status: row.status }));
  }

  async options(): Promise<ClassOptions> {
    const tenantId = await this.tenantId();
    const [branches, levels, rooms, instructors, terms] = await Promise.all([
      this.db.query<{ id: string; name: string }>("select id, name_fa name from branches where tenant_id = $1 and status = 'active' order by name_fa", [tenantId]),
      this.db.query<{ id: string; label: string; language: 'en' | 'de'; age_band: 'child' | 'teen' | 'adult' }>("select distinct on (p.language, pl.name_fa) pl.id, pl.name_fa label, p.language, p.age_band from program_levels pl join programs p on p.id = pl.program_id where pl.tenant_id = $1 and p.status = 'active' order by p.language, pl.name_fa, case p.age_band when 'adult' then 1 when 'teen' then 2 else 3 end", [tenantId]),
      this.db.query<{ id: string; name: string; branch_id: string }>("select id, name, branch_id from rooms where tenant_id = $1 order by name", [tenantId]),
      this.db.query<{ id: string; name: string }>("select i.id, p.first_name || ' ' || p.last_name name from instructors i join people p on p.id = i.person_id where i.tenant_id = $1 and i.status = 'active' order by p.last_name", [tenantId]),
      this.db.query<{ id: string; name: string }>("select id, name from terms where tenant_id = $1 and status in ('draft','active') order by starts_on desc", [tenantId]),
    ]);
    return { branches: branches.rows, levels: levels.rows.map((row) => ({ id: row.id, label: row.label, language: row.language, ageBand: row.age_band })), rooms: rooms.rows.map((row) => ({ id: row.id, name: row.name, branchId: row.branch_id })), instructors: instructors.rows, terms: terms.rows };
  }

  async create(input: CreateClassInput): Promise<ClassSummary> {
    if (!input.code?.trim() || !input.branchId || !input.termId || !input.levelId || !input.capacity || input.capacity < 1) throw new BadRequestException("Class code, branch, term, level, and capacity are required");
    const tenantId = await this.tenantId();
    try {
      const result = await this.db.query<{ id: string }>(
        `insert into classes (tenant_id, branch_id, term_id, level_id, instructor_id, room_id, code, capacity, fee_rials, class_type, status)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) returning id`,
        [tenantId, input.branchId, input.termId, input.levelId, input.instructorId || null, input.roomId || null, input.code.trim(), input.capacity, input.feeRials ?? 0, input.classType ?? "in_person", input.status ?? "draft"],
      );
      const classes = await this.list();
      const created = classes.find((item) => item.id === result.rows[0].id);
      if (!created) throw new ConflictException("Class was created but could not be loaded");
      return created;
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("Class code already exists");
      throw error;
    }
  }

  private async tenantId() { const result = await this.db.query<{ id: string }>("select id from tenants where slug = $1 and status = 'active'", [process.env.TENANT_SLUG ?? "demo"]); if (!result.rows[0]) throw new ConflictException("Institute is not configured"); return result.rows[0].id; }
}

export type CreateClassInput = { branchId?: string; termId?: string; levelId?: string; instructorId?: string; roomId?: string; code?: string; capacity?: number; feeRials?: number; classType?: "in_person" | "online" | "hybrid"; status?: "draft" | "active" };
function isUniqueViolation(error: unknown): error is { code: string } { return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505"; }
