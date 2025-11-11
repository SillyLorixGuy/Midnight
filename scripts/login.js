import { supabase } from './supabaseClient.js';
// login.js
// Handles user sign-in using email or username + password via Supabase Auth

(async function () {
  const identifierInput = document.getElementById('identifier');
  const passwordInput = document.getElementById('password');
  const loginBtn = document.getElementById('login-btn');

  loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    const identifier = identifierInput.value.trim();
    const password = passwordInput.value;

    if (!identifier || !password) return alert('Enter identifier and password');
    if (!supabase) {
      alert('Supabase client not configured. Fill scripts/supabaseClient.js with your keys and include the SDK.');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.textContent = 'Signing in...';

    try {
      let emailToUse = identifier;

      // If identifier doesn't look like an email, try to resolve username -> email from 'profiles' table
      if (!identifier.includes('@')) {
        const { data: profile, error: profileErr } = await supabase.from('profiles').select('email').eq('username', identifier).single();
        if (profileErr) {
          // If lookup fails, we'll still attempt sign-in treating identifier as email; it will likely fail.
          console.warn('Profile lookup failed', profileErr.message);
        } else if (profile && profile.email) {
          emailToUse = profile.email;
        }
      }

      // Sign in - supabase.auth.signInWithPassword expects { email, password }
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
      if (error) throw error;

      // Success - you can access the session: data.session, and user: data.user
      alert('Signed in successfully');
      // Redirect to profile or home
      window.location.href = 'profile.html';
    } catch (err) {
      console.error('Sign in error', err);
      alert('Sign in failed: ' + (err.message || JSON.stringify(err)));
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign in';
    }
  });
})();
