import { Body, Controller, Get, Param, Post, UseGuards } from "@nestjs/common";
import type { InvoiceSummary } from "@zabankadeh/contracts";
import { AuthGuard } from "./auth/auth.guard";
import { Roles } from "./auth/roles.decorator";
import { RolesGuard } from "./auth/roles.guard";
import { FinanceService } from "./finance.service";

@Controller("admin/invoices")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "registrar", "finance")
export class FinanceController {
  constructor(private readonly finance: FinanceService) {}
  @Get() list(): Promise<InvoiceSummary[]> { return this.finance.list(); }
  @Post() create(@Body() body: { studentId?: string; totalRials?: number; dueOn?: string }): Promise<InvoiceSummary> { return this.finance.create(body); }
  @Post(":invoiceId/payments") payment(@Param("invoiceId") invoiceId: string, @Body() body: { amountRials?: number; provider?: string }): Promise<InvoiceSummary> { return this.finance.recordPayment(invoiceId, body); }
}
