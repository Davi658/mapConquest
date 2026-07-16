const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

const usa = data.features[153];
const newSpain = data.features[79];

function findPolygonsInFlorida(feature, name) {
    console.log(`\nAnalyzing polygons for "${name}":`);
    const polygons = feature.geometry.coordinates; // MultiPolygon structure: [Polygon1, Polygon2, ...]
    
    polygons.forEach((poly, pIdx) => {
        const coords = poly[0]; // exterior ring
        // Calculate bbox of this individual polygon
        let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
        coords.forEach(c => {
            const lng = c[0];
            const lat = c[1];
            if (lng < minLng) minLng = lng;
            if (lng > maxLng) maxLng = lng;
            if (lat < minLat) minLat = lat;
            if (lat > maxLat) maxLat = lat;
        });
        
        // If it falls within Florida-ish bbox (-86 to -79, 24 to 31)
        const inFlorida = (maxLng >= -86 && minLng <= -79 && minLat <= 31 && maxLat >= 24);
        if (inFlorida) {
            console.log(`  Polygon [${pIdx}] has ${coords.length} points.`);
            console.log(`    BBox: Lng [${minLng.toFixed(3)}, ${maxLng.toFixed(3)}], Lat [${minLat.toFixed(3)}, ${maxLat.toFixed(3)}]`);
            // Check if it's the Florida peninsula (minLat ~ 25, maxLat ~ 30, maxLng ~ -80)
            if (maxLng > -82 && minLat < 26) {
                console.log(`    --> This looks like the Florida Peninsula!`);
            }
        }
    });
}

findPolygonsInFlorida(usa, "USA");
findPolygonsInFlorida(newSpain, "New Spain");
