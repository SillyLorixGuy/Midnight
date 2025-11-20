import { supabase, getCurrentUser } from './supabaseClient.js';




const usernameElem = document.querySelector('.username');
const pfpElem = document.getElementById('pfp');
const bioElem = document.querySelector('.bio');



async function getUserProfile() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      console.error('Not logged in');
      return null;
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Failed to fetch profile:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('getUserProfile error:', err);
    return null;
  }
}

async function loadUserProfile(profile){
    if (!usernameElem) {
      console.warn('usernameElem not found in DOM');
    } else {
      usernameElem.textContent = profile.username || 'Unknown User';
    }
    if (!pfpElem) {
      console.warn('pfpElem not found in DOM (id="profile-pfp")');
    } else {
      pfpElem.src = profile.pfp_url || 'pfps/temp-pfp.png';
    }
    if (!bioElem) {
      console.warn('bioElem not found in DOM');
    } else {
      bioElem.textContent = profile.bio;
    }
}




////////////////////////////////////////////////////////
// Entry loading
////////////////////////////////////////////////////////

async function getEntries(){
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    // We expect one row per user where `entry` is a JSON array
    const { data, error } = await supabase
      .from('entries')
      .select('entry')
      .eq('user_id', user.id)
      .single();

    if (error) {
      console.error('Failed to fetch entries for user:', error);
      return [];
    }

    const payload = data?.entry;
    if (!payload) return [];
    const entries = Array.isArray(payload) ? payload : [payload];
    
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
    
    return entries;
  } catch (err) {
    console.error('getEntries error:', err);
    return [];
  }
}


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

function createEntryElement(entry, pfpSrc, profile) {
  const title = entry.title || '';
  const content = entry.content || '';
  const date = entry.date || entry.created_at || '';
  const time = entry.time || '';

  // Prefer the loaded profile username when the entry.user_id matches
  let author = '';
  if (entry && entry.user_id && profile && profile.user_id) {
    if (entry.user_id === profile.user_id) {
      author = profile.username || '';
      // prefer profile pfp when author is the same user
      pfpSrc = profile.pfp_url || pfpSrc;
    } else {
      author = entry.user || entry.username || '';
    }
  } else {
    author = entry.user || entry.username || profile?.username || '';
  }

  const article = document.createElement('article');
  article.className = 'entry';
  article.innerHTML = `
    <div class="entry-top">
      <div class="entry-user">
        <img src="${escapeHTML(pfpSrc || '')}" alt="">
        <span class="glow entry-user-name">${escapeHTML(author)}</span>
      </div>
      <div class="entry-footer-placeholder"></div>
    </div>
    <div class="entry-title-wrap">
      <button class="toggle-entry glow" aria-expanded="false">${escapeHTML(String(title).toUpperCase())}</button>
    </div>

    <section class="entry-content" hidden>
      <p>${escapeHTML(content)}</p>
    </section>
    <div class="entry-footer">
      <span class="entry-date">${escapeHTML(formatDate(date, time))}</span>
    </div>
  `;
  return article;
}

addEventListener('DOMContentLoaded', async () => {
    const profile = await getUserProfile();
    if (profile) {
        loadUserProfile(profile);
    // load entries for the currently logged-in user
    const entriesSection = document.querySelector('.entries');
    if (!entriesSection) return;

    const entries = await getEntries();
    entriesSection.innerHTML = '';
    if (!entries || entries.length === 0) {
      const p = document.createElement('p');
      p.className = 'no-entries glow';
      p.textContent = 'No entries yet.';
      entriesSection.appendChild(p);
      return;
    }

    const pfpSrc = profile.pfp_url || 'pfps/temp-pfp.png';
    entries.forEach(entry => {
      console.log('rendering entry:', entry);
      const el = createEntryElement(entry, pfpSrc, profile);
      entriesSection.appendChild(el);
    });

    // Attach animated toggle handlers for each entry
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

    entriesSection.querySelectorAll('.toggle-entry').forEach(btn => {
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
});