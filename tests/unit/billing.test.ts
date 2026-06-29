import { describe, expect, it, vi } from "vitest";
import { isBillingMockMode, stripePriceEnv } from "@/lib/stripe";

describe("billing", () => {
  it("uses mock mode without stripe key", () => {
    vi.stubEnv("BILLING_MOCK_MODE", "true");
    vi.stubEnv("STRIPE_SECRET_KEY", "");
    expect(isBillingMockMode()).toBe(true);
  });

  it("maps price env keys", () => {
    vi.stubEnv("STRIPE_PRICE_STANDARD_MONTHLY", "price_standard_monthly");
    expect(stripePriceEnv("STANDARD", "month")).toBe("price_standard_monthly");
  });
});
