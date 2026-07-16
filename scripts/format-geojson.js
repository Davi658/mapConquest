const fs = require('fs');
const path = require('path');

function formatGeometry(geom, indent = "    ") {
    if (!geom) return "null";
    const type = geom.type;
    let coordsStr = "";
    
    if (type === "Point") {
        coordsStr = `[${geom.coordinates[0]}, ${geom.coordinates[1]}]`;
    } else if (type === "LineString" || type === "MultiPoint") {
        coordsStr = `[\n${indent}  ` + geom.coordinates.map(c => `[${c[0]}, ${c[1]}]`).join(`,\n${indent}  `) + `\n${indent}]`;
    } else if (type === "Polygon" || type === "MultiLineString") {
        const rings = geom.coordinates.map(ring => {
            return `${indent}  [` + ring.map(c => `[${c[0]},${c[1]}]`).join(',') + `]`;
        });
        coordsStr = `[\n` + rings.join(`,\n`) + `\n${indent}]`;
    } else if (type === "MultiPolygon") {
        const polygons = geom.coordinates.map(poly => {
            const rings = poly.map(ring => {
                return `${indent}    [` + ring.map(c => `[${c[0]},${c[1]}]`).join(',') + `]`;
            });
            return `${indent}  [\n` + rings.join(`,\n`) + `\n${indent}  ]`;
        });
        coordsStr = `[\n` + polygons.join(`,\n`) + `\n${indent}]`;
    } else {
        coordsStr = JSON.stringify(geom.coordinates);
    }
    
    return `{\n${indent}  "type": "${type}",\n${indent}  "coordinates": ${coordsStr}\n${indent}}`;
}

function formatFeature(f, indent = "    ") {
    const idStr = f.id !== undefined ? `\n${indent}  "id": ${JSON.stringify(f.id)},` : "";
    const propsStr = f.properties ? `\n${indent}  "properties": ${JSON.stringify(f.properties, null, 2).replace(/\n/g, `\n${indent}  `)},` : "";
    const geomStr = f.geometry ? `\n${indent}  "geometry": ${formatGeometry(f.geometry, indent + "  ")}` : `\n${indent}  "geometry": null`;
    return `${indent}{\n${indent}  "type": "Feature",${idStr}${propsStr}${geomStr}\n${indent}}`;
}

function formatFeatureCollection(fc) {
    const featuresStr = fc.features.map(f => formatFeature(f, "    ")).join(",\n");
    return `{\n  "type": "FeatureCollection",\n  "features": [\n${featuresStr}\n  ]\n}`;
}

// Running the script on the target file if passed, otherwise default to napoleonic
function main() {
    const targetFile = process.argv[2] 
        ? path.resolve(process.argv[2]) 
        : path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');

    if (!fs.existsSync(targetFile)) {
        console.error(`File not found: ${targetFile}`);
        process.exit(1);
    }

    console.log(`Reading and parsing ${targetFile}...`);
    const raw = fs.readFileSync(targetFile, 'utf8');
    const data = JSON.parse(raw);

    console.log(`Formatting GeoJSON with compact coordinates...`);
    const formatted = formatFeatureCollection(data);

    console.log(`Writing formatted content back to ${targetFile}...`);
    fs.writeFileSync(targetFile, formatted, 'utf8');
    console.log(`Success! Formatted file size: ${(fs.statSync(targetFile).size / 1024 / 1024).toFixed(2)} MB`);
}

if (require.main === module) {
    main();
}

module.exports = { formatFeatureCollection };
