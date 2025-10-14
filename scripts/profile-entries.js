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
        <div class="profile"><img src="${pfpSrc}" alt=""> <p class="glow70">${entry.user}</p></div>
        <section class="entry-content"><p class="glow70 title">${entry.title.toUpperCase()}</p><p>${entry.content}</p></section>
        <div class="entry-details"><p>${formatDate(entry.date, entry.time)}</p></div>
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
}

// Call this with the current username
loadEntries('Lori');
