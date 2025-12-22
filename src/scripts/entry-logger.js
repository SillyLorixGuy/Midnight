import { getCurrentUser, supabase } from './supabaseClient.js';

console.log('[entry-logger] loaded at', new Date().toISOString());
const entryButton = document.getElementById('submit-entry-btn');
const entryTextarea = document.getElementById('entry');
const titleInput = document.getElementById('title');
const moodInput = document.getElementById('mood-input');
const currentRadio = document.getElementById('current-date');
const pastRadio = document.getElementById('past-date');
const dayInput = document.getElementById('date-DD');
const monthInput = document.getElementById('date-MM');
const yearInput = document.getElementById('date-YYYY');
const errorMsg = document.querySelector('.error');

function showError(message) {
    if (errorMsg) 
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    } 



function isValidDate(year, month, day) {
    const d = new Date(year, month - 1, day);
    return d.getFullYear() == year && (d.getMonth() + 1) == month && d.getDate() == day;
}

if (!entryButton) {
    console.error('[entry-logger] submit button (#submit-entry-btn) not found');
}

entryButton?.addEventListener('click', async function() {
        const content = entryTextarea.value.trim();
    const title = titleInput ? titleInput.value.trim() : '';
    const moodValue = parseInt(moodInput?.value ?? '', 10);
    if (errorMsg) errorMsg.style.display = 'none';

        if (!content) return alert('Please enter something!');
        if (isNaN(moodValue) || moodValue < 0 || moodValue > 100) {
        showError('*ERROR - invalid mood number*');
                return;
        }

        let date, time;
        if (currentRadio?.checked) {
                const now = new Date();
                date = now.toISOString().slice(0, 10);
                time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0');
        } else if (pastRadio?.checked) {
            const day = parseInt(dayInput?.value ?? '', 10);
            const month = parseInt(monthInput?.value ?? '', 10);
            const year = parseInt(yearInput?.value ?? '', 10);
                if (
                        isNaN(day) || isNaN(month) || isNaN(year) ||
                        !isValidDate(year, month, day)
                ) {
                showError('*ERROR - invalid date*');
                        return;
                }
                date = year.toString().padStart(4, '0') + '-' + month.toString().padStart(2, '0') + '-' + day.toString().padStart(2, '0');
                time = '00:00';
        } else {
                alert('Please select a date option.');
                return;
        }

        entryButton.disabled = true;
        entryButton.innerText = 'Submitting...';

                try {
                const user = await getCurrentUser();
            if (!user) {
                alert('You must be logged in to submit an entry.');
                window.location.href = 'login.html';
                return;
            }

                        try {
                            const sessionResp = await supabase.auth.getSession();
                            console.log('supabase auth.getSession() response:', sessionResp);
                        } catch (e) {
                            console.warn('Could not get supabase session:', e);
                        }
                        try {
                            const userResp = await supabase.auth.getUser();
                            console.log('supabase auth.getUser() response:', userResp);
                        } catch (e) {
                            console.warn('Could not get supabase user:', e);
                        }
                        console.log('current user id (from getCurrentUser):', user.id, 'type:', typeof user.id);

            const dbMood = Math.max(1, Math.min(10, Math.round(moodValue / 10) || 1));

            const timeWithSeconds = time.includes(':') && time.split(':').length === 2 ? time + ':00' : time;

                    const row = {
                        user_id: user.id,
                        title: title || null,
                        content: [{ content }],
                        mood: dbMood
                    };

                    const { data: insertData, error: insertErr } = await supabase
                        .from('entries')
                        .insert(row)
                        .select('id')
                        .single();

                    if (insertErr) {
                        console.error('Insert error object:', insertErr);
                        throw insertErr;
                    }
                    console.log('Inserted entry id:', insertData?.id);

            if (entryTextarea) entryTextarea.value = '';
            if (titleInput) titleInput.value = '';
            if (moodInput) moodInput.value = '';
            setTimeout(() => {
                if (entryButton) {
                    entryButton.disabled = false;
                    entryButton.innerText = 'Submit';
                }
            }, 800);
            } catch (err) {
                console.error('Error inserting entry:', err);
                try {
                    console.error('Detailed error (stringified):', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
                } catch (e) {
                }
                alert('Failed to save entry: ' + (err.message || JSON.stringify(err)));
            if (entryButton) {
                entryButton.disabled = false;
                entryButton.innerText = 'Submit';
            }
        }
});

async function insertRow(entryRow) {
    if (!supabase) throw new Error('Supabase client not initialized');
    let rowToInsert = entryRow;
    if (!('user_id' in entryRow) && ('entry' in entryRow)) {
        rowToInsert = entryRow;
    } else if (!('entry' in entryRow)) {
        throw new Error('insertRow expects an object shaped { user_id: <uuid>, entry: <json> }');
    }

    const { error } = await supabase.from('entries').insert(rowToInsert);
    if (error) throw error;
    return true;
}

export { insertRow };