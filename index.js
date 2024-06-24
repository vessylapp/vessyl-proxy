const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');

const app = express();
app.use(bodyParser.json());

app.post('/new', (req, res) => {
    const { domain, port } = req.body;

    if (!domain || !port) {
        return res.status(400).json({ error: 'Domain and port are required' });
    }

    const caddyConfig = `
${domain} {
    reverse_proxy localhost:${port}
}
`;

    console.log(caddyConfig);

    const configFilePath = '/etc/caddy/Caddyfile';

    fs.appendFile(configFilePath, caddyConfig, (err) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to write Caddy config file' });
        }

        exec('sudo caddy reload --config /etc/caddy/Caddyfile', (err, stdout, stderr) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to reload Caddy', details: stderr });
            }

            res.json({ message: 'Caddy configuration added and reloaded successfully' });
        });
    });
});

const PORT = process.env.PORT || 4040;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});