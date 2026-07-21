import { BadRequestException, ConflictException, Injectable } from "@nestjs/common";
import type { StudentDetail, StudentSummary } from "@zabankadeh/contracts";
import { randomBytes } from "node:crypto";
import { DatabaseService } from "../database.service";

export type CreateStudentInput = {
  firstName?: string;
  lastName?: string;
  mobile?: string;
  email?: string;
  birthDate?: string;
  gender?: "female" | "male" | "other";
  nationalId?: string;
  studentNumber?: string;
  guardian?: { firstName?: string; lastName?: string; mobile?: string; relationship?: string };
};
export type UpdateStudentInput = Omit<CreateStudentInput, "studentNumber"> & { status?: "lead" | "active" | "frozen" | "inactive" };

type StudentRow = {
  id: string; student_number: string; first_name: string; last_name: string;
  mobile: string | null; gender: StudentSummary["gender"]; birth_date: string | null; status: StudentSummary["status"]; joined_at: string;
  guardian_name: string | null; guardian_mobile: string | null;
};

@Injectable()
export class StudentsService {
  constructor(private readonly db: DatabaseService) {}

  async list(query?: string): Promise<StudentSummary[]> {
    const tenantId = await this.tenantId();
    const search = query?.trim() ?? "";
    const result = await this.db.query<StudentRow>(
      `select s.id, s.student_number, p.first_name, p.last_name, p.mobile, p.gender, to_char(p.birth_date, 'YYYY-MM-DD') birth_date, s.status, s.joined_at::text,
              gp.first_name || ' ' || gp.last_name guardian_name, gp.mobile guardian_mobile
       from students s
       join people p on p.id = s.person_id and p.tenant_id = s.tenant_id
       left join lateral (
         select gp.first_name, gp.last_name, gp.mobile
         from student_guardians sg join guardians g on g.id = sg.guardian_id
         join people gp on gp.id = g.person_id
         where sg.student_id = s.id and sg.tenant_id = s.tenant_id
         order by sg.relationship limit 1
       ) gp on true
       where s.tenant_id = $1
         and ($2 = '' or p.first_name ilike '%' || $2 || '%' or p.last_name ilike '%' || $2 || '%'
              or p.mobile ilike '%' || $2 || '%' or s.student_number ilike '%' || $2 || '%')
       order by s.joined_at desc, p.last_name, p.first_name limit 100`, [tenantId, search]);
    return result.rows.map(toSummary);
  }

  async create(input: CreateStudentInput): Promise<StudentSummary> {
    const firstName = clean(input.firstName);
    const lastName = clean(input.lastName);
    if (!firstName || !lastName) throw new BadRequestException("First and last name are required");
    const guardian = input.guardian;
    if (guardian && (!clean(guardian.firstName) || !clean(guardian.lastName) || !clean(guardian.mobile))) {
      throw new BadRequestException("Guardian name and mobile are required together");
    }

    const tenantId = await this.tenantId();
    const studentNumber = clean(input.studentNumber) || `STU-${randomBytes(4).toString("hex").toUpperCase()}`;
    const birthDate = jalaliToGregorian(clean(input.birthDate));
    const gender = input.gender === "female" || input.gender === "male" || input.gender === "other" ? input.gender : undefined;
    try {
      return await this.db.transaction(async (client) => {
        const person = await client.query<{ id: string }>(
          `insert into people (tenant_id, first_name, last_name, mobile, email, birth_date, gender, national_id)
           values ($1, $2, $3, nullif($4, ''), nullif($5, ''), nullif($6, '')::date, $7, nullif($8, '')) returning id`,
          [tenantId, firstName, lastName, clean(input.mobile), clean(input.email), birthDate, gender ?? null, clean(input.nationalId)],
        );
        const student = await client.query<{ id: string }>(
          `insert into students (tenant_id, person_id, student_number) values ($1, $2, $3) returning id`,
          [tenantId, person.rows[0].id, studentNumber],
        );
        if (guardian) {
          const guardianPerson = await client.query<{ id: string }>(
            `insert into people (tenant_id, first_name, last_name, mobile) values ($1, $2, $3, $4) returning id`,
            [tenantId, clean(guardian.firstName), clean(guardian.lastName), clean(guardian.mobile)],
          );
          const guardianRow = await client.query<{ id: string }>(
            `insert into guardians (tenant_id, person_id) values ($1, $2) returning id`,
            [tenantId, guardianPerson.rows[0].id],
          );
          await client.query(
            `insert into student_guardians (tenant_id, student_id, guardian_id, relationship)
             values ($1, $2, $3, $4)`,
            [tenantId, student.rows[0].id, guardianRow.rows[0].id, clean(guardian.relationship) || "guardian"],
          );
        }
        return this.findById(client, tenantId, student.rows[0].id);
      });
    } catch (error) {
      if (isUniqueViolation(error)) throw new ConflictException("Student number already exists");
      throw error;
    }
  }

