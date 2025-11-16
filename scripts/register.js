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
      // We'll only attempt upload if the user is signed in (session present).
      let pfpUrl = null;
      try {
        const { data: currentUserResp } = await supabase.auth.getUser();
        const currentUser = currentUserResp.user || currentUserResp;

        if (pfpInput && pfpInput.files && pfpInput.files[0] && currentUser && currentUser.id) {
          const file = pfpInput.files[0];
          // choose a path: pfps/<user-id>/<timestamp>-filename
          const userId = currentUser.id;
          const filePath = `pfps/${userId}-${Date.now()}-${file.name}`;
          // Quick check: try to list the bucket root to verify it exists and is accessible
          const { data: listData, error: listErr } = await supabase.storage.from('pfps').list('', { limit: 1 });
          if (listErr) {
            console.warn('Storage bucket check failed:', listErr);
            alert('Profile picture upload failed: storage bucket "pfps" not found or inaccessible. Create a bucket named "pfps" in Supabase Storage and set proper permissions.');
          } else {
            // Try uploading. If upload fails, we'll catch and show a helpful message.
            const { error: uploadErr } = await supabase.storage.from('pfps').upload(filePath, file, { cacheControl: '3600', upsert: false });
          if (uploadErr) {
            console.warn('Failed to upload pfp', uploadErr.message || uploadErr);
            // Friendly guidance for missing bucket
            if (uploadErr.message && uploadErr.message.toLowerCase().includes('bucket')) {
              alert('Profile picture upload failed: storage bucket "pfps" not found. Create a bucket named "pfps" in Supabase Storage and set it to public, or leave the picture empty.');
            }
          } else {
            // get public URL (this works if the bucket is public). If bucket is private, use createSignedUrl server-side.
            const { data } = supabase.storage.from('pfps').getPublicUrl(filePath);
            pfpUrl = data.publicUrl;
          }
          }
        }
      } catch (e) {
        console.warn('Could not determine current user for pfp upload:', e);
      }

      // 3) Insert a profile row into 'profiles' table linking to the auth user id.
      //    Make sure you created a table `profiles` with id = auth uid (text/uuid), username, email, is_public, pfp_url
      // Attempt to insert the profile row only if we have an active authenticated user session.
      // If the user is not signed in immediately (e.g. email confirm required), the DB trigger
      // will create the profiles row server-side.
      try {
        const { data: currentUserResp } = await supabase.auth.getUser();
        const currentUser = currentUserResp.user || currentUserResp;
        if (currentUser && currentUser.id) {
          // Diagnostic: print session token existence (not the token itself)
          try {
            const { data: sessionData } = await supabase.auth.getSession();
            console.log('Registration time session present?', !!(sessionData && sessionData.session && sessionData.session.access_token));
          } catch (e) {
            console.warn('Could not read session for diagnostics', e);
          }
          const profileRow = {
            user_id: currentUser.id,
            username,
            email,
            visibility: publicProfile,
            pfp_url: pfpUrl
          };

          const { error: profileErr } = await supabase.from('profiles').insert(profileRow);
          if (profileErr) {
            console.warn('Failed to insert profile row:', profileErr);
            // If RLS denies insert or other issue occurs, the server-side trigger may still create profile.
            // Provide a clearer hint to the developer in console
            console.warn('Profile insert denied. Check that RLS policies on `profiles` allow INSERT when user_id = auth.uid(), and that SUPABASE_URL/ANON_KEY in supabaseClient.js point to the same project where the user was created.');
          }
        } else {
          // No active session — rely on DB trigger to create the profile when the auth user is confirmed.
          console.log('No active session after signUp; profile creation deferred to DB trigger.');
        }
      } catch (e) {
        console.warn('Error while attempting to create profile row:', e);
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
