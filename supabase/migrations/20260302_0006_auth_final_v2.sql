-- Migration: Complete Authentication & Onboarding System
-- Includes Profiles, Institutions, Cohorts, and Invitation system

-- 1. Enums and Extensions
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_primary_role') THEN
        CREATE TYPE user_primary_role AS ENUM ('student', 'institution');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'membership_role') THEN
        CREATE TYPE membership_role AS ENUM ('admin', 'teacher');
    END IF;
END $$;

-- 2. Profiles (Adapting existing users table)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users' AND table_schema = 'public') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles' AND table_schema = 'public') THEN
        ALTER TABLE public.users RENAME TO profiles;
    END IF;
END $$;

-- Create table if neither exists (fallback)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    name TEXT,
    primary_role user_primary_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS primary_role user_primary_role NOT NULL DEFAULT 'student';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name TEXT;

-- Sync full_name
UPDATE public.profiles SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- 3. Institutions
ALTER TABLE public.institutions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

-- 4. Institution Memberships
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'institution_memberships_role_check' AND table_name = 'institution_memberships') THEN
        ALTER TABLE public.institution_memberships DROP CONSTRAINT institution_memberships_role_check;
    END IF;
END $$;

ALTER TABLE public.institution_memberships ALTER COLUMN role TYPE TEXT;

UPDATE public.institution_memberships SET role = 'admin' WHERE role = 'INSTITUTION_ADMIN';
UPDATE public.institution_memberships SET role = 'teacher' WHERE role = 'EDUCATOR';

-- 5. Cohorts (Renaming/Adapting courses)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses' AND table_schema = 'public') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cohorts' AND table_schema = 'public') THEN
        ALTER TABLE public.courses RENAME TO cohorts;
    END IF;
END $$;

-- Re-verify columns for cohorts (handling partial rename issues)
ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS institution_id UUID REFERENCES public.institutions(id);
ALTER TABLE public.cohorts ADD COLUMN IF NOT EXISTS name TEXT;

-- 6. Cohort Members (Renaming/Adapting course_memberships)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'course_memberships' AND table_schema = 'public') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cohort_members' AND table_schema = 'public') THEN
        ALTER TABLE public.course_memberships RENAME TO cohort_members;
    END IF;
END $$;

-- Re-verify columns for cohort_members
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohort_members' AND column_name = 'course_id') THEN
        ALTER TABLE public.cohort_members RENAME COLUMN course_id TO cohort_id;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'cohort_members' AND column_name = 'user_id') THEN
        ALTER TABLE public.cohort_members RENAME COLUMN user_id TO student_user_id;
    END IF;
END $$;

-- 7. Student Invites
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.invites ADD COLUMN IF NOT EXISTS cohort_id UUID REFERENCES public.cohorts(id);
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invites' AND column_name = 'created_by_user_id') THEN
        ALTER TABLE public.invites RENAME COLUMN created_by_user_id TO created_by;
    END IF;
END $$;

-- 8. RLS Policies (Safe re-application)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohorts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cohort_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Members can view their institution" ON public.institutions;
DROP POLICY IF EXISTS "Members can view cohorts in their institution" ON public.cohorts;
DROP POLICY IF EXISTS "Students can view their own cohort memberships" ON public.cohort_members;
DROP POLICY IF EXISTS "Teachers can view cohort memberships in their institution" ON public.cohort_members;
DROP POLICY IF EXISTS "Institutions can view their invites" ON public.invites;
DROP POLICY IF EXISTS "Institution admins/teachers can create invites" ON public.invites;

-- Profiles Policies
CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Institutions Policies
CREATE POLICY "Members can view their institution" ON public.institutions
FOR SELECT USING (EXISTS (SELECT 1 FROM public.institution_memberships WHERE institution_id = id AND user_id = auth.uid()));

-- Cohorts Policies
CREATE POLICY "Members can view cohorts in their institution" ON public.cohorts
FOR SELECT USING (EXISTS (SELECT 1 FROM public.institution_memberships WHERE institution_id = cohorts.institution_id AND user_id = auth.uid()));

-- Cohort Members Policies
CREATE POLICY "Students can view their own cohort memberships" ON public.cohort_members
FOR SELECT USING (student_user_id = auth.uid());

CREATE POLICY "Teachers can view cohort memberships in their institution" ON public.cohort_members
FOR SELECT USING (EXISTS (SELECT 1 FROM public.cohorts c JOIN public.institution_memberships im ON im.institution_id = c.institution_id WHERE c.id = cohort_members.cohort_id AND im.user_id = auth.uid()));

-- Invites Policies
CREATE POLICY "Institutions can view their invites" ON public.invites
FOR SELECT USING (EXISTS (SELECT 1 FROM public.institution_memberships WHERE institution_id = invites.institution_id AND user_id = auth.uid()));

CREATE POLICY "Institution admins/teachers can create invites" ON public.invites
FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.institution_memberships im WHERE im.institution_id = invites.institution_id AND im.user_id = auth.uid() AND im.role IN ('admin', 'teacher')));
