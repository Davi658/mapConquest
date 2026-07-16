const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const usa = data.features[153];
const poly = usa.geometry.coordinates[0][0]; // exterior ring of the first polygon

let below31 = 0;
let pointsBelow31 = [];

poly.forEach((c, idx) => {
    const lng = c[0];
    const lat = c[1];
    if (lat < 31 && lng > -88) {
        below31++;
        pointsBelow31.push({ idx, lng, lat });
    }
});

console.log(`Total points in USA main polygon: ${poly.length}`);
console.log(`Number of points below latitude 31 (and east of -88): ${below31}`);
if (below31 > 0) {
    console.log("Sample points below latitude 31:");
    console.log(pointsBelow31.slice(0, 10));
    console.log("Last 10 points:");
    console.log(pointsBelow31.slice(-10));
}
