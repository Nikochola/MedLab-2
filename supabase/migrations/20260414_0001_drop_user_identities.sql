-- Migration: Drop user_identities table
-- Date: 2026-04-13
--
-- user_identities was created to reconcile legacy user IDs with Better Auth
-- canonical IDs. The table is empty — no ID conflicts ever occurred. The
-- getMembershipLookupUserIds function in session.ts has been simplified to
-- return [canonicalUserId] directly.

DROP TABLE IF EXISTS public.user_identities;
