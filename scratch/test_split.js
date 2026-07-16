const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const usaFeature = data.features[153];
const polyRing = usaFeature.geometry.coordinates[0][0];

console.log("Original USA main ring length:", polyRing.length);

// Extract Florida coastline points: from index 676 to 742
const floridaRing = polyRing.slice(676, 743).concat([polyRing[676]]);
console.log("Florida ring length:", floridaRing.length);
console.log("Florida ring starts with:", floridaRing[0]);
console.log("Florida ring ends with:", floridaRing[floridaRing.length - 1]);

// New USA main ring: slice up to 676 (inclusive), then from 742 (inclusive) to end
const newUsaRing = polyRing.slice(0, 677).concat(polyRing.slice(742));
console.log("New USA main ring length:", newUsaRing.length);
console.log("New USA main ring connection segment:", newUsaRing[676], "->", newUsaRing[677]);

// Check if closed
const isFloridaClosed = floridaRing[0][0] === floridaRing[floridaRing.length - 1][0] && floridaRing[0][1] === floridaRing[floridaRing.length - 1][1];
const isUsaClosed = newUsaRing[0][0] === newUsaRing[newUsaRing.length - 1][0] && newUsaRing[0][1] === newUsaRing[newUsaRing.length - 1][1];

console.log("Is Florida closed?", isFloridaClosed);
console.log("Is New USA closed?", isUsaClosed);
