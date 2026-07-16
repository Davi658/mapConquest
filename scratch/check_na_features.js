const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, 'world_1800_temp.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

console.log("Analyzing North American features in 1800 GeoJSON:");

// Helper to check if a feature's bounding box is roughly in North America
function isRoughlyNorthAmerica(geometry) {
    if (!geometry) return false;
    let coords = [];
    if (geometry.type === 'Polygon') {
        coords = geometry.coordinates[0];
    } else if (geometry.type === 'MultiPolygon') {
        coords = geometry.coordinates.flatMap(p => p[0]);
    }
    
    if (coords.length === 0) return false;
    
    // Find bounding box
    let minLng = 180, maxLng = -180, minLat = 90, maxLat = -90;
    coords.forEach(c => {
        const lng = c[0];
        const lat = c[1];
        if (lng < minLng) minLng = lng;
        if (lng > maxLng) maxLng = lng;
        if (lat < minLat) minLat = lat;
        if (lat > maxLat) maxLat = lat;
    });
    
    // Bounding box of North America roughly:
    // Longitude: -180 to -40
    // Latitude: 10 to 85
    return maxLng < -30 && minLng > -180 && maxLat > 10 && minLat < 85;
}

data.features.forEach((f, idx) => {
    const id = f.id || '';
    const name = f.properties && (
        f.properties.NAME ||
        f.properties.name ||
        f.properties.ADMIN ||
        f.properties.Entity ||
        f.properties.entity ||
        ''
    );
    
    if (isRoughlyNorthAmerica(f.geometry)) {
        console.log(`[${idx}] ID: "${id}", Name: "${name}"`);
    }
});
