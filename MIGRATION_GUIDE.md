# Supabase Migration Guide: Local → Hosted (for GitHub Pages)

This guide walks you through migrating your local Supabase database to a hosted Supabase project so your GitHub Pages site can connect to it.

---

## Step 1: Create a Hosted Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign in (or create an account)
2. Click **"New Project"**
3. Fill in:
   - **Organization**: Select or create one
   - **Project Name**: `Midnight` (or your preferred name)
   - **Database Password**: Choose a strong password (save it securely!)
   - **Region**: Choose closest to your users
4. Click **"Create new project"**
5. Wait 2-3 minutes for the project to provision

---

## Step 2: Get Your New Project Credentials

1. In your new Supabase project dashboard, go to **Settings** → **API**
2. Copy these values (you'll need them):
   - **Project URL** (e.g., `https://abcdefghij.supabase.co`)
   - **anon public** key (starts with `eyJ...`)

---

## Step 3: Export Local Database Schema & Data

### Option A: Using Supabase CLI (Recommended)

Run these commands in your project directory:

```powershell
# Make sure local Supabase is running
npx supabase start

# Generate migration files from your local database
npx supabase db diff --use-migra --schema public -f initial_schema

# This creates a new migration file in supabase/migrations/
```

### Option B: Manual SQL Export

1. Open your local Supabase Studio: http://localhost:54323
2. Go to **SQL Editor**
3. Run this to export your schema:
   ```sql
   -- Copy the output and save to a file
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```
4. For each table, export data:
   ```sql
   -- Example for profiles table
   SELECT * FROM profiles;
   
   -- Example for entries table
   SELECT * FROM entries;
   ```

---

## Step 4: Apply Schema to Hosted Project

### Option A: Push with Supabase CLI

1. Link your local project to the hosted one:
   ```powershell
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
   - Find `YOUR_PROJECT_REF` in your hosted project settings (General tab)
   - You'll be prompted for your database password

2. Push your migrations:
   ```powershell
   npx supabase db push
   ```

### Option B: Manual SQL Copy

1. Open your **local** Supabase Studio: http://localhost:54323
2. Go to **Table Editor** and note your schema
3. Open your **hosted** Supabase dashboard
4. Go to **SQL Editor**
5. Create your tables manually or copy/paste from local:

```sql
-- Example: Create profiles table
CREATE TABLE profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT,
  bio TEXT,
  pfp_url TEXT,
  visibility TEXT DEFAULT 'public',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Example: Create entries table  
CREATE TABLE entries (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  entry JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX idx_profiles_username ON profiles(username);
CREATE INDEX idx_entries_user_id ON entries(user_id);
```

---

## Step 5: Apply RLS Policies

In your hosted project's **SQL Editor**, run:

```sql
-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all public profiles"
  ON profiles FOR SELECT
  USING (visibility = 'public' OR auth.uid() = user_id);

CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profile"
  ON profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Entries policies
CREATE POLICY "Users can view their own entries"
  ON entries FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own entries"
  ON entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own entries"
  ON entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own entries"
  ON entries FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Step 6: Create Database Functions (RPCs)

If you have the `append_entry` RPC or trigger functions, apply them in **SQL Editor**:

```sql
-- Example: append_entry function
CREATE OR REPLACE FUNCTION append_entry(_entry JSON)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _user_id UUID := auth.uid();
  _existing_entry JSONB;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT entry INTO _existing_entry
  FROM entries
  WHERE user_id = _user_id;

  IF NOT FOUND THEN
    INSERT INTO entries (user_id, entry)
    VALUES (_user_id, jsonb_build_array(_entry));
  ELSE
    IF jsonb_typeof(_existing_entry) = 'array' THEN
      UPDATE entries
      SET entry = _existing_entry || jsonb_build_array(_entry)
      WHERE user_id = _user_id;
    ELSE
      UPDATE entries
      SET entry = jsonb_build_array(_existing_entry, _entry)
      WHERE user_id = _user_id;
    END IF;
  END IF;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION append_entry TO authenticated;
```

```sql
-- Example: Auto-create profile trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, username, email, visibility)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email,
    'public'
  )
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Profile creation failed: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
```

---

## Step 7: Create Storage Bucket (for pfps)

1. In your hosted Supabase dashboard, go to **Storage**
2. Click **"Create a new bucket"**
3. Name it: `pfps`
4. Set it to **Public** (for easy public URLs) or **Private** (use signed URLs)
5. Click **"Create bucket"**
6. Go to **Policies** tab and add:

```sql
-- Allow authenticated users to upload their own pfp
CREATE POLICY "Users can upload their own pfp"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'pfps' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

-- Allow public read access
CREATE POLICY "Public pfp access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pfps');

-- Allow users to update their own pfp
CREATE POLICY "Users can update their own pfp"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'pfps' 
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
```

---

## Step 8: Migrate Existing Users & Data

### For Auth Users:

**Option 1**: Have users re-register on the new hosted instance

**Option 2**: Export/import auth users (advanced):
```powershell
# This requires direct database access - contact Supabase support for large migrations
```

### For Data (profiles, entries):

1. Export from local (in SQL Editor):
   ```sql
   -- Copy the output
   SELECT user_id, username, email, bio, pfp_url, visibility
   FROM profiles;
   ```

2. Import to hosted (format as INSERT):
   ```sql
   INSERT INTO profiles (user_id, username, email, bio, pfp_url, visibility)
   VALUES
     ('uuid-here', 'username1', 'email1@example.com', 'bio1', 'url1', 'public'),
     ('uuid-here', 'username2', 'email2@example.com', 'bio2', 'url2', 'public');
   ```

3. Repeat for `entries` table

---

## Step 9: Update Your Frontend Code

1. Open `scripts/supabaseClient.js`
2. Replace the local credentials with your hosted ones:

```javascript
const SUPABASE_URL = 'https://YOUR_PROJECT_REF.supabase.co'; // Replace with your hosted URL
const SUPABASE_ANON_KEY = 'eyJ...'; // Replace with your hosted anon key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
```

---

## Step 10: Test Locally Before Deploying

1. Stop your local Supabase:
   ```powershell
   npx supabase stop
   ```

2. Update `supabaseClient.js` with hosted credentials (from Step 9)

3. Test your site locally:
   - Open `index.html` in a browser (or use Live Server)
   - Try registering a new user
   - Submit an entry
   - Check profile page loads correctly

4. Verify in hosted Supabase dashboard:
   - Go to **Table Editor** → check `profiles` and `entries`
   - Go to **Authentication** → check new users appear

---

## Step 11: Deploy to GitHub Pages

1. Commit and push your updated code:
   ```powershell
   git add .
   git commit -m "Update Supabase to hosted instance"
   git push origin main
   ```

2. Enable GitHub Pages:
   - Go to your repo on GitHub
   - **Settings** → **Pages**
   - **Source**: Deploy from branch `main` (or `gh-pages`)
   - **Folder**: `/ (root)` or `/docs` depending on your setup
   - Click **Save**

3. Wait a few minutes, then visit:
   ```
   https://YOUR_USERNAME.github.io/Midnight/
   ```

---

## Step 12: Configure Redirect URLs (Important!)

1. In hosted Supabase dashboard, go to **Authentication** → **URL Configuration**
2. Add your GitHub Pages URL to **Site URL**:
   ```
   https://YOUR_USERNAME.github.io/Midnight/
   ```
3. Add to **Redirect URLs**:
   ```
   https://YOUR_USERNAME.github.io/Midnight/**
   ```

This ensures email confirmations and OAuth redirects work correctly.

---

## Troubleshooting

### CORS Errors
- Supabase hosted projects allow all origins by default for anon key
- If you see CORS errors, check your API key is correct

### Auth Errors
- Ensure redirect URLs are configured (Step 12)
- Check email confirmation settings in **Authentication** → **Providers** → **Email**

### RLS Blocking Queries
- Test policies in SQL Editor with:
  ```sql
  SELECT * FROM profiles WHERE user_id = auth.uid();
  ```
- Check policies allow `authenticated` role

### Storage Upload Fails
- Verify bucket exists and is named `pfps`
- Check storage policies allow uploads
- Ensure user is authenticated before upload

---

## Optional: Keep Local & Hosted in Sync

If you want to continue developing locally and push changes:

```powershell
# Make changes locally
npx supabase start

# Generate new migration
npx supabase db diff -f my_new_feature

# Push to hosted
npx supabase db push
```

---

## Quick Reference

| Item | Local | Hosted |
|------|-------|--------|
| Studio UI | http://localhost:54323 | https://supabase.com/dashboard/project/YOUR_REF |
| API URL | http://127.0.0.1:54321 | https://YOUR_REF.supabase.co |
| Anon Key | (in `.env` or status output) | (in dashboard Settings → API) |

---

You're done! Your app should now be running on GitHub Pages with a hosted Supabase backend. 🎉
