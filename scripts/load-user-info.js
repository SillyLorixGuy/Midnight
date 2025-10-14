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
      const user = (data && data.users && data.users[0]) || null;
      if (!user) {
        console.warn('No user found in user-info.json');
        return;
      }

      // Normalize pfp path (convert backslashes to forward slashes)
      let pfp = (user['pfp-src'] || user.pfp || '').replace(/\\/g, '/');
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
      }

      const profileImg = document.getElementById('profile-pfp');
      if (profileImg) {
        profileImg.src = finalSrc;
        profileImg.alt = (user.name || 'user') + ' profile picture';
      }

      // Optional: set username display if present
      const nameNodes = document.querySelectorAll('[data-user-name]');
      nameNodes.forEach(n => n.textContent = user.name || '');

      // Optional: set stats if present
      if (user.info) {
        const statsMap = {
          mentalScore: '[data-mental-score]',
          entries: '[data-entries-count]',
          streak: '[data-streak]'
        };
        Object.keys(statsMap).forEach(key => {
          const el = document.querySelector(statsMap[key]);
          if (el && user.info[key] !== undefined) el.textContent = user.info[key];
        });
      }
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
