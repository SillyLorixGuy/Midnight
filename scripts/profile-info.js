import { supabase, getCurrentUser } from './supabaseClient.js';
const usernameElem = document.querySelector('.username');
const pfpElem = document.getElementById('profile-pfp');
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

// Call inside an async IIFE to use await
(async () => {
  const profile = await getUserProfile();
  console.log(profile.pfp_url);
  console.log('User profile data from Supabase:', profile);
})();


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

}


addEventListener('DOMContentLoaded', async () => {
    const profile = await getUserProfile();
    if (profile) {
        loadUserProfile(profile);
    }  
});


//function calculateMentalScore(entries, userName) {
//    const userEntries = entries.filter(e => e.user === userName && typeof e.mood === 'number');
//    if (userEntries.length === 0) return 0;
//    const sum = userEntries.reduce((acc, e) => acc + e.mood, 0);
//    return Math.round(sum / userEntries.length);
//}
//
//async function updateUserInfo(userName) {
//    try {
//        const infoDiv = document.querySelector('.info');
//        const log = await fetchJSON('/entries/log.json');
//        const userInfo = await fetchJSON('/entries/user-info.json');
//    const user = userInfo.users.find(u => u.name === userName);
//    const entries = log.entries.filter(e => e.user === userName);
//    const mentalScore = calculateMentalScore(log.entries, userName);
//    const entryCount = entries.length;
//    const streak = calculateStreak(entries, userName);
//
//    // Fill numbers into each div in .info
//    const infoDivs = infoDiv.querySelectorAll('div');
//    // Calculate best streak and days missed
//    let bestStreak = 0;
//    let daysMissed = 0;
//    // Best streak: longest consecutive streak
//    if (entries.length > 0) {
//        let sorted = entries.map(e => e.date).sort().reverse();
//        let streak = 1, maxStreak = 1;
//        let prevDate = new Date(sorted[0]);
//        for (let i = 1; i < sorted.length; i++) {
//            let currDate = new Date(sorted[i]);
//            let diff = (prevDate - currDate) / (1000 * 60 * 60 * 24);
//            if (Math.round(diff) === 1) {
//                streak++;
//                maxStreak = Math.max(maxStreak, streak);
//            } else {
//                streak = 1;
//            }
//            prevDate = currDate;
//        }
//        bestStreak = maxStreak;
//        // Days missed: days between first and last entry minus entries
//        let first = new Date(sorted[sorted.length - 1]);
//        let last = new Date(sorted[0]);
//        let totalDays = Math.round((last - first) / (1000 * 60 * 60 * 24)) + 1;
//        daysMissed = totalDays - entries.length;
//    }
//    // Fill each div in order
//    if (infoDivs[0]) infoDivs[0].innerHTML = `<p class="glow70">Mental </p> <p>Score:</p> <span style="align-self: center;">${mentalScore}</span>`;
//    if (infoDivs[1]) infoDivs[1].innerHTML = `<p class="glow70">Total </p> <p>Entries:</p> <span style="align-self: center;">${entryCount}</span>`;
//    if (infoDivs[2]) infoDivs[2].innerHTML = `<p class="glow70">Current </p> <p>Streak:</p> <span style="align-self: center;">${streak}</span>`;
//    if (infoDivs[3]) infoDivs[3].innerHTML = `<p class="glow70">Best </p> <p>Streak:</p> <span style="align-self: center;">${bestStreak}</span>`;
//    if (infoDivs[4]) infoDivs[4].innerHTML = `<p class="glow70">Days </p> <p>Missed:</p> <span style="align-self: center;">${daysMissed}</span>`;
//    
//        // Update user-info.json for this user
//        // Update local in-memory user-info (do not attempt to write to static JSON from client)
//        if (user) {
//            user.info = user.info || {};
//            user.info.mentalScore = mentalScore;
//            user.info.entries = entryCount;
//            user.info.streak = streak;
//            user.info.bestStreak = bestStreak;
//            user.info.daysMissed = daysMissed;
//        }
//    } catch (err) {
//        console.error('updateUserInfo error', err);
//    }
//}
//
//// Call this with the current username
//updateUserInfo('Lori');//
