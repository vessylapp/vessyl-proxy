const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const { exec } = require('child_process');
const child_process = require("node:child_process");

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

        exec('caddy reload --config /etc/caddy/Caddyfile', (err, stdout, stderr) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to reload Caddy', details: stderr });
            }

            res.json({ message: 'Caddy configuration added and reloaded successfully' });
        });
    });
});

app.post('/get', (req, res) => {
    const configFilePath = '/etc/caddy/Caddyfile';

    fs.readFile(configFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read Caddy config file' });
        }

        res.json({ config: data });
    });
});

app.post('/delete', (req, res) => {
    const { domain } = req.body;

    if (!domain) {
        return res.status(400).json({ error: 'Domain is required' });
    }

    const configFilePath = '/etc/caddy/Caddyfile';

    fs.readFile(configFilePath, 'utf8', (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read Caddy config file' });
        }

        const lines = data.split('\n');
        const newLines = lines.filter(line => !line.includes(domain));

        fs.writeFile(configFilePath, newLines.join('\n'), (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to write Caddy config file' });
            }

            exec('caddy reload --config /etc/caddy/Caddyfile', (err, stdout, stderr) => {
                if (err) {
                    return res.status(500).json({ error: 'Failed to reload Caddy', details: stderr });
                }

                res.json({ message: 'Caddy configuration removed and reloaded successfully' });
            });
        });
    });
});

const PORT = process.env.PORT || 4040;
// app.listen(PORT, () => {
//     console.log(`Server is running on port ${PORT}`);
// });

// read /etc/caddy/Caddyfile and send it to the client

const MongoClient = require('mongodb').MongoClient;
require('dotenv').config();

let uri = process.env.MONGODB_URI;
if (!uri) uri = 'mongodb://vdb:27017';
const client = new MongoClient(uri);

async function startCaddy() {
    try {
        await client.connect();
        console.log('Connected to MongoDB');
        const resources = client.db('vessyl').collection('resources');
        const allResources = await resources.find({}).toArray();
        let config = [];
        allResources.forEach(resource => {
            config.push({
                domain: resource.domain,
                port: resource.ports[0].split(':')[0]
            });
        });

        let gateway = '';

        try {
            gateway = child_process.execSync("ip route | grep default | awk '{print $3}'").toString().trim();
        } catch (e) {
            console.error('Failed to get gateway IP');
        }

        // write to /etc/caddy/Caddyfile
        let caddyConfig = `
        http:// {
            respond "VSYL-001 Resource not found" 404
        }
        
        https:// {
            respond "VSYL-001 Resource not found" 404
        }
        `
        config.forEach(resource => {
            let resourceConfig = `
            ${resource.domain} {
                reverse_proxy ${gateway}:${resource.port}
            
                handle_errors {
                    @proxy_failed {
                        expression {http.error.status_code} == 502 || {http.error.status_code} == 503 || {http.error.status_code} == 504
                    }
                    respond @proxy_failed "VSYL-002 Resource unavailable" 503
                }
            }
            `;
            resourceConfig = resourceConfig.trim();
            caddyConfig += resourceConfig + '\n';
        });

        const configFilePath = '/etc/caddy/Caddyfile';
        fs.writeFile(configFilePath, caddyConfig, (err) => {
            if (err) {
                console.error('Failed to write Caddy config file');
            }

            exec('caddy run --config /etc/caddy/Caddyfile', (err, stdout, stderr) => {
                if (err) {
                    console.error('Failed to reload Caddy', stderr);
                }

                console.log('Caddy configuration added and reloaded successfully');
            });
        });
    } catch (e) {
        console.error(e);
    }
}

startCaddy();

process.on('SIGTERM', () => {
    console.log('Received SIGTERM. Shutting down gracefully...');

    process.exit(0);
});