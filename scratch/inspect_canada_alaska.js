const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const targets = [
    { name: 'Rupert\'s Land', idx: 149 },
    { name: 'T\'atsaot\'ine', idx: 182 },
    { name: 'Suspiaq', idx: 144 },
    { name: 'Yup\'ik & Cup\'ik', idx: 145 },
    { name: 'Inupiaq', idx: 146 },
    { name: 'Eyaq', idx: 148 },
    { name: 'Feature 147', idx: 147 },
    { name: 'Quebec', idx: 134 },
    { name: 'Acadian Peninsula', idx: 78 }
];

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

targets.forEach(t => {
    const f = data.features[t.idx];
    const bbox = getBbox(f.geometry);
    console.log(`[${t.idx}] Name: "${t.name}"`);
    console.log(`  BBox: Lng [${bbox.minLng.toFixed(3)}, ${bbox.maxLng.toFixed(3)}], Lat [${bbox.minLat.toFixed(3)}, ${bbox.maxLat.toFixed(3)}]`);
});
