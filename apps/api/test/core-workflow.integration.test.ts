import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
import { Pool } from "pg";
import { DatabaseService } from "../src/database.service";
import { AuthService } from "../src/auth/auth.service";
import { StudentsService } from "../src/students/students.service";
import { ClassesService } from "../src/classes/classes.service";
import { ClassSessionsService } from "../src/classes/class-sessions.service";
import { EnrollmentsService } from "../src/classes/enrollments.service";
import { AttendanceService } from "../src/classes/attendance.service";
import { FinanceService } from "../src/finance.service";
import { ForbiddenException } from "@nestjs/common";
import type { AuthUser } from "../src/auth/auth.types";

const testDatabase = "zabankadeh_test";
let adminPool: Pool;
let database: DatabaseService;

function testDatabaseUrl() {
  const source = process.env.DATABASE_URL;
  if (!source) throw new Error("DATABASE_URL must be configured to run integration tests");
  const url = new URL(source);
  url.pathname = `/${testDatabase}`;
  return url.toString();
}

function adminDatabaseUrl() {
  const url = new URL(testDatabaseUrl());
  url.pathname = "/postgres";
  return url.toString();
}

beforeAll(async () => {
  loadEnvFile(resolve(process.cwd(), "../../.env"));
  process.env.NODE_ENV = "test";
  process.env.AUTH_SECRET = "integration-test-secret";
  process.env.AUTH_BOOTSTRAP_MOBILE = "09386529288";

  adminPool = new Pool({ connectionString: adminDatabaseUrl() });
  await adminPool.query("select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()", [testDatabase]);
  await adminPool.query(`drop database if exists ${testDatabase}`);
  await adminPool.query(`create database ${testDatabase}`);

  process.env.DATABASE_URL = testDatabaseUrl();
  const schemaPool = new Pool({ connectionString: process.env.DATABASE_URL });
  const schema = readFileSync(resolve(process.cwd(), "../../infra/postgres/init.sql"), "utf8");
  await schemaPool.query(schema);
  await schemaPool.query(
    `insert into terms (tenant_id, name, starts_on, ends_on, status)
     values ('00000000-0000-0000-0000-000000000001', 'ترم آزمون', current_date, current_date + 90, 'active')`,
  );
  await schemaPool.end();

  database = new DatabaseService();
  await database.onModuleInit();
}, 30_000);

afterAll(async () => {
  await database?.onModuleDestroy();
  await adminPool?.query("select pg_terminate_backend(pid) from pg_stat_activity where datname = $1 and pid <> pg_backend_pid()", [testDatabase]);
  await adminPool?.query(`drop database if exists ${testDatabase}`);
  await adminPool?.end();
});

describe("core operational workflow", () => {
  it("takes an owner from OTP login through student, class, attendance, and payment", async () => {
    const auth = new AuthService(database);
    await auth.requestOtp({ mobile: "09386529288" });
    const session = await auth.verifyOtp({ mobile: "09386529288", code: "123456" });
    expect(session.user.roles).toContainEqual(expect.objectContaining({ role: "owner" }));

    const students = new StudentsService(database);
    const student = await students.create({
      firstName: "آراد",
      lastName: "آزمون",
      mobile: "09120000001",
      birthDate: "1388/07/15",
      gender: "male",
      guardian: { firstName: "مینا", lastName: "آزمون", mobile: "09120000002", relationship: "mother" },
    });
    expect(student.guardianName).toBe("مینا آزمون");

    const classes = new ClassesService(database);
    const options = await classes.options();
    const classRecord = await classes.create({
      code: "INT-EN-A1-01",
      branchId: options.branches[0].id,
      termId: options.terms[0].id,
      levelId: options.levels.find((level) => level.language === "en")?.id,
      roomId: options.rooms[0].id,
      capacity: 12,
      feeRials: 15_000_000,
      status: "active",
    });
    expect(classRecord.status).toBe("active");

    const sessions = new ClassSessionsService(database);
    const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 90 * 60 * 1000);
    const classSession = await sessions.create({
      classId: classRecord.id,
      roomId: options.rooms[0].id,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
    });

    const enrollments = new EnrollmentsService(database);
    const enrollment = await enrollments.create(classRecord.id, { studentId: student.id });
    expect(enrollment.status).toBe("active");

    const attendance = new AttendanceService(database);
    const attendanceEntry = await attendance.record(classSession.id, enrollment.id, { status: "present", note: "آزمون یکپارچه" });
    expect(attendanceEntry).toMatchObject({ enrollmentId: enrollment.id, status: "present", note: "آزمون یکپارچه" });

    const finance = new FinanceService(database);
    const invoice = await finance.create({ studentId: student.id, totalRials: 15_000_000 });
    const paid = await finance.recordPayment(invoice.id, { amountRials: 15_000_000, provider: "manual" });
    expect(paid).toMatchObject({ id: invoice.id, balanceRials: 0, status: "paid" });
  });

  it("limits a branch manager to the classes assigned to their branch", async () => {
    const classes = new ClassesService(database);
    const options = await classes.options();
    const primaryBranch = options.branches[0];
    const extraBranch = await database.query<{ id: string }>(
      "insert into branches (tenant_id, name_fa, name_en, status) values ($1, 'شعبه غرب', 'West branch', 'active') returning id",
      ["00000000-0000-0000-0000-000000000001"],
    );
    const secondClass = await classes.create({
      code: "INT-DE-A1-02",
      branchId: extraBranch.rows[0].id,
      termId: options.terms[0].id,
      levelId: options.levels.find((level) => level.language === "de")?.id,
      capacity: 10,
      status: "active",
    });
    const manager: AuthUser = {
      id: "branch-manager-test",
      tenantId: "00000000-0000-0000-0000-000000000001",
      mobile: "09120000003",
      displayName: "مدیر شعبه",
      roles: [{ role: "branch_manager", branchId: primaryBranch.id }],
    };

    const visibleClasses = await classes.list(manager);
    expect(visibleClasses.some((item) => item.id === secondClass.id)).toBe(false);
    await expect(classes.create({
      code: "INT-DE-A1-03",
      branchId: extraBranch.rows[0].id,
      termId: options.terms[0].id,
      levelId: options.levels.find((level) => level.language === "de")?.id,
      capacity: 10,
    }, manager)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
