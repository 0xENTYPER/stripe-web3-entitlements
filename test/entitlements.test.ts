import { describe, expect, it } from "vitest";
import { applyBillingEvent, emptyState, hasFeature, signStripePayload, verifyStripeSignature, type BillingEvent, type Plan } from "../src/index";

const plans: Plan[] = [{ priceId: "price_pro", key: "pro", features: ["alerts", "export"] }];
const event = (patch: Partial<BillingEvent> = {}): BillingEvent => ({
  id: "evt_1",
  createdAt: 1_800_000_000,
  customerId: "cus_1",
  subscriptionId: "sub_1",
  priceId: "price_pro",
  status: "active",
  validUntil: 1_802_592_000,
  ...patch
});

describe("entitlement reducer", () => {
  it("grants mapped active plans", () => {
    const result = applyBillingEvent(emptyState("cus_1"), event(), plans);
    expect(result.state.access).toBe("active");
    expect(hasFeature(result.state, "export", 1_800_000_001)).toBe(true);
  });

  it("is idempotent by event ID", () => {
    const first = applyBillingEvent(emptyState("cus_1"), event(), plans);
    const second = applyBillingEvent(first.state, event(), plans);
    expect(second.outcome).toBe("duplicate");
    expect(second.state).toEqual(first.state);
  });

  it("does not let an older delivery overwrite newer state", () => {
    const canceled = applyBillingEvent(emptyState("cus_1"), event({ id: "evt_2", createdAt: 20, status: "canceled" }), plans);
    const older = applyBillingEvent(canceled.state, event({ id: "evt_1", createdAt: 10, status: "active" }), plans);
    expect(older.outcome).toBe("stale");
    expect(older.state.access).toBe("revoked");
  });

  it("provides a bounded grace period for past due", () => {
    const result = applyBillingEvent(emptyState("cus_1"), event({ status: "past_due", validUntil: null }), plans);
    expect(result.state.access).toBe("grace");
    expect(result.state.accessUntil).toBe(1_800_259_200);
  });

  it("revokes unknown price IDs", () => {
    const result = applyBillingEvent(emptyState("cus_1"), event({ priceId: "price_unknown" }), plans);
    expect(result.state.access).toBe("revoked");
    expect(result.state.features).toEqual([]);
  });

  it("expires feature checks at accessUntil", () => {
    const result = applyBillingEvent(emptyState("cus_1"), event(), plans);
    expect(hasFeature(result.state, "export", 1_802_592_000)).toBe(false);
  });

  it("rejects events for another customer", () => {
    expect(() => applyBillingEvent(emptyState("cus_other"), event(), plans)).toThrow("customer mismatch");
  });
});

describe("Stripe signature verification", () => {
  it("accepts a valid v1 signature", async () => {
    const body = '{"id":"evt_1"}';
    const signature = await signStripePayload(1000, body, "whsec_demo");
    await expect(verifyStripeSignature(body, `t=1000,v1=${signature}`, "whsec_demo", 1000)).resolves.toBeUndefined();
  });

  it("accepts any matching v1 during secret rotation", async () => {
    const signature = await signStripePayload(1000, "{}", "whsec_demo");
    await expect(verifyStripeSignature("{}", `t=1000,v1=bad,v1=${signature}`, "whsec_demo", 1000)).resolves.toBeUndefined();
  });

  it("rejects invalid and replayed signatures", async () => {
    await expect(verifyStripeSignature("{}", "t=1000,v1=bad", "whsec_demo", 1000)).rejects.toThrow("Invalid");
    const signature = await signStripePayload(1000, "{}", "whsec_demo");
    await expect(verifyStripeSignature("{}", `t=1000,v1=${signature}`, "whsec_demo", 1400)).rejects.toThrow("tolerance");
  });
});
