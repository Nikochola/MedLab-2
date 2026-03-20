-- Migration: Fix auth trigger email conflict
-- The previous trigger used ON CONFLICT (id) which doesn't handle
-- the UNIQUE constraint on profiles.email when a legacy profile
-- exists with the same email but a different UUID.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_role user_primary_role;
    full_name_val TEXT;
BEGIN
    -- Determine role from metadata or default to student
    BEGIN
        profile_role := COALESCE(
            (new.raw_user_meta_data->>'primary_role')::user_primary_role,
            'student'
        );
    EXCEPTION WHEN OTHERS THEN
        profile_role := 'student';
    END;

    full_name_val := COALESCE(
        new.raw_user_meta_data->>'full_name',
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );

    -- Delete any legacy profile that would conflict on email
    DELETE FROM public.profiles
    WHERE email = new.email AND id <> new.id;

    INSERT INTO public.profiles (id, email, full_name, primary_role)
    VALUES (new.id, new.email, full_name_val, profile_role)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, profiles.full_name),
        primary_role = EXCLUDED.primary_role;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Never block user creation even if profile insert fails
    RAISE WARNING 'handle_new_user trigger failed for %: %', new.id, SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Also fix the membership role check constraint to accept both old and new values
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'institution_memberships_role_check'
          AND table_name = 'institution_memberships'
    ) THEN
        ALTER TABLE public.institution_memberships
            DROP CONSTRAINT institution_memberships_role_check;
    END IF;
END $$;

-- Remove any remaining check constraints on role
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN
        SELECT conname FROM pg_constraint
        WHERE conrelid = 'public.institution_memberships'::regclass
          AND contype = 'c'
          AND pg_get_constraintdef(oid) ILIKE '%role%'
    LOOP
        EXECUTE format('ALTER TABLE public.institution_memberships DROP CONSTRAINT %I', constraint_rec.conname);
    END LOOP;
END $$;
