-- Migration: Robust Auth Trigger for Automatic Profiles
-- Ensures a profile is created or updated as soon as a user signs up via Supabase Auth

-- Function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    profile_role user_primary_role;
    full_name_val TEXT;
BEGIN
    -- Determine role from metadata or default to student
    -- Metadata keys can be different depending on the provider or manual signup data
    profile_role := COALESCE(
        (new.raw_user_meta_data->>'primary_role')::user_primary_role, 
        'student'
    );
    
    full_name_val := COALESCE(
        new.raw_user_meta_data->>'full_name', 
        new.raw_user_meta_data->>'name',
        split_part(new.email, '@', 1)
    );

    INSERT INTO public.profiles (id, email, full_name, primary_role)
    VALUES (new.id, new.email, full_name_val, profile_role)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        primary_role = COALESCE(profiles.primary_role, EXCLUDED.primary_role);
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to execute on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
