const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const usa = data.features[153];
const newSpain = data.features[79];

console.log("USA geometry type:", usa.geometry.type);
console.log("New Spain geometry type:", newSpain.geometry.type);

function getBbox(geom) {
    let coords = [];
    if (geom.type === 'Polygon') {
        coords = geom.coordinates[0];
    } else if (geom.type === 'MultiPolygon') {
        coords = geom.coordinates.flatMap(p => p[0]);
    }
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    coords.forEach(c => {
        const lng = c[0];
        const lat = c[1];
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    });
    return { minLng, maxLng, minLat, maxLat };
}

console.log("USA BBox:", getBbox(usa.geometry));
console.log("New Spain BBox:", getBbox(newSpain.geometry));
