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



async function getEntries(){
  try {
    const user = await getCurrentUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('entries')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch entries for user:', error);
      return [];
    }

    return data || [];
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
  if (dateStr && dateStr.includes('T')) {
    const date = new Date(dateStr);
    return date.toLocaleString();
  }
  if (!timeStr) return dateStr || '';
  if (!dateStr) return timeStr || '';
  return `${dateStr} ${timeStr}`;
}

async function createEntryElement(entry, pfpSrc, profile) {
  const title = entry.title || 'Untitled';
  
  let content = entry.content || '';
  
  if (typeof content === 'string') {
    try {
      content = JSON.parse(content);
    } catch (e) {
    }
  }
  
  if (Array.isArray(content) && content.length > 0) {
    content = content[0].content || '';
  } else if (typeof content === 'object' && content !== null && content.content) {
    content = content.content;
  }
  
  content = String(content);
  const safeContent = escapeHTML(content).replace(/\n/g, '<br>');
  const date = entry.date || entry.created_at || '';
  const time = entry.time || '';
  const favoritedBy = entry.favorited_by || [];

  let author = '';
  if (entry && entry.user_id && profile && profile.user_id) {
    if (entry.user_id === profile.user_id) {
      author = profile.username || '';
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
        <p class="glow entry-user-name">${escapeHTML(author)}</p>
      </div>
      <div class="entry-footer-placeholder"></div>
    </div>
    <div class="entry-title-wrap">
      <button class="toggle-entry glow" aria-expanded="false">${escapeHTML(String(title).toUpperCase())}</button>
    </div>
    <section class="entry-content collapsed">
      <p>${safeContent}</p>
    </section>
    <div class="entry-footer">
      <p class="entry-date">${escapeHTML(formatDate(date, time))}</p>
      <button class="favorite-btn" title="Favorite this entry">
        <i class="fa-heart"></i>
      </button>
    </div>
  `;

  const toggleBtn = article.querySelector('.toggle-entry');
  const contentSection = article.querySelector('.entry-content');
  
  toggleBtn.addEventListener('click', () => {
    const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    if (isExpanded) {
      contentSection.classList.add('collapsed');
      toggleBtn.setAttribute('aria-expanded', 'false');
    } else {
      contentSection.classList.remove('collapsed');
      toggleBtn.setAttribute('aria-expanded', 'true');
    }
  });

  const favoriteBtn = article.querySelector('.favorite-btn');
  const heartIcon = favoriteBtn.querySelector('i');
  
  const user = await getCurrentUser();
  if (user && favoritedBy.includes(user.id)) {
    heartIcon.classList.add('fa-solid');
    favoriteBtn.classList.add('favorited');
  } else {
    heartIcon.classList.add('fa-regular');
  }

  favoriteBtn.addEventListener('click', async () => {
    try {
      const user = await getCurrentUser();
      if (!user) {
        alert('Please log in to favorite entries');
        return;
      }

      const { data: currentEntry } = await supabase
        .from('entries')
        .select('favorited_by')
        .eq('id', entry.id)
        .single();

      let updatedFavoritedBy = currentEntry.favorited_by || [];

      if (updatedFavoritedBy.includes(user.id)) {
        updatedFavoritedBy = updatedFavoritedBy.filter(id => id !== user.id);
        heartIcon.classList.remove('fa-solid');
        heartIcon.classList.add('fa-regular');
        favoriteBtn.classList.remove('favorited');
      } else {
        updatedFavoritedBy = [...updatedFavoritedBy, user.id];
        heartIcon.classList.remove('fa-regular');
        heartIcon.classList.add('fa-solid');
        favoriteBtn.classList.add('favorited');
      }

      const { error } = await supabase
        .from('entries')
        .update({ favorited_by: updatedFavoritedBy })
        .eq('id', entry.id);

      if (error) {
        console.error('Failed to update favorite:', error);
      }
    } catch (err) {
      console.error('Favorite error:', err);
    }
  });

  return article;
}

addEventListener('DOMContentLoaded', async () => {
    const profile = await getUserProfile();
    if (profile) {
        loadUserProfile(profile);
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
    for (const entry of entries) {
      const el = await createEntryElement(entry, pfpSrc, profile);
      entriesSection.appendChild(el);
    }
    }  
});