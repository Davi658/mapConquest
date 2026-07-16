const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const keywords = ['chilcotin', 'kutenai', 'esquim', 'tatsaot', 't\'atsaot\'ine'];

data.features.forEach((f, idx) => {
    const fStr = JSON.stringify(f).toLowerCase();
    keywords.forEach(kw => {
        if (fStr.includes(kw)) {
            console.log(`Match for "${kw}" in feature [${idx}]:`);
            console.log(`  ID: "${f.id}"`);
            console.log(`  Properties:`, f.properties);
        }
    });
});
