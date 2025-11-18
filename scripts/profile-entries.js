import { supabase } from './supabaseClient.js'; 

const { data } = await supabase.from('entries')
    .select ("*")
console.log('Entries data from Supabase:', data);

function createEntryElement(entry, pfpSrc) {
    // Use the template from profile.html
    const article = document.createElement('article');
    article.className = 'entry';
        article.innerHTML = `
            <div class="entry-top">
                <div class="entry-user">
                    <img src="${pfpSrc}" alt="">
                    <span class="glow70 entry-user-name">${entry.user}</span>
                </div>
                <div class="entry-footer-placeholder"></div>
            </div>
            <div class="entry-title-wrap">
                <button class="toggle-entry glow70" aria-expanded="false">${entry.title.toUpperCase()}</button>
            </div>
            <section class="entry-content" hidden>
                <p>${entry.content}</p>
            </section>
            <div class="entry-footer">
                <span class="entry-date">${formatDate(entry.date, entry.time)}</span>
            </div>
        `;
    return article;
}

async function loadEntries(userName) {
    const entriesSection = document.querySelector('.entries');
    const userEntries = log.entries.filter(e => e.user === userName);
    entriesSection.innerHTML = '';
    userEntries.forEach(entry => {
        entriesSection.appendChild(createEntryElement(entry, pfp));
    });

    // Attach toggle handlers
    // Class-based toggle that relies on CSS .expanded to animate.
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
        content.offsetHeight;
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
            if (now - lastToggle < 60) return; // ignore very quick repeated clicks
            lastToggle = now;
            const content = btn.closest('.entry').querySelector('.entry-content');
            if (!content) return;
            toggleCollapse(btn, content);
        });
    });
}

// Call this with the current username
loadEntries('Lori');
