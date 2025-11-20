import { supabase, getCurrentUser } from './supabaseClient.js';

// Helper functions
function escapeHTML(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(dateStr, timeStr) {
  if (!dateStr && !timeStr) return '';
  if (!timeStr) return dateStr || '';
  if (!dateStr) return timeStr || '';
  return `${dateStr} ${timeStr}`;
}

function createEntryElement(entry, pfpSrc, username) {
  const title = entry.title || '';
  const content = entry.content || '';
  const date = entry.date || entry.created_at || '';
  const time = entry.time || '';

  const article = document.createElement('article');
  article.className = 'entry';
  article.innerHTML = `
    <div class="entry-top">
      <div class="entry-user">
        <img src="${escapeHTML(pfpSrc || '')}" alt="">
        <span class="glow entry-user-name">${escapeHTML(username || '')}</span>
      </div>
      <div class="entry-footer-placeholder"></div>
    </div>
    <div class="entry-title-wrap">
      <button class="toggle-entry glow" aria-expanded="false">${escapeHTML(String(title).toUpperCase())}</button>
    </div>
      <p>${escapeHTML(content)}</p>
    </section>
    <div class="entry-footer">
      <span class="entry-date">${escapeHTML(formatDate(date, time))}</span>
    </div>
  `;
  return article;
}

async function fetchProfileAndEntries() {
  try {
    const user = await getCurrentUser();
    if (!user) return { profile: null, entries: [] };

    const [profileRes, entriesRes] = await Promise.all([
      supabase.from('profiles').select('username, pfp_url, user_id').eq('user_id', user.id).single(),
      supabase.from('entries').select('entry, user_id').eq('user_id', user.id).single(),
    ]);

    if (profileRes.error) {
      console.warn('Could not load profile:', profileRes.error);
    }
    if (entriesRes.error) {
      console.warn('Could not load entries:', entriesRes.error);
    }

    const profile = profileRes.data || null;
    let entries = [];
    const payload = entriesRes.data?.entry;
    if (payload) entries = Array.isArray(payload) ? payload : [payload];

    // Sort by date+time descending (most recent first)
    entries.sort((a, b) => {
      const dateA = a.date || a.created_at || '';
      const timeA = a.time || '00:00:00';
      const dateB = b.date || b.created_at || '';
      const timeB = b.time || '00:00:00';
      const datetimeA = `${dateA} ${timeA}`;
      const datetimeB = `${dateB} ${timeB}`;
      return datetimeB.localeCompare(datetimeA);
    });

    return { profile, entries };
  } catch (err) {
    console.error('fetchProfileAndEntries error:', err);
    return { profile: null, entries: [] };
  }
}

function attachToggles(root) {
  function toggleCollapse(button, content) {
    if (content.dataset.animating === 'true') return;
    const isExpanded = button.getAttribute('aria-expanded') === 'true';

    if (isExpanded) {
      // collapse
      content.dataset.animating = 'true';
      content.classList.remove('expanded');
      button.setAttribute('aria-expanded', 'false');
      const onEnd = (e) => {
        if (e.propertyName === 'max-height') {
          content.setAttribute('hidden', '');
          content.dataset.animating = 'false';
          content.removeEventListener('transitionend', onEnd);
        }
      };
      content.addEventListener('transitionend', onEnd);
      return;
    }

    // expand
    content.dataset.animating = 'true';
    content.removeAttribute('hidden');
    content.offsetHeight; // force reflow
    content.classList.add('expanded');
    button.setAttribute('aria-expanded', 'true');
    const onEnd = (e) => {
      if (e.propertyName === 'max-height') {
        content.dataset.animating = 'false';
        content.removeEventListener('transitionend', onEnd);
      }
    };
    content.addEventListener('transitionend', onEnd);
  }

  root.querySelectorAll('.toggle-entry').forEach(btn => {
    let lastToggle = 0;
    btn.addEventListener('click', () => {
      const now = Date.now();
      if (now - lastToggle < 60) return;
      lastToggle = now;
      const content = btn.closest('.entry').querySelector('.entry-content');
      if (!content) return;
      toggleCollapse(btn, content);
    });
  });
}

async function init() {
  const container = document.querySelector('.entries');
  if (!container) return;

  const { profile, entries } = await fetchProfileAndEntries();
  container.innerHTML = '';

  if (!entries || entries.length === 0) {
    const p = document.createElement('p');
    p.className = 'no-entries glow';
    p.textContent = 'No entries yet.';
    container.appendChild(p);
    return;
  }

  const username = profile?.username || '';
  const pfp = profile?.pfp_url || 'pfps/temp-pfp.png';

  entries.forEach(entry => {
    console.debug('profile-entries: rendering', entry);
    const el = createEntryElement(entry, pfp, username);
    container.appendChild(el);
  });

  attachToggles(container);
}

document.addEventListener('DOMContentLoaded', init);
