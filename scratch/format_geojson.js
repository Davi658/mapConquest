const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

// Custom stringifier to keep geometries compact but metadata pretty
function formatGeoJSON(geojson) {
    const parts = [];
    parts.push('{');
    parts.push('  "type": "FeatureCollection",');
    parts.push('  "features": [');
    
    const featureStrings = geojson.features.map(f => {
        const idStr = JSON.stringify(f.id);
        const propStr = JSON.stringify(f.properties, null, 4).replace(/\n/g, '\n    ');
        const geomStr = JSON.stringify(f.geometry);
        
        return `    {
      "type": "Feature",
      "id": ${idStr},
      "properties": ${propStr},
      "geometry": ${geomStr}
    }`;
    });
    
    parts.push(featureStrings.join(',\n'));
    parts.push('  ]');
    parts.push('}');
    return parts.join('\n');
}

console.log("Formatting GeoJSON...");
const formatted = formatGeoJSON(data);
fs.writeFileSync(geojsonPath, formatted, 'utf8');
console.log("GeoJSON formatted successfully!");
