const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');

console.log("=== Testing GeoJSON Split & Assemble Roundtrip ===");

// 1. Read current GeoJSON
const originalData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
console.log(`Original feature count: ${originalData.features.length}`);

// 2. Run split script
console.log("Running scripts/split-geojson.js...");
execSync('node scripts/split-geojson.js', { stdio: 'inherit' });

// 3. Check if features directory has files
const featuresDir = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'features');
const files = fs.readdirSync(featuresDir).filter(f => f.endsWith('.geojson'));
console.log(`Exported feature files in directory: ${files.length}`);

if (files.length !== originalData.features.length) {
    console.error("ERROR: Count mismatch after split!");
    process.exit(1);
}

// 4. Run assemble script
console.log("Running scripts/assemble-geojson.js...");
execSync('node scripts/assemble-geojson.js', { stdio: 'inherit' });

// 5. Read assembled GeoJSON
const assembledData = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));
console.log(`Assembled feature count: ${assembledData.features.length}`);

if (assembledData.features.length !== originalData.features.length) {
    console.error("ERROR: Count mismatch after assembly!");
    process.exit(1);
}

// 6. Verify data equality
// Let's sort features by ID to verify matching
originalData.features.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));
assembledData.features.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));

let matches = true;
for (let i = 0; i < originalData.features.length; i++) {
    const origStr = JSON.stringify(originalData.features[i]);
    const assemStr = JSON.stringify(assembledData.features[i]);
    if (origStr !== assemStr) {
        console.error(`ERROR: Feature mismatch at index ${i} (ID: ${originalData.features[i].id})`);
        matches = false;
        break;
    }
}

if (matches) {
    console.log("\n✔ SUCCESS! Split & Assemble roundtrip verified as 100% LOSSLESS!");
} else {
    console.log("\n✗ FAILED! The roundtrip has differences.");
    process.exit(1);
}
