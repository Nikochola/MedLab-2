-- Migration: Cleanup legacy schema and fix dangling FK references
-- Date: 2026-04-13
--
-- Context:
--   The original supabase_schema.sql created classrooms, case_assessments,
--   student_progress, and student_activities. Later migrations moved classrooms
--   to the _legacy schema, leaving dangling FK constraints in the three tables
--   above. This migration:
--     1. Explicitly drops those broken FK constraints (safe — DROP SCHEMA CASCADE
--        would do it anyway, but being explicit is cleaner)
--     2. Adds course_id to case_assessments so institution educators can filter
--        submissions by course going forward
--     3. Drops the _legacy schema — all data was migrated to institutions /
--        courses / profiles in migrations 20260226 and 20260317

-- ── 1. Drop broken FK constraints pointing to _legacy.classrooms ─────────────

ALTER TABLE IF EXISTS public.case_assessments
  DROP CONSTRAINT IF EXISTS case_assessments_classroom_id_fkey;

ALTER TABLE IF EXISTS public.student_progress
  DROP CONSTRAINT IF EXISTS student_progress_classroom_id_fkey;

ALTER TABLE IF EXISTS public.student_activities
  DROP CONSTRAINT IF EXISTS student_activities_classroom_id_fkey;

-- ── 2. Add course_id to case_assessments for institution linkage ─────────────
-- Nullable — existing rows have no course association.
-- New submissions can be linked to a course via the institution UI.

ALTER TABLE IF EXISTS public.case_assessments
  ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_case_assessments_course_id
  ON public.case_assessments(course_id);

CREATE INDEX IF NOT EXISTS idx_case_assessments_student_id
  ON public.case_assessments(student_id);

-- ── 3. Drop _legacy schema ───────────────────────────────────────────────────
-- Tables in _legacy and their migration lineage:
--   _legacy.organizations    → public.institutions      (20260226)
--   _legacy.org_members      → public.institution_memberships (20260226)
--   _legacy.cohorts          → public.courses           (20260226)
--   _legacy.cohort_members   → public.course_memberships (20260226)
--   _legacy.classrooms       → superseded by courses    (20260317)
--   _legacy.invites_legacy   → public.invites           (20260226)
-- CASCADE handles any remaining FK constraints from public tables into _legacy.

DROP SCHEMA IF EXISTS _legacy CASCADE;
