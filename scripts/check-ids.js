const fs = require('fs');
const data = JSON.parse(fs.readFileSync('src/data/modern/world-countries-hires.geojson','utf8'));

const idCount = {};
const idNames = {};
data.features.forEach(f => {
    const id = f.id;
    idCount[id] = (idCount[id] || 0) + 1;
    if (!idNames[id]) idNames[id] = [];
    idNames[id].push(f.properties.name);
});

const dupes = Object.entries(idCount).filter(([,c]) => c > 1);
console.log('=== Duplicate / Shared IDs ===');
dupes.forEach(([id, count]) => {
    console.log('  id="' + id + '" (' + count + 'x): ' + idNames[id].join(', '));
});

const bad = data.features.filter(f => !f.id || f.id === '-99' || f.id === '' || f.id === 'null');
console.log('\n=== Bad / Missing IDs ===');
bad.forEach(f => console.log('  id="' + f.id + '" -> ' + f.properties.name));
console.log('Total bad:', bad.length);
console.log('Total features:', data.features.length);
