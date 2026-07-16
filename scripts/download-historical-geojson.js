/**
 * download-historical-geojson.js
 * Downloads real historical boundary GeoJSON files from aourednik/historical-basemaps
 * and saves them to the appropriate era directories in src/data/.
 */

const https = require('https');
const fs    = require('fs');
const path  = require('path');

const BASE_URL = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson';

const ERA_FILES = [
    {
        era:     'civilizations',
        remote:  'world_bc3000.geojson',
        local:   'src/data/civilizations/world-civilizations.geojson',
        label:   'Civilizações (3000 a.C.)',
    },
    {
        era:     'rome',
        remote:  'world_100.geojson',
        local:   'src/data/rome/world-rome.geojson',
        label:   'Império Romano (100 d.C.)',
    },
    {
        era:     'medieval',
        remote:  'world_1000.geojson',
        local:   'src/data/medieval/world-medieval.geojson',
        label:   'Idade Média (1000 d.C.)',
    },
    {
        era:     'worldwars',
        remote:  'world_1914.geojson',
        local:   'src/data/worldwars/world-worldwars.geojson',
        label:   'Guerras Mundiais (1914 d.C.)',
    },
];

function slugify(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const dir = path.dirname(destPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
            if (response.statusCode === 301 || response.statusCode === 302) {
                file.close();
                return downloadFile(response.headers.location, destPath).then(resolve).catch(reject);
            }
            if (response.statusCode !== 200) {
                file.close();
                fs.unlinkSync(destPath);
                return reject(new Error(`HTTP ${response.statusCode} for ${url}`));
            }

            let received = 0;
            response.on('data', (chunk) => {
                received += chunk.length;
                process.stdout.write(`\r  ${(received / 1024).toFixed(0)} KB recebidos...`);
            });

            response.pipe(file);
            file.on('finish', () => {
                file.close();
                process.stdout.write('\n');
                resolve(destPath);
            });
            file.on('error', (err) => {
                fs.unlinkSync(destPath);
                reject(err);
            });
        }).on('error', reject);
    });
}

function processGeoJSON(filePath, era) {
    console.log(`  Processando features de ${filePath}...`);
    const raw  = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);

    const names = new Set();
    let processed = 0;

    data.features = data.features.map(feature => {
        const name = feature.properties && (
            feature.properties.NAME ||
            feature.properties.name ||
            feature.properties.ADMIN ||
            feature.properties.Entity ||
            feature.properties.entity ||
            ''
        );

        const slug = slugify(name) || `feature_${processed}`;
        // Guarantee unique IDs by appending counter if collision
        let finalId = slug;
        let counter = 2;
        while (names.has(finalId)) {
            finalId = `${slug}_${counter++}`;
        }
        names.add(finalId);

        feature.id = finalId;
        if (!feature.properties) feature.properties = {};
        feature.properties.era       = era;
        feature.properties.entityId  = finalId;
        feature.properties.name      = name || finalId;

        processed++;
        return feature;
    });

    fs.writeFileSync(filePath, JSON.stringify(data), 'utf8');
    console.log(`  ✔ ${processed} features processadas. IDs normalizados.`);

    // Print the list of entity names for faction mapping
    const entityList = [...names].sort();
    console.log(`  Entidades encontradas (${entityList.length}):`);
    entityList.forEach(e => console.log(`    - ${e}`));
    return entityList;
}

async function main() {
    console.log('=== Download de GeoJSON Histórico ===\n');

    for (const item of ERA_FILES) {
        console.log(`📥 [${item.label}]`);
        const url = `${BASE_URL}/${item.remote}`;
        console.log(`  URL: ${url}`);
        console.log(`  Destino: ${item.local}`);

        try {
            await downloadFile(url, item.local);
            console.log(`  ✔ Download concluído.`);

            const entities = processGeoJSON(item.local, item.era);
            // Save entity list for inspection
            const listPath = item.local.replace('.geojson', '-entities.txt');
            fs.writeFileSync(listPath, entities.join('\n'), 'utf8');
            console.log(`  📋 Lista de entidades salva em: ${listPath}\n`);
        } catch (err) {
            console.error(`  ✗ Erro: ${err.message}\n`);
        }
    }

    console.log('=== Concluído! ===');
    console.log('Verifique os arquivos -entities.txt para construir os faction maps.');
}

main();
