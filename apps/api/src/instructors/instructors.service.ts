import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type { InstructorSummary } from "@zabankadeh/contracts";
import { DatabaseService } from "../database.service";

export type CreateInstructorInput = { firstName?: string; lastName?: string; mobile?: string; bio?: Record<string, unknown> };
@Injectable()
export class InstructorsService {
  constructor(private readonly db: DatabaseService) {}
  async list() {
    const tenantId = await this.tenantId();
    const result = await this.db.query<InstructorSummary & { first_name: string; last_name: string }>(
      `select i.id, p.first_name, p.last_name, p.mobile, i.bio, i.status from instructors i join people p on p.id = i.person_id and p.tenant_id = i.tenant_id where i.tenant_id = $1 order by p.last_name, p.first_name`, [tenantId]);
    return result.rows.map(toSummary);
  }
  async create(input: CreateInstructorInput): Promise<InstructorSummary> {
    const firstName = input.firstName?.trim(); const lastName = input.lastName?.trim();
    if (!firstName || !lastName) throw new BadRequestException("First and last name are required");
    const tenantId = await this.tenantId();
    try {
      return this.db.transaction(async (client) => {
        const person = await client.query<{ id: string }>("insert into people (tenant_id, first_name, last_name, mobile) values ($1, $2, $3, nullif($4, '')) returning id", [tenantId, firstName, lastName, input.mobile?.trim() ?? ""]);
        const instructor = await client.query<{ id: string; status: string }>("insert into instructors (tenant_id, person_id, bio) values ($1, $2, $3) returning id, status", [tenantId, person.rows[0].id, input.bio ?? {}]);
        return { id: instructor.rows[0].id, firstName, lastName, mobile: input.mobile?.trim() || null, bio: input.bio ?? {}, status: instructor.rows[0].status };
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("This instructor is already registered");
      throw error;
    }
  }
  private async tenantId() { const result = await this.db.query<{ id: string }>("select id from tenants where slug = $1 and status = 'active'", [process.env.TENANT_SLUG ?? "demo"]); if (!result.rows[0]) throw new ConflictException("Institute is not configured"); return result.rows[0].id; }
}
function toSummary(row: InstructorSummary & { first_name: string; last_name: string }): InstructorSummary { return { id: row.id, firstName: row.first_name, lastName: row.last_name, mobile: row.mobile, bio: row.bio, status: row.status }; }
function isUniqueViolation(error: unknown): error is { code: string } { return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505"; }
