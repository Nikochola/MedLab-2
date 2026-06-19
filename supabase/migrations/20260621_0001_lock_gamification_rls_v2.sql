-- Corrective follow-up to 20260619_0001.
--
-- That migration dropped the gamification write policies by the names in
-- supabase_schema.sql ("Allow anon upsert progress", etc.). But the policies
-- actually deployed were created out-of-band under different names, so the
-- DROPs were no-ops and the holes stayed open:
--
--   student_activities.activities_insert  -> WITH CHECK (true)        [fully open]
--   student_progress.progress_insert      -> auth.uid() = student_id  [self-write]
--   student_progress.progress_update      -> auth.uid() = student_id  [self-write]
--
-- The first lets anyone insert arbitrary activity rows (any student_id /
-- xp_awarded); the others let a student set their own total_xp / level directly
-- from the browser. All legitimate writes go through the award-xp route using
-- the service_role key (which bypasses RLS), so we remove client write access
-- entirely. Reads (progress_select / activities_select / "Allow anon read ...")
-- stay for leaderboards/stats.

DROP POLICY IF EXISTS "progress_insert" ON public.student_progress;
DROP POLICY IF EXISTS "progress_update" ON public.student_progress;
DROP POLICY IF EXISTS "progress_delete" ON public.student_progress;

DROP POLICY IF EXISTS "activities_insert" ON public.student_activities;
DROP POLICY IF EXISTS "activities_update" ON public.student_activities;
DROP POLICY IF EXISTS "activities_delete" ON public.student_activities;
