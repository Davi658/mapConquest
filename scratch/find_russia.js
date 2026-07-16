const fs = require('fs');

const data = JSON.parse(fs.readFileSync('src/data/napoleonic/world-napoleonic.geojson', 'utf8'));

console.log("=== Features matching 'russia' ===");
data.features.forEach(f => {
    const name = f.properties && f.properties.name;
    const id = f.id;
    if (String(name).toLowerCase().includes('russia') || String(id).toLowerCase().includes('russia')) {
        console.log(`id: "${id}", name: "${name}"`);
    }
});

console.log("\n=== Features matching 'siberia' ===");
data.features.forEach(f => {
    const name = f.properties && f.properties.name;
    const id = f.id;
    if (String(name).toLowerCase().includes('siberia') || String(id).toLowerCase().includes('siberia')) {
        console.log(`id: "${id}", name: "${name}"`);
    }
});
