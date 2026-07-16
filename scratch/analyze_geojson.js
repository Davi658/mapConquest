const fs = require('fs');

const files = [
    'src/data/medieval/world-medieval.geojson',
    'src/data/napoleonic/world-napoleonic.geojson',
    'src/data/worldwars/world-worldwars.geojson'
];

files.forEach(file => {
    console.log(`=== File: ${file} ===`);
    if (!fs.existsSync(file)) {
        console.log("File does not exist!\n");
        return;
    }
    const data = JSON.parse(fs.readFileSync(file, 'utf8'));
    const idCount = {};
    const missingIds = [];
    data.features.forEach((f, idx) => {
        const id = f.id;
        if (!id) {
            missingIds.push(idx);
        } else {
            idCount[id] = (idCount[id] || 0) + 1;
        }
    });

    const dupes = Object.entries(idCount).filter(([, c]) => c > 1);
    console.log(`Total features: ${data.features.length}`);
    console.log(`Missing IDs: ${missingIds.length}`);
    console.log(`Duplicate IDs: ${dupes.length}`);
    if (dupes.length > 0) {
        console.log("Duplicates (up to 5):", dupes.slice(0, 5));
    }
    console.log('');
});
