const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const usa = data.features[153];
const poly = usa.geometry.coordinates[0][0];

console.log("Before Florida:");
for (let i = 670; i <= 676; i++) {
    console.log(`[${i}] Lng: ${poly[i][0].toFixed(3)}, Lat: ${poly[i][1].toFixed(3)}`);
}

console.log("\nAfter Florida:");
for (let i = 742; i <= 748; i++) {
    console.log(`[${i}] Lng: ${poly[i][0].toFixed(3)}, Lat: ${poly[i][1].toFixed(3)}`);
}
