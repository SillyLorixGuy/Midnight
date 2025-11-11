import { supabase } from './supabaseClient.js';
// register.js
// Handles user registration using Supabase Auth + Storage + profile table

// Assumes you included the Supabase JS bundle in your HTML head, and
// that scripts/supabaseClient.js is loaded before this file.
// Also assumes a `profiles` table exists with columns:
//   id (uuid, primary key) -> should match auth user id
//   username text
//   email text
//   is_public boolean
//   pfp_url text

(async function () {
  // Elements
  const usernameInput = document.getElementById('username');
  const emailInput = document.getElementById('email');
  const pwInput = document.getElementById('password');
  const pw2Input = document.getElementById('password2');
  const visibilityInputs = document.getElementsByName('visibility');
  const pfpInput = document.getElementById('pfp');
  const registerBtn = document.getElementById('register-btn');

  // Helper: read selected visibility
  function isPublic() {
    for (const r of visibilityInputs) if (r.checked) return r.value === 'public';
    return true;
  }

  registerBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    // Basic validation
    const username = usernameInput.value.trim();
    const email = emailInput.value.trim();
    const password = pwInput.value;
    const password2 = pw2Input.value;
    const publicProfile = isPublic();

    if (!username || !email || !password) {
      alert('Please fill username, email and password');
      return;
    }
    if (password !== password2) {
      alert('Passwords do not match');
      return;
    }

    if (!supabase) {
      alert('Supabase client not configured. Fill scripts/supabaseClient.js with your keys and include the SDK.');
      return;
    }

    registerBtn.disabled = true;
    registerBtn.textContent = 'Registering...';

    try {
      // 1) Sign up using Supabase Auth. This creates a user in the auth schema.
      //    signUp accepts { email, password } and optional options with data for user metadata.
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
        { email, password },
        { data: { username } }
      );
      if (signUpError) throw signUpError;

      // If your Supabase project has "email confirmations" enabled, the user will receive
      // an email to confirm. signUpData.user contains a limited object (may be null if not immediately signed in).
      const user = signUpData.user || signUpData;
      // Note: depending on Supabase version, signUpData may look different.

      // 2) Upload profile picture to Storage (optional)
      let pfpUrl = null;
      if (pfpInput && pfpInput.files && pfpInput.files[0]) {
        const file = pfpInput.files[0];
        // choose a path: profiles/<user-id>/<timestamp>-filename
        const userId = (user && user.id) ? user.id : (Date.now() + '-' + Math.random());
        const filePath = `pfps/${userId}-${Date.now()}-${file.name}`;
        const { error: uploadErr } = await supabase.storage.from('pfps').upload(filePath, file, { cacheControl: '3600', upsert: false });
        if (uploadErr) {
          console.warn('Failed to upload pfp', uploadErr.message);
        } else {
          // get public URL (this works if the bucket is public). If bucket is private, use createSignedUrl server-side.
          const { data } = supabase.storage.from('pfps').getPublicUrl(filePath);
          pfpUrl = data.publicUrl;
        }
      }

      // 3) Insert a profile row into 'profiles' table linking to the auth user id.
      //    Make sure you created a table `profiles` with id = auth uid (text/uuid), username, email, is_public, pfp_url
      const profileRow = {
        id: user.id,
        username,
        email,
        is_public: publicProfile,
        pfp_url: pfpUrl
      };
      const { error: profileErr } = await supabase.from('profiles').insert(profileRow);
      if (profileErr) {
        // If insert fails, still continue — user is created in auth; you can inspect and fix table.
        console.warn('Failed to insert profile row:', profileErr.message);
      }

      alert('Registration successful. Check your email if confirmation is required.');
      // redirect to login page or profile
      window.location.href = 'login.html';
    } catch (err) {
      console.error('Registration error', err);
      alert('Registration failed: ' + (err.message || JSON.stringify(err)));
    } finally {
      registerBtn.disabled = false;
      registerBtn.textContent = 'Register';
    }
  });
})();
