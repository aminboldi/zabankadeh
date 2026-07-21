import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import type { InvoiceSummary } from "@zabankadeh/contracts";
import { randomUUID } from "node:crypto";
import { DatabaseService } from "./database.service";

@Injectable()
export class FinanceService {
  constructor(private readonly db: DatabaseService) {}

  async list(): Promise<InvoiceSummary[]> {
    const tenantId = await this.tenantId();
    const result = await this.db.query<InvoiceSummary & { student_id: string; student_name: string; total_rials: string; balance_rials: string; due_on: string | null; created_at: string }>(
      `select i.id, i.number, i.student_id, p.first_name || ' ' || p.last_name student_name,
              i.total_rials, i.balance_rials, i.status, i.due_on, i.created_at
       from invoices i join students s on s.id = i.student_id and s.tenant_id = i.tenant_id
       join people p on p.id = s.person_id and p.tenant_id = i.tenant_id
       where i.tenant_id = $1 order by i.created_at desc`, [tenantId],
    );
    return result.rows.map((row) => ({ id: row.id, number: row.number, studentId: row.student_id, studentName: row.student_name, totalRials: Number(row.total_rials), balanceRials: Number(row.balance_rials), status: row.status, dueOn: row.due_on, createdAt: row.created_at }));
  }

  async create(input: { studentId?: string; totalRials?: number; dueOn?: string }): Promise<InvoiceSummary> {
    if (!input.studentId || !input.totalRials || input.totalRials < 1) throw new BadRequestException("Student and invoice amount are required");
    const tenantId = await this.tenantId();
    const student = await this.db.query("select 1 from students where id = $1 and tenant_id = $2", [input.studentId, tenantId]);
    if (!student.rows[0]) throw new NotFoundException("Student was not found");
    const number = `INV-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 6).toUpperCase()}`;
    const result = await this.db.query<{ id: string }>(
      "insert into invoices (tenant_id, student_id, number, total_rials, balance_rials, status, due_on) values ($1,$2,$3,$4,$4,'issued',$5) returning id",
      [tenantId, input.studentId, number, input.totalRials, input.dueOn || null],
    );
    const invoice = (await this.list()).find((item) => item.id === result.rows[0].id);
    if (!invoice) throw new ConflictException("Invoice was created but could not be loaded");
    return invoice;
  }

  async recordPayment(invoiceId: string, input: { amountRials?: number; provider?: string }): Promise<InvoiceSummary> {
    if (!input.amountRials || input.amountRials < 1) throw new BadRequestException("Payment amount is required");
    const tenantId = await this.tenantId();
    const result = await this.db.transaction(async (client) => {
      const invoiceResult = await client.query<{ student_id: string; balance_rials: string; status: string }>("select student_id, balance_rials, status from invoices where id = $1 and tenant_id = $2 for update", [invoiceId, tenantId]);
      const invoice = invoiceResult.rows[0]; if (!invoice) throw new NotFoundException("Invoice was not found");
      const amount = Number(input.amountRials); const balance = Number(invoice.balance_rials); if (amount > balance) throw new BadRequestException("Payment cannot exceed the outstanding balance");
      const nextBalance = balance - amount; const nextStatus = nextBalance === 0 ? "paid" : "partial";
      await client.query("insert into payments (tenant_id, invoice_id, provider, amount_rials, status, idempotency_key, verified_at) values ($1,$2,$3,$4,'verified',$5,now())", [tenantId, invoiceId, input.provider?.trim() || "manual", amount, randomUUID()]);
      await client.query("update invoices set balance_rials = $1, status = $2 where id = $3 and tenant_id = $4", [nextBalance, nextStatus, invoiceId, tenantId]);
      return invoiceId;
    });
    const invoice = (await this.list()).find((item) => item.id === result); if (!invoice) throw new ConflictException("Payment was recorded but invoice could not be loaded"); return invoice;
  }

  private async tenantId() { const result = await this.db.query<{ id: string }>("select id from tenants where slug = $1 and status = 'active'", [process.env.TENANT_SLUG ?? "demo"]); if (!result.rows[0]) throw new ConflictException("Institute is not configured"); return result.rows[0].id; }
}
