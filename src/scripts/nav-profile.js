import { supabase, getCurrentUser } from './supabaseClient.js';

async function updateNavProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('pfp_url')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      console.warn('Could not load profile for nav:', error);
      return;
    }

    const navPfp = document.querySelector('nav img');
    if (navPfp && data?.pfp_url) {
      navPfp.src = data.pfp_url;
    }
  } catch (err) {
    console.error('updateNavProfile error:', err);
  }
}

async function handleLogout() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
      alert('Failed to logout. Please try again.');
      return;
    }
    window.location.href = 'login.html';
  } catch (err) {
    console.error('Logout exception:', err);
    alert('Logout failed. Please try again.');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  updateNavProfile();
  
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
});