  async detail(id: string): Promise<StudentDetail> {
    const tenantId = await this.tenantId();
    return this.findDetail(this.db, tenantId, id);
  }

  async update(id: string, input: UpdateStudentInput): Promise<StudentDetail> {
    const firstName = clean(input.firstName); const lastName = clean(input.lastName);
    if (!firstName || !lastName) throw new BadRequestException("First and last name are required");
    const gender = input.gender === "female" || input.gender === "male" || input.gender === "other" ? input.gender : null;
    const birthDate = jalaliToGregorian(clean(input.birthDate)); const tenantId = await this.tenantId();
    return this.db.transaction(async (client) => {
      const current = await client.query<{ person_id: string }>("select person_id from students where id = $1 and tenant_id = $2", [id, tenantId]);
      if (!current.rows[0]) throw new BadRequestException("Student was not found");
      await client.query(
        `update people set first_name = $1, last_name = $2, mobile = nullif($3, ''), email = nullif($4, ''),
         birth_date = nullif($5, '')::date, gender = $6, national_id = nullif($7, '') where id = $8 and tenant_id = $9`,
        [firstName, lastName, clean(input.mobile), clean(input.email), birthDate, gender, clean(input.nationalId), current.rows[0].person_id, tenantId],
      );
      if (input.status) await client.query("update students set status = $1 where id = $2 and tenant_id = $3", [input.status, id, tenantId]);
      if (input.guardian) {
        const guardian = input.guardian;
        if (!clean(guardian.firstName) || !clean(guardian.lastName) || !clean(guardian.mobile)) throw new BadRequestException("Guardian name and mobile are required together");
        const existing = await client.query<{ guardian_id: string; person_id: string }>(
          `select g.id guardian_id, g.person_id from student_guardians sg join guardians g on g.id = sg.guardian_id where sg.student_id = $1 and sg.tenant_id = $2 limit 1`, [id, tenantId]);
        let guardianId = existing.rows[0]?.guardian_id;
        if (existing.rows[0]) {
          await client.query("update people set first_name = $1, last_name = $2, mobile = $3 where id = $4 and tenant_id = $5", [clean(guardian.firstName), clean(guardian.lastName), clean(guardian.mobile), existing.rows[0].person_id, tenantId]);
          await client.query("update student_guardians set relationship = $1 where student_id = $2 and guardian_id = $3", [clean(guardian.relationship) || "guardian", id, guardianId]);
        } else {
          const person = await client.query<{ id: string }>("insert into people (tenant_id, first_name, last_name, mobile) values ($1, $2, $3, $4) returning id", [tenantId, clean(guardian.firstName), clean(guardian.lastName), clean(guardian.mobile)]);
          const row = await client.query<{ id: string }>("insert into guardians (tenant_id, person_id) values ($1, $2) returning id", [tenantId, person.rows[0].id]); guardianId = row.rows[0].id;
          await client.query("insert into student_guardians (tenant_id, student_id, guardian_id, relationship) values ($1, $2, $3, $4)", [tenantId, id, guardianId, clean(guardian.relationship) || "guardian"]);
        }
      }
      return this.findDetail(client, tenantId, id);
    });
  }

  private async findById(client: Pick<DatabaseService, "query">, tenantId: string, id: string) {
    const result = await client.query<StudentRow>(
      `select s.id, s.student_number, p.first_name, p.last_name, p.mobile, p.gender, to_char(p.birth_date, 'YYYY-MM-DD') birth_date, s.status, s.joined_at::text,
              gp.first_name || ' ' || gp.last_name guardian_name, gp.mobile guardian_mobile
       from students s join people p on p.id = s.person_id
       left join lateral (
         select gp.first_name, gp.last_name, gp.mobile from student_guardians sg
         join guardians g on g.id = sg.guardian_id join people gp on gp.id = g.person_id
         where sg.student_id = s.id order by sg.relationship limit 1
       ) gp on true where s.tenant_id = $1 and s.id = $2`, [tenantId, id]);
    return toSummary(result.rows[0]);
  }

