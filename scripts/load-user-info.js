// Load user info (pfp, name, stats) from entries/user-info.json and apply to the DOM
(function() {
  async function imageExists(url) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(true);
      img.onerror = () => resolve(false);
      img.src = url;
    });
  }

  async function loadUserInfo() {
    try {
      const res = await fetch('/entries/user-info.json');
      if (!res.ok) throw new Error('Failed to fetch user-info.json: ' + res.status);
      const data = await res.json();
      const stored = localStorage.getItem('midnight_user');

      // Normalize different possible user-info.json shapes.
      // New scheme: { users: [ { "Lori": { ... } }, { "Bob": { ... } } ] }
      // Older scheme (fallback): { users: [ { name: 'Lori', pfp: '...' }, ... ] }
      let users = [];
      if (data && Array.isArray(data.users)) {
        users = data.users.map(item => {
          if (item && typeof item === 'object' && !Array.isArray(item)) {
            const keys = Object.keys(item);
            if (keys.length === 1 && typeof keys[0] === 'string') {
              // item is like { "Lori": { pfpSrc: '...' } }
              const name = keys[0];
              const value = item[name] || {};
              return Object.assign({ name }, value);
            }
          }
          // assume it's already in normalized form
          return item;
        });
      }

      let user = null;
      if (stored && users.length) {
        user = users.find(u => String(u.name) === stored) || users[0];
      } else {
        user = users[0] || null;
      }

      if (!user) {
        console.warn('No user found in user-info.json');
        return;
      }

      // Normalize pfp path (convert backslashes to forward slashes)
      let pfp = (user && (user.pfp || user.pfpSrc)) ? String(user.pfp || user.pfpSrc).replace(/\\/g, '/') : '';
      // build candidate URLs to try (the project root, entries folder, and bare filename)
      const candidates = [];
      if (pfp) {
        candidates.push(pfp);
        // try without leading ./ or leading slash
        candidates.push(pfp.replace(/^\.\//, ''));
        candidates.push('/' + pfp.replace(/^\//, ''));
        // try just filename
        const filename = pfp.split('/').pop();
        if (filename) candidates.push(filename);
      }
      // fallback to the bundled default
      candidates.push('temp-pfp.png');
      candidates.push('/temp-pfp.png');

      // pick first candidate that actually loads
      let finalSrc = '';
      for (const c of candidates) {
        // skip empty
        if (!c) continue;
        // try to load
        // console.debug('[load-user-info] testing pfp candidate', c);
        // await imageExists to check
        // Use relative paths straight — Image uses the page base
        // If c is absolute (starts with /) it still works
        // We try each candidate until one resolves
        // eslint-disable-next-line no-await-in-loop
        if (await imageExists(c)) {
          finalSrc = c;
          break;
        }
      }

      if (!finalSrc) {
        console.warn('No pfp candidate worked, not setting image');
        return;
      }

      const navImg = document.querySelector('.profile img');
      if (navImg) {
        navImg.src = finalSrc;
        navImg.alt = (user.name || 'user') + ' profile picture';
        // If there is a static logout button in the DOM, attach behavior to it
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn && !logoutBtn._bound) {
          logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('midnight_user');
            // redirect to login page after logout
            window.location.href = '/login.html';
          });
          // mark as bound so we don't attach multiple listeners
          logoutBtn._bound = true;
        }
      }

      const profileImg = document.getElementById('profile-pfp');
      if (profileImg) {
        profileImg.src = finalSrc;
        profileImg.alt = (user.name || 'user') + ' profile picture';
      }

      // Optional: set username display if present
      const nameNodes = document.querySelectorAll('[data-user-name]');
      nameNodes.forEach(n => n.textContent = user.name || '');

      // Optional: set stats if present. Accept values under user.info or at top-level of user.
      const statsMap = {
        mentalScore: '[data-mental-score]',
        entries: '[data-entries-count]',
        streak: '[data-streak]',
        bestStreak: '[data-best-streak]',
        missed: '[data-missed]'
      };
      Object.keys(statsMap).forEach(key => {
        const el = document.querySelector(statsMap[key]);
        if (!el) return;
        let val;
        if (user.info && user.info[key] !== undefined) val = user.info[key];
        else if (user[key] !== undefined) val = user[key];
        else val = '';
        if (val !== undefined) el.textContent = val;
      });
    } catch (err) {
      console.error('load-user-info error:', err);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadUserInfo);
  } else {
    loadUserInfo();
  }
})();
