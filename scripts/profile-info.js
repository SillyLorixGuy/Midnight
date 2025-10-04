// Script to manage and display user info in profile.html
// Reads user-info.json and log.json, calculates stats, and updates .info

async function fetchJSON(path) {
    const res = await fetch(path);
    return await res.json();
}

function calculateMentalScore(entries, userName) {
    const userEntries = entries.filter(e => e.user === userName && typeof e.mood === 'number');
    if (userEntries.length === 0) return 0;
    const sum = userEntries.reduce((acc, e) => acc + e.mood, 0);
    return Math.round(sum / userEntries.length);
}

function calculateStreak(entries, userName) {
    // Sort entries by date descending
    const userEntries = entries.filter(e => e.user === userName).sort((a, b) => b.date.localeCompare(a.date));
    if (userEntries.length === 0) return 0;
    let streak = 1;
    let prevDate = new Date(userEntries[0].date);
    for (let i = 1; i < userEntries.length; i++) {
        let currDate = new Date(userEntries[i].date);
        let diff = (prevDate - currDate) / (1000 * 60 * 60 * 24);
        if (diff === 1) {
            streak++;
            prevDate = currDate;
        } else {
            break;
        }
    }
    return streak;
}

async function updateUserInfo(userName) {
    const infoDiv = document.querySelector('.info');
    const log = await fetchJSON('entries/log.json');
    const userInfo = await fetchJSON('entries/user-info.json');
    const user = userInfo.users.find(u => u.name === userName);
    const entries = log.entries.filter(e => e.user === userName);
    const mentalScore = calculateMentalScore(log.entries, userName);
    const entryCount = entries.length;
    const streak = calculateStreak(entries, userName);

    // Fill numbers into each div in .info
    const infoDivs = infoDiv.querySelectorAll('div');
    // Calculate best streak and days missed
    let bestStreak = 0;
    let daysMissed = 0;
    // Best streak: longest consecutive streak
    if (entries.length > 0) {
        let sorted = entries.map(e => e.date).sort().reverse();
        let streak = 1, maxStreak = 1;
        let prevDate = new Date(sorted[0]);
        for (let i = 1; i < sorted.length; i++) {
            let currDate = new Date(sorted[i]);
            let diff = (prevDate - currDate) / (1000 * 60 * 60 * 24);
            if (diff === 1) {
                streak++;
                maxStreak = Math.max(maxStreak, streak);
            } else {
                streak = 1;
            }
            prevDate = currDate;
        }
        bestStreak = maxStreak;
        // Days missed: days between first and last entry minus entries
        let first = new Date(sorted[sorted.length - 1]);
        let last = new Date(sorted[0]);
        let totalDays = Math.round((last - first) / (1000 * 60 * 60 * 24)) + 1;
        daysMissed = totalDays - entries.length;
    }
    // Fill each div in order
    if (infoDivs[0]) infoDivs[0].innerHTML = `<p class="glow70">Mental Score:</p> <span>${mentalScore}</span>`;
    if (infoDivs[1]) infoDivs[1].innerHTML = `<p class="glow70">Total Entries:</p> <span>${entryCount}</span>`;
    if (infoDivs[2]) infoDivs[2].innerHTML = `<p class="glow70">Current Streak:</p> <span>${streak}</span>`;
    if (infoDivs[3]) infoDivs[3].innerHTML = `<p class="glow70">Best Streak:</p> <span>${bestStreak}</span>`;
    if (infoDivs[4]) infoDivs[4].innerHTML = `<p class="glow70">Days Missed:</p> <span>${daysMissed}</span>`;
    
        // Update user-info.json for this user
        if (user) {
            user.info.mentalScore = mentalScore;
            user.info.entries = entryCount;
            user.info.streak = streak;
            user.info.bestStreak = bestStreak;
            user.info.daysMissed = daysMissed;
            // Send update to backend
            fetch('entries/user-info.json', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(userInfo, null, 2)
            });
        }
}

// Call this with the current username
updateUserInfo('Lori');