  private async findDetail(client: Pick<DatabaseService, "query">, tenantId: string, id: string): Promise<StudentDetail> {
    const result = await client.query<StudentRow & { email: string | null; national_id: string | null; guardian_relationship: string | null }>(
      `select s.id, s.student_number, p.first_name, p.last_name, p.mobile, p.email, p.national_id, p.gender, to_char(p.birth_date, 'YYYY-MM-DD') birth_date, s.status, s.joined_at::text,
              gp.first_name || ' ' || gp.last_name guardian_name, gp.mobile guardian_mobile, gp.relationship guardian_relationship
       from students s join people p on p.id = s.person_id and p.tenant_id = s.tenant_id
       left join lateral (select gp.first_name, gp.last_name, gp.mobile, sg.relationship from student_guardians sg join guardians g on g.id = sg.guardian_id join people gp on gp.id = g.person_id where sg.student_id = s.id order by sg.relationship limit 1) gp on true
       where s.tenant_id = $1 and s.id = $2`, [tenantId, id]);
    const row = result.rows[0];
    if (!row) throw new BadRequestException("Student was not found");
    return { ...toSummary(row), email: row.email, nationalId: row.national_id, guardianRelationship: row.guardian_relationship };
  }

  private async tenantId() {
    const result = await this.db.query<{ id: string }>("select id from tenants where slug = $1 and status = 'active'", [process.env.TENANT_SLUG ?? "demo"]);
    if (!result.rows[0]) throw new ConflictException("Institute is not configured");
    return result.rows[0].id;
  }
}

function clean(value?: string) { return value?.trim() ?? ""; }
function toSummary(row: StudentRow): StudentSummary {
  return { id: row.id, studentNumber: row.student_number, firstName: row.first_name, lastName: row.last_name, mobile: row.mobile, gender: row.gender, birthDateJalali: row.birth_date ? gregorianToJalali(row.birth_date) : null, status: row.status, joinedAt: row.joined_at, guardianName: row.guardian_name, guardianMobile: row.guardian_mobile };
}
function isUniqueViolation(error: unknown): error is { code: string } { return typeof error === "object" && error !== null && "code" in error && (error as { code?: string }).code === "23505"; }

function jalaliToGregorian(value: string) {
  if (!value) return "";
  const match = /^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})$/.exec(value);
  if (!match) throw new BadRequestException("Birth date must use Jalali format YYYY/MM/DD");
  let jy = Number(match[1]) - 979; const jm = Number(match[2]); const jd = Number(match[3]);
  if (jm < 1 || jm > 12 || jd < 1 || jd > (jm <= 6 ? 31 : jm < 12 ? 30 : isJalaliLeap(Number(match[1])) ? 30 : 29)) throw new BadRequestException("Birth date is invalid");
  let gy = 1600 + 400 * Math.floor(jy / 146097); jy %= 146097;
  if (jy >= 36525) { gy += 100 * Math.floor(--jy / 36524); jy %= 36524; if (jy >= 365) jy++; }
  gy += 4 * Math.floor(jy / 1461); jy %= 1461;
  if (jy >= 366) { gy += Math.floor((jy - 1) / 365); jy = (jy - 1) % 365; }
  const days = [0,31,59,90,120,151,181,212,243,273,304,334];
  const day = 80 + jd + (jm > 1 ? days[jm - 1] : 0) + 365 * jy + Math.floor(jy / 4) - Math.floor(jy / 100);
  gy += Math.floor(day / 365); const doy = day % 365;
  const leap = (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0;
  const monthDays = [31, leap ? 29 : 28, 31,30,31,30,31,31,30,31,30,31]; let gm = 0; let remaining = doy;
  while (remaining >= monthDays[gm]) remaining -= monthDays[gm++];
  return `${gy.toString().padStart(4, "0")}-${(gm + 1).toString().padStart(2, "0")}-${(remaining + 1).toString().padStart(2, "0")}`;
}

function isJalaliLeap(year: number) { return ((year + 38) * 682) % 2816 < 682; }

function gregorianToJalali(value: string) {
  const [gy, gm, gd] = value.split("-").map(Number); let gYear = gy - 1600; const gMonth = gm - 1; const gDay = gd - 1;
  const gDays = [31,28,31,30,31,30,31,31,30,31,30,31]; let day = 365 * gYear + Math.floor((gYear + 3) / 4) - Math.floor((gYear + 99) / 100) + Math.floor((gYear + 399) / 400);
  for (let i = 0; i < gMonth; i++) day += gDays[i]; if (gMonth > 1 && ((gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0)) day++; day += gDay;
  let jDay = day - 79; const jCycle = Math.floor(jDay / 12053); jDay %= 12053; let jy = 979 + 33 * jCycle + 4 * Math.floor(jDay / 1461); jDay %= 1461;
  if (jDay >= 366) { jy += Math.floor((jDay - 1) / 365); jDay = (jDay - 1) % 365; }
  const jm = jDay < 186 ? 1 + Math.floor(jDay / 31) : 7 + Math.floor((jDay - 186) / 30); const jd = 1 + (jDay < 186 ? jDay % 31 : (jDay - 186) % 30);
  return `${jy}/${jm.toString().padStart(2, "0")}/${jd.toString().padStart(2, "0")}`;
}
