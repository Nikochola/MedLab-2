-- Harden Supabase Auth profile provisioning.
--
-- OAuth signup fails with "Database error saving new user" whenever an
-- auth.users insert trigger raises. This function must be best-effort only:
-- profile creation problems should be logged, not block account creation.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
    profile_role public.user_primary_role := 'student';
    full_name_val TEXT;
BEGIN
    BEGIN
        profile_role := COALESCE(
            NULLIF(NEW.raw_user_meta_data->>'primary_role', '')::public.user_primary_role,
            'student'::public.user_primary_role
        );
    EXCEPTION WHEN OTHERS THEN
        profile_role := 'student'::public.user_primary_role;
    END;

    full_name_val := COALESCE(
        NULLIF(NEW.raw_user_meta_data->>'full_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'name', ''),
        NULLIF(NEW.raw_user_meta_data->>'display_name', ''),
        NULLIF(NEW.raw_user_meta_data->>'preferred_username', ''),
        split_part(NEW.email, '@', 1),
        'MedLab User'
    );

    BEGIN
        INSERT INTO public.profiles (id, email, full_name, primary_role)
        VALUES (NEW.id, lower(NEW.email), full_name_val, profile_role)
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
            primary_role = COALESCE(public.profiles.primary_role, EXCLUDED.primary_role);
    EXCEPTION WHEN unique_violation THEN
        -- A legacy profile can already own this email under a different id.
        -- Let auth creation complete; the app's server-side session provisioning
        -- can reconcile/backfill the profile after the OAuth session exists.
        RAISE WARNING 'handle_new_user skipped profile insert for %, duplicate email %', NEW.id, NEW.email;
    WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user profile provisioning failed for %: %', NEW.id, SQLERRM;
    END;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
