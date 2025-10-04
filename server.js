const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());

const LOG_PATH = path.join(__dirname, 'entries', 'log.json');

app.post('/api/log-entry', (req, res) => {
    const { user, date, time, title, content, mood } = req.body;
    fs.readFile(LOG_PATH, 'utf8', (err, data) => {
        if (err) return res.status(500).send('Read error');
        let log = JSON.parse(data);
        log.entries.push({ user, date, time, title, content, mood });
        fs.writeFile(LOG_PATH, JSON.stringify(log, null, 2), err => {
            if (err) return res.status(500).send('Write error');
            res.json({ success: true });
        });
    });
});

app.use(express.static(__dirname)); // Serve your HTML/CSS/JS

app.listen(3000, () => console.log('Server running on http://localhost:3000'));