import { ConflictException, Injectable } from "@nestjs/common";

export type PaymentRequest = { amountRials: number; description: string; callbackUrl: string; mobile?: string; metadata?: Record<string, string> };
export type PaymentRequestResult = { authority: string; redirectUrl: string };

export interface PaymentGateway {
  readonly provider: "manual" | "zarinpal";
  isConfigured(): boolean;
  request(input: PaymentRequest): Promise<PaymentRequestResult>;
}

@Injectable()
export class PaymentGatewayService {
  private readonly provider = (process.env.PAYMENT_GATEWAY_PROVIDER ?? "manual") as "manual" | "zarinpal";
  private readonly zarinpal = new ZarinpalGateway();
  status() { const configured = this.provider === "zarinpal" ? this.zarinpal.isConfigured() : true; return { provider: this.provider, configured, label: this.provider === "zarinpal" ? "زرین‌پال" : "ثبت دستی" } as const; }
  async request(input: PaymentRequest) { if (this.provider === "manual") throw new ConflictException("Online payment gateway is not configured"); return this.zarinpal.request(input); }
}

class ZarinpalGateway implements PaymentGateway {
  readonly provider = "zarinpal" as const;
  private readonly merchantId = process.env.ZARINPAL_MERCHANT_ID ?? "";
  private readonly callbackUrl = process.env.PAYMENT_CALLBACK_URL ?? "";
  isConfigured() { return Boolean(this.merchantId && this.callbackUrl); }
  async request(input: PaymentRequest): Promise<PaymentRequestResult> {
    if (!this.isConfigured()) throw new ConflictException("ZarinPal merchant ID and payment callback URL are required");
    const response = await fetch("https://api.zarinpal.com/pg/v4/payment/request.json", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ merchant_id: this.merchantId, amount: input.amountRials, description: input.description, callback_url: input.callbackUrl || this.callbackUrl, metadata: { mobile: input.mobile, ...input.metadata } }) });
    const value = await response.json() as { data?: { authority?: string }; errors?: unknown };
    const authority = value.data?.authority; if (!response.ok || !authority) throw new ConflictException("Payment gateway request failed");
    return { authority, redirectUrl: `https://www.zarinpal.com/pg/StartPay/${authority}` };
  }
}
