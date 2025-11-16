-- RLS policies for `profiles` table. Run in Supabase SQL editor.

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Profiles: owner select"
  ON public.profiles FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to insert a profile only when the row's user_id equals auth.uid()
CREATE POLICY "Profiles: owner insert"
  ON public.profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own profile
CREATE POLICY "Profiles: owner update"
  ON public.profiles FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Allow users to delete their own profile
CREATE POLICY "Profiles: owner delete"
  ON public.profiles FOR DELETE
  USING (user_id = auth.uid());

-- Notes:
-- - These policies assume the table uses `user_id` as the UUID foreign key to auth.users.
-- - If you use `id` instead, change `user_id` to `id` in the policies.
-- - After creating policies, test with a signed-in user to ensure inserts/updates succeed.
