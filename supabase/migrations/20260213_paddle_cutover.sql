-- Migration: Paddle Sandbox Cutover for student app
-- Date: 2026-02-13
-- Description: Adds Paddle billing fields, normalizes subscription status values,
-- and enforces indexes used by webhook upserts.

ALTER TABLE IF EXISTS subscriptions
  ADD COLUMN IF NOT EXISTS provider TEXT DEFAULT 'paddle',
  ADD COLUMN IF NOT EXISTS paddle_customer_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_subscription_id TEXT,
  ADD COLUMN IF NOT EXISTS paddle_price_id TEXT,
  ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE IF EXISTS subscriptions
  ALTER COLUMN plan SET DEFAULT 'free',
  ALTER COLUMN status SET DEFAULT 'inactive',
  ALTER COLUMN updated_at SET DEFAULT NOW();

UPDATE subscriptions
SET
  plan = COALESCE(plan, 'free'),
  provider = COALESCE(provider, 'paddle'),
  updated_at = COALESCE(updated_at, created_at, NOW())
WHERE
  plan IS NULL
  OR provider IS NULL
  OR updated_at IS NULL;

UPDATE subscriptions
SET status = 'active'
WHERE status = 'lifetime';

UPDATE subscriptions
SET status = 'inactive'
WHERE status IS NULL
  OR status NOT IN ('inactive', 'trialing', 'active', 'past_due', 'paused', 'canceled');

ALTER TABLE IF EXISTS subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_status_check;

ALTER TABLE IF EXISTS subscriptions
  ADD CONSTRAINT subscriptions_status_check
  CHECK (status IN ('inactive', 'trialing', 'active', 'past_due', 'paused', 'canceled'));

-- Ensure 1 subscription row per user for deterministic webhook upserts.
WITH ranked AS (
  SELECT
    ctid,
    user_id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id
      ORDER BY updated_at DESC NULLS LAST, created_at DESC NULLS LAST, ctid DESC
    ) AS row_num
  FROM subscriptions
  WHERE user_id IS NOT NULL
)
DELETE FROM subscriptions s
USING ranked r
WHERE s.ctid = r.ctid
  AND r.row_num > 1;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_user_id_unique
  ON subscriptions(user_id)
  WHERE user_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_subscriptions_paddle_subscription_id_unique
  ON subscriptions(paddle_subscription_id)
  WHERE paddle_subscription_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_paddle_customer_id
  ON subscriptions(paddle_customer_id);
