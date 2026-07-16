const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

data.features.forEach((f, idx) => {
    console.log(`[${idx}] ID: "${f.id}", Name: "${f.properties.name}"`);
});
