-- Cleanup legacy tables superseded by institution/course system.
-- Tables with data are moved to _legacy schema for reference.

CREATE SCHEMA IF NOT EXISTS _legacy;

-- Drop FK constraints referencing tables we're moving
ALTER TABLE IF EXISTS public.invites DROP CONSTRAINT IF EXISTS invites_cohort_id_fkey1;

-- Move legacy tables (with their data) to backup schema
ALTER TABLE IF EXISTS public.invites_legacy SET SCHEMA _legacy;
ALTER TABLE IF EXISTS public.cohort_members SET SCHEMA _legacy;
ALTER TABLE IF EXISTS public.cohorts SET SCHEMA _legacy;
ALTER TABLE IF EXISTS public.classrooms SET SCHEMA _legacy;
ALTER TABLE IF EXISTS public.org_members SET SCHEMA _legacy;
ALTER TABLE IF EXISTS public.organizations SET SCHEMA _legacy;
