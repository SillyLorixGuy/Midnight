document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('login-btn');
  const input = document.getElementById('username');
  btn.addEventListener('click', () => {
    const v = input.value.trim();
    if (!v) return alert('Please enter a username');
    // store prototype user
    localStorage.setItem('midnight_user', v);
    // redirect to index
    window.location.href = 'index.html';
  });
});
