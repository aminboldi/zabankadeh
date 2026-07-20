import { describe, expect, it } from "vitest";
import { createPaymentProvider, createSmsProvider, MockPaymentProvider } from "../src/integrations/providers";

describe("integration provider factories", () => {
  it("uses safe local providers by default", async () => {
    expect(createSmsProvider({})).toBeDefined();
    const payment = createPaymentProvider({});
    expect(payment).toBeInstanceOf(MockPaymentProvider);
    const session = await payment.create({ amountRials: 1_000_000, callbackUrl: "https://example.test/callback", description: "test", orderId: "INV-1" });
    expect(session.redirectUrl).toContain("Status=OK");
    expect((await payment.verify(session.authority, 1_000_000)).verified).toBe(true);
  });
});
