import { supabase, getCurrentUser } from './supabaseClient.js';

const keyInput = document.getElementById('access-key-input');
const entriesContainer = document.querySelector('.entries-container');
const showAllBtn = document.getElementById('filter-show-all');
const favoritesBtn = document.getElementById('filter-favorites');
const useCodeBtn = document.getElementById('filter-use-code');

let key = '';
let currentMode = 'all';

if (!keyInput) {
    console.warn('keyInput element not found in DOM (id="access-key-input")');
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

function formatDate(dateStr, timeStr) {
    if (!dateStr && !timeStr) return '';
    if (dateStr && !timeStr) {
        const date = new Date(dateStr);
        return date.toLocaleString();
    }
    if (!timeStr) return dateStr || '';
    if (!dateStr) return timeStr || '';
    return `${dateStr} ${timeStr}`;
}

async function createEntryElement(entry, pfpSrc = 'https://aifxjrcbxtvblqhgsrbs.supabase.co/storage/v1/object/public/pfps/anonymous-avatar-icon-25.jpg') {
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
    const author = 'Anonymous';
    const favoritedBy = entry.favorited_by || [];

    const article = document.createElement('article');
    article.className = 'entry';
    article.innerHTML = `
        <div class="entry-top">
            <div class="entry-user">
                <img src="${escapeHTML(pfpSrc)}" alt="">
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
            <p  class="entry-date">${escapeHTML(formatDate(date, time))}</p>
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

async function getPublicEntries() {
    try {
        const { data, error } = await supabase
            .from('entries')
            .select('*')
            .eq('is_public', true)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch public entries:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('getPublicEntries error:', err);
        return [];
    }
}

async function getKeyEntries() {
    if (!key) {
        console.warn('No access key provided');
        return [];
    }

    try {
        const { data, error } = await supabase
            .from('entries')
            .select('*')
            .eq('access_key', key)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('Failed to fetch entries for access key:', error);
            return [];
        }

        return data || [];
    } catch (err) {
        console.error('getKeyEntries error:', err);
        return [];
    }
}

function getEntriesContainer() {
    if (!entriesContainer) {
        console.warn('entriesContainer element not found (.entries-container)');
    }
    return entriesContainer;
}

async function displayEntries(entries) {
    const container = getEntriesContainer();
    if (!container) return;

    container.innerHTML = '';

    if (!entries || entries.length === 0) {
        container.innerHTML = '<p class="glow">No entries found.</p>';
        return;
    }

    for (const entry of entries) {
        const entryElement = await createEntryElement(entry);
        container.appendChild(entryElement);
    }
}

function initializeFilters() {
    if (!showAllBtn || !favoritesBtn || !useCodeBtn) {
        console.warn('Filter buttons not found; skipping filter initialization');
        return;
    }

    const setActiveButton = (btn) => {
        [showAllBtn, favoritesBtn, useCodeBtn].forEach(b => b?.classList.remove('active'));
        btn?.classList.add('active');
    };

    const toggleKeyInput = (shouldShow) => {
        if (!keyInput) return;
        keyInput.hidden = !shouldShow;
        if (shouldShow) {
            keyInput.focus();
        }
    };

    const refreshEntries = async () => {
        if (currentMode === 'code') {
            if (!key) {
                const container = getEntriesContainer();
                if (container) container.innerHTML = '<p class="glow">Enter a code to see shared entry.</p>';
                return;
            }
            const entries = await getKeyEntries();
            await displayEntries(entries);
            return;
        }

        if (currentMode === 'favorites') {
            const entries = await getPublicEntries();
            await displayEntries(entries);
            return;
        }

        const entries = await getPublicEntries();
        await displayEntries(entries);
    };

    showAllBtn.addEventListener('click', async () => {
        currentMode = 'all';
        toggleKeyInput(false);
        setActiveButton(showAllBtn);
        await refreshEntries();
    });

    favoritesBtn.addEventListener('click', async () => {
        currentMode = 'favorites';
        toggleKeyInput(false);
        setActiveButton(favoritesBtn);
        await refreshEntries();
    });

    useCodeBtn.addEventListener('click', async () => {
        if (currentMode === 'code') {
            currentMode = 'all';
            toggleKeyInput(false);
            setActiveButton(showAllBtn);
        } else {
            currentMode = 'code';
            toggleKeyInput(true);
            setActiveButton(useCodeBtn);
        }
        await refreshEntries();
    });

    keyInput?.addEventListener('input', async (event) => {
        key = event.target.value.trim();
        if (currentMode === 'code') {
            await refreshEntries();
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    console.log('Shared entries script loaded');

    if (!getEntriesContainer()) return;

    if (showAllBtn) {
        showAllBtn.classList.add('active');
    }

    const entries = await getPublicEntries();
    await displayEntries(entries);

    initializeFilters();
});