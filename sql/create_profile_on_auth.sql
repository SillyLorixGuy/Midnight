-- Create a trigger to automatically create a row in public.profiles when a new auth user is created.
-- Run this in Supabase SQL editor.

-- Function that runs when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert a basic profile row for the new user. Adjust fields as needed.
  INSERT INTO public.profiles (id, username, email, is_public, pfp_url, created_at)
  VALUES (NEW.id, NEW.raw_user_meta->>'username' , NEW.email, TRUE, NULL, now())
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- Create trigger on auth.users for insert
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_auth_user();

-- Notes:
-- - This function uses NEW.raw_user_meta->>'username' to read metadata set at signUp
--   (signUp with metadata: supabase.auth.signUp({ email, password }, { data: { username } }))
-- - If you prefer a different mapping (e.g. email -> username), edit the INSERT accordingly.
-- - The trigger requires the function to be SECURITY DEFINER and executed as a privileged role.
-- - After creating the trigger, newly-created auth users will automatically get a profiles row.
