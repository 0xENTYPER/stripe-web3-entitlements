CREATE TABLE stripe_events (
  event_id TEXT PRIMARY KEY,
  created_at INTEGER NOT NULL,
  received_at INTEGER NOT NULL
);

CREATE TABLE customer_wallets (
  customer_id TEXT PRIMARY KEY,
  wallet_address TEXT NOT NULL UNIQUE,
  verified_at INTEGER NOT NULL
);

CREATE TABLE entitlements (
  customer_id TEXT PRIMARY KEY,
  subscription_id TEXT,
  plan_key TEXT,
  access_state TEXT NOT NULL CHECK (access_state IN ('active', 'grace', 'revoked')),
  access_until INTEGER,
  source_event_id TEXT,
  source_created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
