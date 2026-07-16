/**
 * Map Conquest - Local Dev Server
 * Run: node server.js
 * Then open: http://localhost:3000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3030;
const ROOT = __dirname;

const MIME_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.geojson': 'application/json; charset=utf-8',
    '.jpg':  'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png':  'image/png',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
    // Add CORS headers to support Live Server or file:// page access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Normalize URL — default to index.html
    let urlPath = req.url.split('?')[0];
    if (urlPath === '/') urlPath = '/index.html';

    // Handle API endpoint to save GeoJSON files
    if (req.method === 'POST' && urlPath === '/api/save-geojson') {
        let body = '';
        req.on('data', chunk => {
            body += chunk.toString();
        });
        req.on('end', () => {
            try {
                const payload = JSON.parse(body);
                const { filePath: targetPath, content } = payload;
                if (!targetPath) {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Caminho do arquivo não fornecido' }));
                    return;
                }
                const fullPath = path.join(ROOT, targetPath);
                // Security: prevent directory traversal
                if (!fullPath.startsWith(ROOT)) {
                    res.writeHead(403, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Acesso Proibido' }));
                    return;
                }
                // Format the FeatureCollection using our custom formatter
                const { formatFeatureCollection } = require('./scripts/format-geojson.js');
                let formattedContent;
                try {
                    formattedContent = formatFeatureCollection(content);
                } catch (e) {
                    console.error("Formatting failed, falling back to standard stringify:", e);
                    formattedContent = JSON.stringify(content, null, 2);
                }

                // Backup the existing file first if it exists
                if (fs.existsSync(fullPath)) {
                    try {
                        fs.copyFileSync(fullPath, `${fullPath}.bak`);
                    } catch (backupErr) {
                        console.error("Failed to create backup file:", backupErr);
                    }
                }

                fs.writeFile(fullPath, formattedContent, 'utf8', (err) => {
                    if (err) {
                        res.writeHead(500, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ error: 'Erro ao salvar o arquivo: ' + err.message }));
                    } else {
                        // Automatically update split features files if features directory exists
                        const featuresDir = path.join(path.dirname(fullPath), 'features');
                        if (fs.existsSync(featuresDir)) {
                            try {
                                const { exec } = require('child_process');
                                exec(`node scripts/split-geojson.js "${fullPath}"`, (splitErr) => {
                                    if (splitErr) {
                                        console.error("Error splitting files after save:", splitErr);
                                    } else {
                                        console.log("Successfully split features folder after saving.");
                                    }
                                });
                            } catch (splitException) {
                                console.error("Error executing split script:", splitException);
                            }
                        }

                        res.writeHead(200, { 'Content-Type': 'application/json' });
                        res.end(JSON.stringify({ success: true, message: 'Arquivo salvo com sucesso!' }));
                    }
                });
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Dados JSON inválidos: ' + e.message }));
            }
        });
        return;
    }

    const filePath = path.join(ROOT, urlPath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(ROOT)) {
        res.writeHead(403);
        res.end('Forbidden');
        return;
    }

    fs.readFile(filePath, (err, data) => {
        if (err) {
            if (err.code === 'ENOENT') {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end(`404 - Arquivo não encontrado: ${urlPath}`);
            } else {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('500 - Erro interno do servidor');
            }
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

        res.writeHead(200, {
            'Content-Type': mimeType,
            'Cache-Control': 'no-cache'
        });
        res.end(data);
    });
});

server.listen(PORT, () => {
    console.log('');
    console.log('  ⚔️  Map Conquest - Servidor Local');
    console.log('  ─────────────────────────────────');
    console.log(`  🌐  Abra no navegador: http://localhost:${PORT}`);
    console.log('');
    console.log('  Para parar o servidor: Ctrl+C');
    console.log('');
});
