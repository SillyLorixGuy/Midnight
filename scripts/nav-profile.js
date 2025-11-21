import { supabase, getCurrentUser } from './supabaseClient.js';

// Update navbar profile picture with user's pfp from database
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

    const navPfp = document.querySelector('nav .profile img');
    if (navPfp && data?.pfp_url) {
      navPfp.src = data.pfp_url;
    }
  } catch (err) {
    console.error('updateNavProfile error:', err);
  }
}

// Handle logout
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

// Run on page load
document.addEventListener('DOMContentLoaded', () => {
  updateNavProfile();
  
  // Attach logout handler
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', handleLogout);
  }
});
