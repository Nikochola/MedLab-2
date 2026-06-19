-- Atomic, race-free XP awarding.
--
-- Previously the award-xp route did read-modify-write across student_activities
-- and student_progress in JS. Two concurrent requests could both pass the daily
-- cap / per-case dedup checks and double-award. This function performs the
-- dedup check, daily-cap check, activity insert, and XP/counter increment in a
-- single transaction, serialized per-student with a transaction-level advisory
-- lock so a burst can't slip past the ceiling.
--
-- Returns the awarded amount (0 if blocked), the reason, and the new totals.

CREATE OR REPLACE FUNCTION public.award_student_xp(
  p_student_id   uuid,
  p_action       text,
  p_amount       integer,
  p_reason       text,
  p_data         jsonb,
  p_case_id      text,
  p_daily_cap    integer,
  p_delta_case   integer,
  p_delta_sim    integer
)
RETURNS TABLE (
  awarded      integer,
  reason       text,
  total_xp     integer,
  current_level integer,
  leveled_up   boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_today_start timestamptz := date_trunc('day', now());
  v_today_count integer;
  v_dup_count   integer;
  v_old_xp      integer;
  v_old_level   integer;
  v_new_xp      integer;
  v_new_level   integer;
BEGIN
  -- Serialize concurrent awards for this student (released at txn end).
  PERFORM pg_advisory_xact_lock(hashtextextended(p_student_id::text, 0));

  -- 1. Per-case idempotency (same case pays out once per day).
  IF p_case_id IS NOT NULL AND length(p_case_id) > 0 THEN
    SELECT count(*) INTO v_dup_count
    FROM student_activities
    WHERE student_id = p_student_id
      AND activity_type = 'case_submit'
      AND data->>'caseId' = p_case_id
      AND "timestamp" >= v_today_start;

    IF v_dup_count > 0 THEN
      RETURN QUERY SELECT 0, 'Already earned for this case today',
        COALESCE((SELECT sp.total_xp FROM student_progress sp WHERE sp.student_id = p_student_id), 0),
        COALESCE((SELECT sp.current_level FROM student_progress sp WHERE sp.student_id = p_student_id), 1),
        false;
      RETURN;
    END IF;
  END IF;

  -- 2. Daily per-action ceiling.
  IF p_daily_cap IS NOT NULL THEN
    SELECT count(*) INTO v_today_count
    FROM student_activities
    WHERE student_id = p_student_id
      AND activity_type = p_action
      AND "timestamp" >= v_today_start;

    IF v_today_count >= p_daily_cap THEN
      RETURN QUERY SELECT 0, 'Daily limit reached for this action',
        COALESCE((SELECT sp.total_xp FROM student_progress sp WHERE sp.student_id = p_student_id), 0),
        COALESCE((SELECT sp.current_level FROM student_progress sp WHERE sp.student_id = p_student_id), 1),
        false;
      RETURN;
    END IF;
  END IF;

  -- 3. Log the activity.
  INSERT INTO student_activities (student_id, activity_type, data, xp_awarded, xp_reason)
  VALUES (p_student_id, p_action, COALESCE(p_data, '{}'::jsonb), p_amount, p_reason);

  -- 4. Increment progress (level = floor(sqrt(xp/100)) + 1).
  SELECT sp.total_xp, sp.current_level INTO v_old_xp, v_old_level
  FROM student_progress sp WHERE sp.student_id = p_student_id;

  v_old_xp    := COALESCE(v_old_xp, 0);
  v_old_level := COALESCE(v_old_level, 1);
  v_new_xp    := v_old_xp + p_amount;
  v_new_level := floor(sqrt(v_new_xp::numeric / 100))::integer + 1;

  INSERT INTO student_progress (
    student_id, total_xp, current_level, last_activity,
    cases_completed, simulations_completed
  )
  VALUES (
    p_student_id, v_new_xp, v_new_level, now(),
    COALESCE(p_delta_case, 0), COALESCE(p_delta_sim, 0)
  )
  ON CONFLICT (student_id) DO UPDATE SET
    total_xp = v_new_xp,
    current_level = v_new_level,
    last_activity = now(),
    cases_completed = COALESCE(student_progress.cases_completed, 0) + COALESCE(p_delta_case, 0),
    simulations_completed = COALESCE(student_progress.simulations_completed, 0) + COALESCE(p_delta_sim, 0);

  RETURN QUERY SELECT p_amount, p_reason, v_new_xp, v_new_level, (v_new_level > v_old_level);
END;
$$;
