const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

console.log("Total features:", data.features.length);

const nonIso = [];
const allIds = [];

data.features.forEach(f => {
    allIds.push(f.id);
    if (!f.id || typeof f.id !== 'string' || f.id.length !== 3 || !/^[A-Z0-9]{3}$/.test(f.id)) {
        nonIso.push({ id: f.id, name: f.properties ? f.properties.name : 'N/A' });
    }
});

console.log(`Found ${nonIso.length} non-ISO IDs out of ${data.features.length} total features.`);
console.log("Non-ISO Features sample:", nonIso.slice(0, 50));
console.log("Let's see if 'rupert' or 'spain' matches any substring of any ID:");
const matched = allIds.filter(id => String(id).toLowerCase().includes('rupert') || String(id).toLowerCase().includes('spain'));
console.log("Matched IDs:", matched);
