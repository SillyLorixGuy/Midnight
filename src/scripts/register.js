import { supabase, getCurrentUser } from './supabaseClient.js';

const step1Section = document.getElementById('step1');
const step2Section = document.getElementById('step2');
const confirmMessageSection = document.getElementById('confirm-message');

const emailInput = document.getElementById('email');
const pwInput = document.getElementById('password');
const pw2Input = document.getElementById('password2');
const step1Btn = document.getElementById('step1-btn');

const usernameInput = document.getElementById('username');
const bioInput = document.getElementById('bio');
const visibilityInputs = document.getElementsByName('visibility');
const pfpInput = document.getElementById('pfp');
const step2Btn = document.getElementById('step2-btn');

const checkConfirmationBtn = document.getElementById('check-confirmation-btn');

(async function checkInitialState() {
  const user = await getCurrentUser();
  if (user) {
    const { data, error } = await supabase
      .from('profiles')
      .select('username')
      .eq('user_id', user.id)
      .maybeSingle();
    
    if (error || !data || !data.username) {
      showStep2();
    } else {
      window.location.href = 'index.html';
    }
  }
})();

step1Btn.addEventListener('click', async (e) => {
  e.preventDefault();
  
  const email = emailInput.value.trim();
  const password = pwInput.value;
  const password2 = pw2Input.value;

  if (!email || !password) {
    alert('Please fill in email and password');
    return;
  }
  if (password.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }
  if (password !== password2) {
    alert('Passwords do not match');
    return;
  }

  step1Btn.disabled = true;
  step1Btn.textContent = 'Creating account...';

  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;

    step1Section.style.display = 'none';
    confirmMessageSection.style.display = 'block';
    
  } catch (err) {
    console.error('Sign up error:', err);
    alert('Sign up failed: ' + (err.message || 'Unknown error'));
    step1Btn.disabled = false;
    step1Btn.textContent = 'Continue';
  }
});

checkConfirmationBtn.addEventListener('click', async (e) => {
  e.preventDefault();
  
  checkConfirmationBtn.disabled = true;
  checkConfirmationBtn.textContent = 'Checking...';

  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) throw error;
    
    if (session && session.user) {
      showStep2();
    } else {
      alert('Email not confirmed yet. Please check your inbox and click the confirmation link, then try again.');
      checkConfirmationBtn.disabled = false;
      checkConfirmationBtn.textContent = 'I\'ve Confirmed - Continue';
    }
  } catch (err) {
    console.error('Check confirmation error:', err);
    alert('Could not verify confirmation. Please try logging in instead.');
    checkConfirmationBtn.disabled = false;
    checkConfirmationBtn.textContent = 'I\'ve Confirmed - Continue';
  }
});

step2Btn.addEventListener('click', async (e) => {
  e.preventDefault();

  const username = usernameInput.value.trim();
  const bio = bioInput.value.trim();
  const visibility = getVisibility();

  if (!username) {
    alert('Please enter a username');
    return;
  }

  step2Btn.disabled = true;
  step2Btn.textContent = 'Completing...';

  try {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error('Not authenticated. Please log in again.');
    }

    let pfpUrl = null;
    if (pfpInput && pfpInput.files && pfpInput.files[0]) {
      console.log('Attempting pfp upload...');
      const file = pfpInput.files[0];
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${user.id}/${Date.now()}-${sanitizedName}`;
      
      console.log('Upload path:', filePath);
      
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from('pfps')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadErr) {
        console.error('Failed to upload pfp:', uploadErr);
        alert('Profile picture upload failed: ' + uploadErr.message + '. Continuing without it.');
      } else {
        console.log('Upload successful:', uploadData);
        const { data: urlData } = supabase.storage.from('pfps').getPublicUrl(filePath);
        pfpUrl = urlData.publicUrl;
        console.log('Public URL:', pfpUrl);
      }
    }
    
    console.log('Profile data being inserted:', { user_id: user.id, username, bio, visibility: visibility === 'public', pfp_url: pfpUrl });

    const { error: profileErr } = await supabase
      .from('profiles')
      .upsert({
        user_id: user.id,
        username,
        email: user.email,
        bio,
        visibility: visibility === 'public',
        pfp_url: pfpUrl,
      }, { onConflict: 'user_id' });

    if (profileErr) throw profileErr;

    alert('Profile complete! Welcome to Midnight.');
    window.location.href = 'index.html';

  } catch (err) {
    console.error('Complete profile error:', err);
    alert('Failed to complete profile: ' + (err.message || 'Unknown error'));
    step2Btn.disabled = false;
    step2Btn.textContent = 'Complete Registration';
  }
});

function showStep2() {
  step1Section.style.display = 'none';
  confirmMessageSection.style.display = 'none';
  step2Section.style.display = 'block';
}

function getVisibility() {
  for (const r of visibilityInputs) {
    if (r.checked) return r.value;
  }
  return 'public';
}
