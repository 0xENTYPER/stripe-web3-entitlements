export type SubscriptionStatus = "trialing" | "active" | "past_due" | "paused" | "canceled" | "unpaid" | "incomplete";
export type AccessState = "active" | "grace" | "revoked";

export interface BillingEvent {
  id: string;
  createdAt: number;
  customerId: string;
  subscriptionId: string;
  priceId: string;
  status: SubscriptionStatus;
  validUntil: number | null;
}

export interface Plan {
  priceId: string;
  key: string;
  features: string[];
}

export interface EntitlementState {
  customerId: string;
  subscriptionId: string | null;
  planKey: string | null;
  features: string[];
  access: AccessState;
  accessUntil: number | null;
  sourceEventId: string | null;
  sourceCreatedAt: number;
  processedEventIds: string[];
}

export interface ApplyResult {
  state: EntitlementState;
  outcome: "applied" | "duplicate" | "stale";
}
