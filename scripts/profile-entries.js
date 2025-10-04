// Script to load and display entries in profile.html
// Uses the template in <section class="entries"> and fills with data from log.json

async function fetchJSON(path) {
    const res = await fetch(path);
    return await res.json();
}

function formatDate(date, time) {
    // date: YYYY-MM-DD, time: HH:MM
    const [year, month, day] = date.split('-');
    return `${day}.${month}.${year} - ${time}`;
}

function createEntryElement(entry) {
    // Use the template from profile.html
    const article = document.createElement('article');
    article.className = 'entry';
    article.innerHTML = `
        <div class="profile"><img src="temp-pfp.png" alt=""> <p class="glow70">${entry.user}</p></div>
        <section class="entry-content"><p>${entry.content}</p></section>
        <div class="entry-details"><p>${formatDate(entry.date, entry.time)}</p></div>
    `;
    return article;
}

async function loadEntries(userName) {
    const entriesSection = document.querySelector('.entries');
    const log = await fetchJSON('entries/log.json');
    const userEntries = log.entries.filter(e => e.user === userName);
    entriesSection.innerHTML = '';
    userEntries.reverse().forEach(entry => {
        entriesSection.appendChild(createEntryElement(entry));
    });
}

// Call this with the current username
loadEntries('Lori');
