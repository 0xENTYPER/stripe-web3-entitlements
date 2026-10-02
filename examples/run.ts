import { applyBillingEvent, emptyState, hasFeature, type BillingEvent, type Plan } from "../src/index";

const plans: Plan[] = [{ priceId: "price_creator", key: "creator", features: ["private-alerts", "export"] }];
const paid: BillingEvent = {
  id: "evt_paid",
  createdAt: 1_800_000_000,
  customerId: "cus_demo",
  subscriptionId: "sub_demo",
  priceId: "price_creator",
  status: "active",
  validUntil: 1_802_592_000
};
const result = applyBillingEvent(emptyState("cus_demo"), paid, plans);
console.log(JSON.stringify({ ...result, canExport: hasFeature(result.state, "export", paid.createdAt) }, null, 2));
