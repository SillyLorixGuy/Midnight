const entryButton = document.querySelector('button');
const entryTextarea = document.getElementById('entry');
const USER = 'Lori';

entryButton.addEventListener('click', function() {
    const content = entryTextarea.value.trim();
    if (!content) return alert('Please enter something!');
    const now = new Date();
    const date = now.toISOString().slice(0, 10); // YYYY-MM-DD
    const time = now.getHours().toString().padStart(2, '0') + ':' + now.getMinutes().toString().padStart(2, '0'); // HH:MM

    entryButton.disabled = true;
    entryButton.innerText = 'Submitted!';

    fetch('/api/log-entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user: USER, date, time, content })
    })
    .then(res => res.json())
    .then(data => {
        entryTextarea.value = '';
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