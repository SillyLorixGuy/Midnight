async function getUserinfo() {
  try {
    const res = await fetch('/entries/user-info.json');
    if (!res.ok) throw new Error('Failed to fetch user-info.json: ' + res.status);
    const data = await res.json();
    return data;
    console.log('user-info.json data', data);
  }
  catch (err) {
    console.warn('getUserinfo error', err);
  }
}
console.log();

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('login-btn');
  const input = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const errorMsg = document.getElementById('error');
  btn.addEventListener('click', () => {
    const v = input.value.trim();
    const p = qwe; //passwordInput.value;
    if (!v) return alert('Please enter a username');
    if (!p) return alert('Please enter a password');
    

    // store prototype user
    localStorage.setItem('midnight_user', v);
    // redirect to index
    window.location.href = 'index.html';
  });
});
