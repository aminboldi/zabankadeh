import { Controller, Get, UseGuards } from "@nestjs/common";
import type { PaymentGatewayStatus } from "@zabankadeh/contracts";
import { AuthGuard } from "./auth/auth.guard";
import { Roles } from "./auth/roles.decorator";
import { RolesGuard } from "./auth/roles.guard";
import { PaymentGatewayService } from "./integrations/payment-gateways";

@Controller("admin/payment-gateway")
@UseGuards(AuthGuard, RolesGuard)
@Roles("owner", "branch_manager", "finance")
export class PaymentGatewayController {
  constructor(private readonly gateway: PaymentGatewayService) {}
  @Get("status") status(): PaymentGatewayStatus { return this.gateway.status(); }
}
