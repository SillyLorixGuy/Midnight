import { getCurrentUser, supabase } from './supabaseClient.js';

console.log('[entry-logger] loaded at', new Date().toISOString());
const entryButton = document.querySelector('#submit-button');
const entryTextarea = document.getElementById('entry');
const titleInput = document.querySelector('.entry-input input[type="text"]');
const moodInput = document.getElementById('mood');
const currentRadio = document.getElementById('current-day');
const pastRadio = document.getElementById('past-day');
const dayInput = document.getElementById('entry-date-day');
const monthInput = document.getElementById('entry-date-month');
const yearInput = document.getElementById('entry-date-year');
const errorMsg = document.querySelector('.error');

// Limit input values for day/month/year
dayInput.setAttribute('min', '1');
dayInput.setAttribute('max', '31');
monthInput.setAttribute('min', '1');
monthInput.setAttribute('max', '12');
yearInput.setAttribute('min', '1900');
yearInput.setAttribute('max', new Date().getFullYear());

function isValidDate(year, month, day) {
    const d = new Date(year, month - 1, day);
    return d.getFullYear() == year && (d.getMonth() + 1) == month && d.getDate() == day;
}

entryButton.addEventListener('click', async function() {
        const content = entryTextarea.value.trim();
        const title = titleInput.value.trim();
        const moodValue = parseInt(moodInput.value, 10);
        errorMsg.style.display = 'none';

        if (!content) return alert('Please enter something!');
        if (isNaN(moodValue) || moodValue < 0 || moodValue > 100) {
                errorMsg.textContent = '*ERROR - invalid mood number*';
                errorMsg.style.display = 'block';
                return;
        }

        let date, time;
        if (currentRadio.checked) {
                const now = new Date();
                date = now.toISOString().slice(0, 10); // YYYY-MM-DD
                time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'); // HH:MM
        } else if (pastRadio.checked) {
                const day = parseInt(dayInput.value, 10);
                const month = parseInt(monthInput.value, 10);
                const year = parseInt(yearInput.value, 10);
                if (
                        isNaN(day) || isNaN(month) || isNaN(year) ||
                        !isValidDate(year, month, day)
                ) {
                        errorMsg.textContent = '*ERROR - invalid date*';
                        errorMsg.style.display = 'block';
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
                // Ensure user is logged in
                const user = await getCurrentUser();
            if (!user) {
                alert('You must be logged in to submit an entry.');
                window.location.href = 'login.html';
                return;
            }

                        // Diagnostic logging to help debug RLS issues
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

            // Map UI mood (0-100) to DB mood (1-10) to satisfy the DB CHECK constraint
            const dbMood = Math.max(1, Math.min(10, Math.round(moodValue / 10) || 1));

            // Ensure time string includes seconds for TIME column (HH:MM:SS)
            const timeWithSeconds = time.includes(':') && time.split(':').length === 2 ? time + ':00' : time;

                    // Build JSON object for the `entry` JSON column in your schema
                    const entryPayload = {
                        title: title || null,
                        content,
                        mood: dbMood,
                        date,
                        time: timeWithSeconds
                    };

                    // Secure option: call a Postgres RPC that appends the new entry into the
                    // existing JSON array stored in the `entry` column for this user.
                    // This keeps one row per user and prevents clients from setting user_id.
                    // See sql/append_entry_rpc.sql for the function definition to create.

                    const { data: rpcData, error: rpcErr } = await supabase.rpc('append_entry', { _entry: entryPayload });
                    if (rpcErr) {
                        console.error('RPC insert error object:', rpcErr);
                        throw rpcErr;
                    }
                    console.log('RPC insert result:', rpcData);

            // Clear form and reset button
            entryTextarea.value = '';
            titleInput.value = '';
            moodInput.value = '';
            setTimeout(() => {
                entryButton.disabled = false;
                entryButton.innerText = 'Submit';
            }, 800);
            } catch (err) {
                console.error('Error inserting entry:', err);
                // If PostgREST returns a 403 it may be in err.status or err.statusCode or err.message
                try {
                    // If it's an object with status/text, log it
                    console.error('Detailed error (stringified):', JSON.stringify(err, Object.getOwnPropertyNames(err), 2));
                } catch (e) {
                    // ignore stringify errors
                }
                alert('Failed to save entry: ' + (err.message || JSON.stringify(err)));
            entryButton.disabled = false;
            entryButton.innerText = 'Submit';
        }
});

// Reusable helper to insert a fully-formed entry row (can be used elsewhere)
async function insertRow(entryRow) {
    if (!supabase) throw new Error('Supabase client not initialized');
    // If caller passed a plain object, assume it is the JSON entry and attach user_id if missing
    let rowToInsert = entryRow;
    if (!('user_id' in entryRow) && ('entry' in entryRow)) {
        rowToInsert = entryRow; // already has expected shape
    } else if (!('entry' in entryRow)) {
        // treat parameter as the JSON body and require caller to also pass user_id separately
        throw new Error('insertRow expects an object shaped { user_id: <uuid>, entry: <json> }');
    }

    const { error } = await supabase.from('entries').insert(rowToInsert);
    if (error) throw error;
    return true;
}

export { insertRow };