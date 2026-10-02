import type { ApplyResult, BillingEvent, EntitlementState, Plan } from "./model";

export interface Policy {
  graceSeconds: number;
  maxProcessedEvents: number;
}

export const DEFAULT_POLICY: Policy = { graceSeconds: 72 * 60 * 60, maxProcessedEvents: 100 };

export function emptyState(customerId: string): EntitlementState {
  return {
    customerId,
    subscriptionId: null,
    planKey: null,
    features: [],
    access: "revoked",
    accessUntil: null,
    sourceEventId: null,
    sourceCreatedAt: 0,
    processedEventIds: []
  };
}

export function applyBillingEvent(
  current: EntitlementState,
  event: BillingEvent,
  plans: readonly Plan[],
  policy: Policy = DEFAULT_POLICY
): ApplyResult {
  if (event.customerId !== current.customerId) throw new Error("customer mismatch");
  if (current.processedEventIds.includes(event.id)) return { state: current, outcome: "duplicate" };
  const processedEventIds = [...current.processedEventIds, event.id].slice(-policy.maxProcessedEvents);
  if (event.createdAt < current.sourceCreatedAt) {
    return { state: { ...current, processedEventIds }, outcome: "stale" };
  }

  const plan = plans.find((candidate) => candidate.priceId === event.priceId);
  const active = event.status === "active" || event.status === "trialing";
  const grace = event.status === "past_due";
  const access = plan && active ? "active" : plan && grace ? "grace" : "revoked";
  const graceUntil = grace ? event.createdAt + policy.graceSeconds : null;
  const accessUntil = access === "active" ? event.validUntil : access === "grace"
    ? event.validUntil === null ? graceUntil : Math.min(event.validUntil, graceUntil ?? event.validUntil)
    : null;

  return {
    outcome: "applied",
    state: {
      customerId: current.customerId,
      subscriptionId: event.subscriptionId,
      planKey: access === "revoked" ? null : plan?.key ?? null,
      features: access === "revoked" ? [] : plan?.features ?? [],
      access,
      accessUntil,
      sourceEventId: event.id,
      sourceCreatedAt: event.createdAt,
      processedEventIds
    }
  };
}

export function hasFeature(state: EntitlementState, feature: string, nowSeconds: number): boolean {
  if (state.access === "revoked") return false;
  if (state.accessUntil !== null && nowSeconds >= state.accessUntil) return false;
  return state.features.includes(feature);
}
