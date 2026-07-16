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

const sourcePath = path.join(__dirname, 'world_1800_temp.geojson');
const destPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');

if (!fs.existsSync(sourcePath)) {
    console.error(`Source file not found at ${sourcePath}. Make sure to download it first.`);
    process.exit(1);
}

const data = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const era = 'napoleonic';
const names = new Set();
let processed = 0;

console.log(`Processing ${data.features.length} features...`);

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

// Slicing Florida from USA
console.log("Locating USA feature to split Florida...");
const usaFeature = data.features.find(f => f.id === 'united_states_of_america');

if (!usaFeature) {
    console.error("USA feature not found in GeoJSON!");
    process.exit(1);
}

const polyRing = usaFeature.geometry.coordinates[0][0];
console.log(`Original USA exterior ring has ${polyRing.length} points.`);

// Extract Florida coastline (index 676 to 742 inclusive) and close it with the start point
const floridaRing = polyRing.slice(676, 743).concat([polyRing[676]]);
console.log(`Florida ring created with ${floridaRing.length} points.`);

// Modify USA exterior ring to bypass Florida (keep 676 and 742, remove the interior points)
const newUsaRing = polyRing.slice(0, 677).concat(polyRing.slice(742));
console.log(`New USA exterior ring has ${newUsaRing.length} points.`);

// Update USA geometry
usaFeature.geometry.coordinates[0][0] = newUsaRing;

// Create new Florida feature
const floridaFeature = {
    type: "Feature",
    id: "florida",
    properties: {
        era: era,
        entityId: "florida",
        name: "Flórida"
    },
    geometry: {
        type: "Polygon",
        coordinates: [ floridaRing ]
    }
};

// Add Florida to features collection
data.features.push(floridaFeature);
console.log("Added Florida feature to GeoJSON features list.");

// Save final GeoJSON
console.log(`Saving final GeoJSON to ${destPath}...`);
fs.writeFileSync(destPath, JSON.stringify(data), 'utf8');
console.log("Success! world-napoleonic.geojson built successfully.");
