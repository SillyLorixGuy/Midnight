    // Script to load and display entries in profile.html
// Uses the template in <section class="entries"> and fills with data from log.json

async function fetchJSON(path) {
    const res = await fetch(path);
    return await res.json();
}

async function imageExists(url) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(true);
        img.onerror = () => resolve(false);
        img.src = url;
    });
}

async function resolvePfp() {
    try {
        const data = await fetchJSON('entries/user-info.json');
        const user = (data && data.users && data.users[0]) || null;
        let pfp = user && (user['pfp-src'] || user.pfp) ? (user['pfp-src'] || user.pfp).replace(/\\/g, '/') : '';
        const candidates = [];
        if (pfp) {
            candidates.push(pfp);
            candidates.push(pfp.replace(/^\.\//, ''));
            candidates.push('/' + pfp.replace(/^\//, ''));
            const filename = pfp.split('/').pop();
            if (filename) candidates.push(filename);
        }
        candidates.push('pfps/temp-pfp.png');
        candidates.push('temp-pfp.png');

        for (const c of candidates) {
            if (!c) continue;
            // eslint-disable-next-line no-await-in-loop
            if (await imageExists(c)) return c;
        }
    } catch (err) {
        console.warn('resolvePfp error', err);
    }
    return 'pfps/temp-pfp.png';
}

function formatDate(date, time) {
    // date: YYYY-MM-DD, time: HH:MM
    const [year, month, day] = date.split('-');
    return `${day}.${month}.${year} - ${time}`;
}

function createEntryElement(entry, pfpSrc) {
    // Use the template from profile.html
    const article = document.createElement('article');
    article.className = 'entry';
        article.innerHTML = `
            <div class="entry-top">
                <div class="entry-user">
                    <img src="${pfpSrc}" alt="">
                    <span class="entry-user-name">${entry.user}</span>
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
    const log = await fetchJSON('entries/log.json');
    const userEntries = log.entries.filter(e => e.user === userName);
    entriesSection.innerHTML = '';
    const pfp = await resolvePfp();
    userEntries.reverse().forEach(entry => {
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
        // force reflow so the class addition animates
        // eslint-disable-next-line no-unused-expressions
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
