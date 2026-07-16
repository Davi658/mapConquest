const fs = require('fs');
const path = require('path');

function slugify(str) {
    return String(str || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const names = new Set();
let processed = 0;
const generatedIds = [];

data.features.forEach(feature => {
    const name = feature.properties && (
        feature.properties.NAME ||
        feature.properties.name ||
        feature.properties.ADMIN ||
        feature.properties.Entity ||
        feature.properties.entity ||
        ''
    );

    const slug = slugify(name) || `feature_${processed}`;
    let finalId = slug;
    let counter = 2;
    while (names.has(finalId)) {
        finalId = `${slug}_${counter++}`;
    }
    names.add(finalId);
    generatedIds.push(finalId);
    processed++;
});

// Sort to compare with world-napoleonic-entities.txt
const sortedGenerated = [...generatedIds].sort();

const entitiesPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic-entities.txt');
const expectedEntities = fs.readFileSync(entitiesPath, 'utf8').split('\n').map(l => l.trim()).filter(Boolean);

console.log(`Generated IDs count: ${sortedGenerated.length}`);
console.log(`Expected IDs count: ${expectedEntities.length}`);

let mismatches = 0;
for (let i = 0; i < Math.max(sortedGenerated.length, expectedEntities.length); i++) {
    if (sortedGenerated[i] !== expectedEntities[i]) {
        console.log(`Mismatch at index ${i}: Generated "${sortedGenerated[i]}" vs Expected "${expectedEntities[i]}"`);
        mismatches++;
        if (mismatches > 10) {
            console.log("Too many mismatches, stopping...");
            break;
        }
    }
}

if (mismatches === 0) {
    console.log("Success! The generated IDs match the expected entities exactly!");
}
