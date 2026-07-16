const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const f = data.features[147];
console.log("Feature 147 Properties:", f.properties);
console.log("Feature 147 Geometry Type:", f.geometry.type);
if (f.geometry.type === 'Polygon') {
    console.log("Coords sample (first 5):", f.geometry.coordinates[0].slice(0, 5));
} else {
    console.log("Coords sample (first polygon, first 5):", f.geometry.coordinates[0][0].slice(0, 5));
}
