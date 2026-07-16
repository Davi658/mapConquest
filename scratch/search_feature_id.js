const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const targets = ['t_atsaot_ine', 'rupert_s_land', 'vice_royalty_of_new_spain', 'luisiana', 'united_states_of_america', 'quebec'];

console.log("Searching features by ID and properties:");
data.features.forEach((f, idx) => {
    const id = f.id;
    const name = f.properties && f.properties.name;
    const propId = f.properties && f.properties.id;
    
    // Check if any of these match target
    let matched = false;
    for (const t of targets) {
        if (id === t || propId === t || (name && name.toLowerCase().includes(t.replace(/_/g, ' ')))) {
            matched = true;
            break;
        }
    }
    
    if (matched || idx < 5) {
        console.log(`[${idx}] id: "${id}", properties.id: "${propId}", properties.name: "${name}"`);
    }
});
