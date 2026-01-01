-- Migration: Gamification System (XP & Streaks)
-- Date: 2025-12-27
-- Description: Extends existing tables to support gamification features.

-- 1. Extend student_progress table
ALTER TABLE student_progress 
ADD COLUMN IF NOT EXISTS total_xp INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_level INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_activity_date DATE,
ADD COLUMN IF NOT EXISTS ecg_steps_correct INTEGER DEFAULT 0;

-- 2. Extend student_activities table
ALTER TABLE student_activities
ADD COLUMN IF NOT EXISTS xp_awarded INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS xp_reason TEXT;

-- 3. Create indexes for performance
-- Efficiently Query activities by date for streak calculation
CREATE INDEX IF NOT EXISTS idx_student_activities_date 
ON student_activities(student_id, date(timestamp));

-- Efficiently query leaderboard/stats (simulated)
CREATE INDEX IF NOT EXISTS idx_student_progress_xp 
ON student_progress(total_xp DESC);

-- 4. Update RLS Policies (Ensure students can read/update their own gamification stats)
-- Note: Existing policies in supabase_schema.sql are broadly permissive ("Allow anon update progress"). 
-- We will keep them as is for now, but ensure specifically that the new columns are covered.

-- Verify policy exists (idempotent check not standard SQL, relying on existing schema)
-- If we needed strictly tighter security, we would DROP and RECREATE polices here.
-- For now, we assume the existing policies cover the new columns.
