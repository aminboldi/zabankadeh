export type SmsMessage = { recipient: string; body: string };
export type SmsReceipt = { provider: string; messageId: string };

export interface SmsProvider {
  send(message: SmsMessage): Promise<SmsReceipt>;
}

export class ConsoleSmsProvider implements SmsProvider {
  async send(message: SmsMessage): Promise<SmsReceipt> {
    const messageId = `console-${Date.now()}`;
    // The console provider is for local development only, so show the OTP body.
    console.info(`[sms:${messageId}] ${message.recipient}: ${message.body}`);
    return { provider: "console", messageId };
  }
}

export class KavenegarSmsProvider implements SmsProvider {
  constructor(private readonly apiKey: string, private readonly sender?: string) {
    if (!apiKey) throw new Error("KAVENEGAR_API_KEY is required");
  }

  async send(message: SmsMessage): Promise<SmsReceipt> {
    const body = new URLSearchParams({ receptor: message.recipient, message: message.body });
    if (this.sender) body.set("sender", this.sender);
    const response = await fetch(
      `https://api.kavenegar.com/v1/${encodeURIComponent(this.apiKey)}/sms/send.json`,
      { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" }, body },
    );
    if (!response.ok) throw new Error(`Kavenegar request failed with ${response.status}`);
    const payload = await response.json() as { entries?: Array<{ messageid?: number | string }> };
    const messageId = payload.entries?.[0]?.messageid;
    if (!messageId) throw new Error("Kavenegar response did not contain a message id");
    return { provider: "kavenegar", messageId: String(messageId) };
  }
}

export type PaymentRequest = {
  amountRials: number;
  callbackUrl: string;
  description: string;
  mobile?: string;
  orderId: string;
};
export type PaymentSession = { provider: string; authority: string; redirectUrl: string };
export type PaymentVerification = { verified: boolean; referenceId?: string; cardPan?: string };

export interface PaymentProvider {
  create(request: PaymentRequest): Promise<PaymentSession>;
  verify(authority: string, amountRials: number): Promise<PaymentVerification>;
}

export class MockPaymentProvider implements PaymentProvider {
  async create(request: PaymentRequest): Promise<PaymentSession> {
    const authority = `mock-${request.orderId}`;
    return { provider: "mock", authority, redirectUrl: `${request.callbackUrl}?Authority=${authority}&Status=OK` };
  }
  async verify(authority: string): Promise<PaymentVerification> {
    return { verified: authority.startsWith("mock-"), referenceId: authority };
  }
}

export class ZarinpalPaymentProvider implements PaymentProvider {
  private readonly apiBase = "https://payment.zarinpal.com/pg/v4/payment";
  constructor(private readonly merchantId: string) {
    if (!merchantId) throw new Error("ZARINPAL_MERCHANT_ID is required");
  }

  async create(request: PaymentRequest): Promise<PaymentSession> {
    const response = await fetch(`${this.apiBase}/request.json`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: request.amountRials,
        callback_url: request.callbackUrl,
        description: request.description,
        metadata: { mobile: request.mobile, order_id: request.orderId },
      }),
    });
    const payload = await response.json() as { data?: { code?: number; authority?: string }; errors?: unknown };
    if (!response.ok || payload.data?.code !== 100 || !payload.data.authority) throw new Error("ZarinPal payment request failed");
    return {
      provider: "zarinpal",
      authority: payload.data.authority,
      redirectUrl: `https://payment.zarinpal.com/pg/StartPay/${payload.data.authority}`,
    };
  }

  async verify(authority: string, amountRials: number): Promise<PaymentVerification> {
    const response = await fetch(`${this.apiBase}/verify.json`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ merchant_id: this.merchantId, amount: amountRials, authority }),
    });
    const payload = await response.json() as { data?: { code?: number; ref_id?: number; card_pan?: string } };
    const verified = response.ok && (payload.data?.code === 100 || payload.data?.code === 101);
    return { verified, referenceId: payload.data?.ref_id ? String(payload.data.ref_id) : undefined, cardPan: payload.data?.card_pan };
  }
}

export function createSmsProvider(environment = process.env): SmsProvider {
  return environment.SMS_PROVIDER === "kavenegar"
    ? new KavenegarSmsProvider(environment.KAVENEGAR_API_KEY ?? "", environment.KAVENEGAR_SENDER)
    : new ConsoleSmsProvider();
}

export function createPaymentProvider(environment = process.env): PaymentProvider {
  return environment.PAYMENT_PROVIDER === "zarinpal"
    ? new ZarinpalPaymentProvider(environment.ZARINPAL_MERCHANT_ID ?? "")
    : new MockPaymentProvider();
}
