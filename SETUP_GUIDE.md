# Project Midnight - Supabase Authentication Setup Guide

## ✅ Current Status
All HTML and JavaScript files are ready to use! The module resolution issue has been fixed.

---

## 🔧 Step 1: Configure Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com)
2. Open your Project Midnight project
3. Go to **Settings → API**
4. Copy your:
   - **Project URL** (looks like: `https://xxxxxxxx.supabase.co`)
   - **Anon Public Key** (the public key under "anon" section)

5. Open `scripts/supabaseClient.js` and replace:
   ```javascript
   const SUPABASE_URL = 'https://your-project-ref.supabase.co'; // ← Replace this
   const SUPABASE_ANON_KEY = 'your-anon-key-here'; // ← Replace this
   ```

---

## 🗄️ Step 2: Create Supabase Tables

### Option A: Using Supabase Dashboard (Easiest)
1. Go to **SQL Editor** in your Supabase dashboard
2. Create a new query and paste:

```sql
-- Create profiles table to store user information
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  is_public BOOLEAN DEFAULT TRUE,
  pfp_url TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create entries table to store diary entries
CREATE TABLE entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  mood INTEGER CHECK (mood >= 1 AND mood <= 10),
  entry_date DATE NOT NULL,
  entry_time TIME DEFAULT '00:00:00',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create index for faster queries
CREATE INDEX idx_entries_user_id ON entries(user_id);
CREATE INDEX idx_entries_date ON entries(entry_date);

-- Enable Row Level Security (RLS) for security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own profile
CREATE POLICY "Users can read their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Allow users to update their own profile
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Allow users to read their own entries
CREATE POLICY "Users can read their own entries"
  ON entries FOR SELECT
  USING (user_id = auth.uid());

-- Allow users to insert their own entries
CREATE POLICY "Users can insert their own entries"
  ON entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Allow users to update their own entries
CREATE POLICY "Users can update their own entries"
  ON entries FOR UPDATE
  USING (user_id = auth.uid());

-- Allow users to delete their own entries
CREATE POLICY "Users can delete their own entries"
  ON entries FOR DELETE
  USING (user_id = auth.uid());
```

3. Click **Run**

---

## 💾 Step 3: Create Storage Bucket

1. Go to **Storage** in Supabase dashboard
2. Click **Create new bucket**
3. Name it: `pfps`
4. Choose **Public** (so profile pictures can be viewed)
5. Click **Create bucket**

---

## 🧪 Step 4: Test Registration

1. Open `register.html` in your browser (or use Live Server)
2. Fill in the form:
   - **Username:** testuser
   - **Email:** test@example.com
   - **Password:** Test123!@#
   - **Confirm Password:** Test123!@#
   - **Profile Visibility:** Public
   - **Profile Picture:** (optional - upload an image)
3. Click **Register**

**Expected:**
- ✅ Alert: "Registration successful"
- ✅ Redirects to login.html

**If it fails:**
- Check browser console (F12 → Console tab) for error messages
- Verify Supabase URL and key are correct in `scripts/supabaseClient.js`
- Verify tables exist in Supabase

---

## 🔐 Step 5: Test Login

1. Open `login.html` in your browser
2. Enter one of:
   - **Email:** test@example.com (with password: Test123!@#)
   - **Username:** testuser (with password: Test123!@#)
3. Click **Sign in**

**Expected:**
- ✅ Alert: "Signed in successfully"
- ✅ Redirects to profile.html

---

## 📋 File Overview

| File | Purpose |
|------|---------|
| `scripts/supabaseClient.js` | Initializes Supabase client (needs credentials) |
| `scripts/register.js` | Handles user registration flow |
| `scripts/login.js` | Handles user login (email or username) |
| `register.html` | Registration form UI |
| `login.html` | Login form UI |
| `scripts/entry-logger.js` | Logs diary entries (needs Supabase update) |
| `scripts/profile-info.js` | Calculates stats (needs Supabase update) |
| `scripts/profile-entries.js` | Displays entries (needs Supabase update) |

---

## 🚀 Step 6: Integrate Entries with Supabase

Once login/register works, update these files to use Supabase:

### Update `server.js`
Change the `/api/log-entry` endpoint to write to Supabase instead of JSON:

```javascript
app.post('/api/log-entry', async (req, res) => {
  const { date, time, title, content, mood } = req.body;
  
  try {
    // Get current user from Supabase session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    // Insert entry into Supabase
    const { error } = await supabase.from('entries').insert({
      user_id: user.id,
      entry_date: date,
      entry_time: time,
      title,
      content,
      mood: parseInt(mood)
    });

    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
```

### Update `scripts/profile-entries.js`
Fetch entries from Supabase:

```javascript
async function loadEntries() {
  const { data: entries, error } = await supabase
    .from('entries')
    .select('*')
    .order('entry_date', { ascending: false })
    .order('entry_time', { ascending: false });

  if (error) {
    console.error('Failed to load entries:', error);
    return;
  }

  // Display entries...
}
```

### Update `scripts/profile-info.js`
Calculate stats from Supabase data:

```javascript
async function calculateStats() {
  const { data: entries, error } = await supabase
    .from('entries')
    .select('entry_date, mood');

  if (error) {
    console.error('Failed to load entries:', error);
    return;
  }

  // Calculate stats from entries...
}
```

---

## ❓ Troubleshooting

### "Supabase client not configured"
→ Fill in `SUPABASE_URL` and `SUPABASE_ANON_KEY` in `scripts/supabaseClient.js`

### "relation 'public.profiles' does not exist"
→ Run the SQL commands from Step 2 to create the tables

### "Failed to upload pfp"
→ Make sure the `pfps` storage bucket exists and is public

### "Invalid login credentials"
→ Make sure you're using the same email/username and password from registration

### Profile picture not showing
→ Check that the `pfps` bucket is set to **Public** in storage settings

---

## 📝 Next Steps

1. ✅ Fill in Supabase credentials
2. ✅ Create tables with SQL
3. ✅ Create storage bucket
4. 🧪 Test registration and login
5. 🔄 Update entry logging to use Supabase
6. 🔄 Update profile stats to use Supabase
7. 🔄 Migrate existing JSON data to Supabase (if needed)

---

## 🆘 Need Help?

- Check browser console (F12 → Console) for JavaScript errors
- Check Supabase dashboard for table structure
- Verify Row Level Security (RLS) policies allow your queries
- Check storage bucket permissions

Good luck! 🎉
