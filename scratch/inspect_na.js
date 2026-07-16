const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

console.log("Total features:", data.features.length);
if (data.features.length > 0) {
    console.log("Sample feature fields:", Object.keys(data.features[0]));
    console.log("Sample feature properties:", data.features[0].properties);
    console.log("Sample feature id:", data.features[0].id);
}

// Let's look for features that might be in North America or have specific names/IDs
const naKeywords = [
    'spain', 'united_states', 'united_kingdom', 'canada', 'quebec', 'rupert', 'louisiana', 'luisiana', 
    'florida', 'cuba', 'haiti', 'bahamas', 'bermuda', 'antigua', 't_atsaot_ine', 'esquim', 'inuit', 'chilcotin', 'kutenai'
];

console.log("\nSearching features matching keywords:");
data.features.forEach((f, index) => {
    const id = String(f.id || '').toLowerCase();
    const name = String((f.properties && f.properties.name) || '').toLowerCase();
    
    let matched = false;
    for (const kw of naKeywords) {
        if (id.includes(kw) || name.includes(kw)) {
            matched = true;
            break;
        }
    }
    
    if (matched) {
        console.log(`[${index}] ID: "${f.id}", Name: "${f.properties ? f.properties.name : 'N/A'}", Geometry Type: ${f.geometry ? f.geometry.type : 'N/A'}`);
    }
});
