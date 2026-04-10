-- Migration: Dodo Payments student billing integration
-- Date: 2026-04-07
-- Description: Adds Dodo billing fields and webhook idempotency storage for student subscriptions.

ALTER TABLE IF EXISTS subscriptions
  ADD COLUMN IF NOT EXISTS dodo_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS dodo_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS dodo_product_id TEXT,
  ADD COLUMN IF NOT EXISTS billing_interval TEXT,
  ADD COLUMN IF NOT EXISTS provider_status TEXT;

ALTER TABLE IF EXISTS subscriptions
  ALTER COLUMN plan SET DEFAULT 'free',
  ALTER COLUMN status SET DEFAULT 'inactive',
  ALTER COLUMN updated_at SET DEFAULT NOW();

ALTER TABLE IF EXISTS subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE IF EXISTS subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('inactive', 'trialing', 'active', 'past_due', 'paused', 'canceled'));

ALTER TABLE IF EXISTS subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_billing_interval_check;

ALTER TABLE IF EXISTS subscriptions
  ADD CONSTRAINT subscriptions_billing_interval_check
  CHECK (billing_interval IS NULL OR billing_interval IN ('monthly', 'yearly'));

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_dodo_subscription_id_unique
  ON subscriptions(dodo_subscription_id)
  WHERE dodo_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_dodo_customer_id
  ON subscriptions(dodo_customer_id)
  WHERE dodo_customer_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS billing_webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  webhook_id TEXT NOT NULL,
  event_type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (provider, webhook_id)
);

ALTER TABLE billing_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'billing_webhook_events'
      AND policyname = 'Service role can manage billing_webhook_events'
  ) THEN
    CREATE POLICY "Service role can manage billing_webhook_events" ON billing_webhook_events
      FOR ALL TO service_role USING (true) WITH CHECK (true);
  END IF;
END $$;
