console.log('[entry-logger] loaded at', new Date().toISOString());
const entryButton = document.querySelector('#submit-button');
const entryTextarea = document.getElementById('entry');
const titleInput = document.querySelector('.entry-input input[type="text"]');
const moodInput = document.getElementById('mood');
const USER = 'Lori';
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

entryButton.addEventListener('click', function() {
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
    entryButton.innerText = 'Submitted!';

    fetch('/api/log-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: USER, date, time, title, content, mood: moodValue })
    })
    .then(res => res.json())
    .then(data => {
        entryTextarea.value = '';
        titleInput.value = '';
        moodInput.value = '';
        setTimeout(() => {
            entryButton.disabled = false;
            entryButton.innerText = 'Submit';
        }, 2000);
    })
    .catch(err => {
        alert('Error logging entry');
        entryButton.disabled = false;
        entryButton.innerText = 'Submit';
    });
});