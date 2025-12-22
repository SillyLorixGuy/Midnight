import { supabase } from './supabaseClient.js';

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

      if (!identifier.includes('@')) {
        const { data: profile, error: profileErr } = await supabase.from('profiles').select('email').eq('username', identifier).single();
        if (profileErr) {
          console.warn('Profile lookup failed', profileErr.message);
        } else if (profile && profile.email) {
          emailToUse = profile.email;
        }
      }

      const { data, error } = await supabase.auth.signInWithPassword({ email: emailToUse, password });
      if (error) throw error;

      window.location.href = 'index.html';
    } catch (err) {
      console.error('Sign in error', err);
    } finally {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Sign in';
    }
  });
})();
