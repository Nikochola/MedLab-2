-- Migration: Subscription & Usage Gating
-- Date: 2026-01-01
-- Description: Adds tables for billing integration and feature gating tracking.

-- 1. Create subscriptions table (new installs)
CREATE TABLE IF NOT EXISTS subscriptions (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    polar_customer_id TEXT,
    polar_subscription_id TEXT,
    plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
    status TEXT DEFAULT 'inactive',
    current_period_end TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1b. Normalize existing subscriptions table (legacy installs)
ALTER TABLE subscriptions
    ADD COLUMN IF NOT EXISTS polar_customer_id TEXT,
    ADD COLUMN IF NOT EXISTS polar_subscription_id TEXT,
    ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Keep plan/status defaults aligned without forcing destructive shape changes.
ALTER TABLE subscriptions
    ALTER COLUMN plan SET DEFAULT 'free',
    ALTER COLUMN status SET DEFAULT 'inactive',
    ALTER COLUMN updated_at SET DEFAULT NOW();

UPDATE subscriptions
SET
    plan = COALESCE(plan, 'free'),
    status = COALESCE(status, 'inactive'),
    updated_at = COALESCE(updated_at, created_at, NOW())
WHERE
    plan IS NULL
    OR status IS NULL
    OR updated_at IS NULL;

-- 2. Create usage_limits table for tracking free quotas
CREATE TABLE IF NOT EXISTS usage_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    feature TEXT NOT NULL,
    usage_count INTEGER DEFAULT 0,
    last_reset_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, feature)
);

-- 3. Enable RLS
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_limits ENABLE ROW LEVEL SECURITY;

-- 4. Policies
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'subscriptions'
          AND policyname = 'Users can view own subscription'
    ) THEN
        CREATE POLICY "Users can view own subscription" ON subscriptions
            FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'usage_limits'
          AND policyname = 'Users can view own usage limits'
    ) THEN
        CREATE POLICY "Users can view own usage limits" ON usage_limits
            FOR SELECT TO authenticated USING (auth.uid() = user_id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'subscriptions'
          AND policyname = 'Service role can manage subscriptions'
    ) THEN
        CREATE POLICY "Service role can manage subscriptions" ON subscriptions
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'usage_limits'
          AND policyname = 'Service role can manage usage_limits'
    ) THEN
        CREATE POLICY "Service role can manage usage_limits" ON usage_limits
            FOR ALL TO service_role USING (true) WITH CHECK (true);
    END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_subscriptions_customer ON subscriptions(polar_customer_id);
CREATE INDEX IF NOT EXISTS idx_usage_limits_user_feature ON usage_limits(user_id, feature);

-- 5. RPC for atomic usage increment
CREATE OR REPLACE FUNCTION increment_usage(x_user_id UUID, x_feature TEXT)
RETURNS void AS $$
BEGIN
    INSERT INTO usage_limits (user_id, feature, usage_count, last_reset_at)
    VALUES (x_user_id, x_feature, 1, NOW())
    ON CONFLICT (user_id, feature)
    DO UPDATE SET
        last_reset_at = CASE
            WHEN date(usage_limits.last_reset_at) < date(NOW()) THEN NOW()
            ELSE usage_limits.last_reset_at
        END,
        usage_count = CASE
            WHEN date(usage_limits.last_reset_at) < date(NOW()) THEN 1
            ELSE usage_limits.usage_count + 1
        END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
