-- Lock down gamification RLS.
--
-- The original schema shipped with wide-open policies
-- (`USING (true) WITH CHECK (true)`) that let the anon/authenticated key INSERT
-- and UPDATE student_progress and student_activities directly from the browser.
-- That let any signed-in student set their own total_xp / level / streak, or
-- insert fabricated activity rows — bypassing the award-xp API and its
-- anti-farm caps entirely.
--
-- All legitimate writes go through the award-xp route using the service_role
-- key, which bypasses RLS. So we drop client write access here; reads stay open
-- (XP totals power leaderboards/stats and are not sensitive).

-- ── student_progress ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow anon upsert progress" ON public.student_progress;
DROP POLICY IF EXISTS "Allow anon update progress" ON public.student_progress;
-- read stays: "Allow anon read progress"

-- ── student_activities ──────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Allow anon insert activities" ON public.student_activities;
-- read stays: "Allow anon read activities"

-- ── case_assessments ────────────────────────────────────────────────────────
-- Saved case reports are the student's own work product. Scope inserts to the
-- authenticated owner instead of allowing anonymous inserts for anyone.
DROP POLICY IF EXISTS "Allow anon insert assessments" ON public.case_assessments;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'case_assessments'
      AND policyname = 'Students insert own assessments'
  ) THEN
    CREATE POLICY "Students insert own assessments" ON public.case_assessments
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = student_id);
  END IF;
END $$;
