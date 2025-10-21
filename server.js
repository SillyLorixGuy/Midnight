const express = require('express');
const fs = require('fs');
const path = require('path');
const os = require('os');
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

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
    // Find non-internal IPv4 addresses to show useful LAN URLs
    const ifaces = os.networkInterfaces();
    const addrs = [];
    Object.values(ifaces).forEach(list => {
        list.forEach(i => {
            if (i.family === 'IPv4' && !i.internal) addrs.push(i.address);
        });
    });

    console.log(`Server running on http://${HOST}:${PORT}`);
    if (addrs.length) {
        addrs.forEach(a => console.log(`Accessible on LAN: http://${a}:${PORT}`));
    } else {
        console.log('No non-internal IPv4 addresses found. If you cannot connect from your phone, check Windows firewall and ensure both devices are on the same network.');
    }
});
