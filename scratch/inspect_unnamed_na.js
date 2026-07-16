const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

function getBbox(geom) {
    if (!geom) return null;
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

console.log("Unnamed features in North America:");
data.features.forEach((f, idx) => {
    const name = f.properties && (f.properties.NAME || f.properties.name || f.properties.ADMIN || f.properties.Entity || '');
    if (!name || name.trim() === '') {
        const bbox = getBbox(f.geometry);
        if (bbox && bbox.maxLng < -30 && bbox.minLng > -180 && bbox.maxLat > 10 && bbox.minLat < 85) {
            console.log(`[${idx}] BBox: Lng [${bbox.minLng.toFixed(3)}, ${bbox.maxLng.toFixed(3)}], Lat [${bbox.minLat.toFixed(3)}, ${bbox.maxLat.toFixed(3)}]`);
        }
    }
});
