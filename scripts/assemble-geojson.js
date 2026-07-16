const fs = require('fs');
const path = require('path');
const { formatFeatureCollection } = require('./format-geojson');

function main() {
    const destFile = process.argv[2] 
        ? path.resolve(process.argv[2]) 
        : path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');

    const sourceDir = path.join(path.dirname(destFile), 'features');

    if (!fs.existsSync(sourceDir)) {
        console.error(`Features directory not found: ${sourceDir}`);
        process.exit(1);
    }

    console.log(`Reading features from ${sourceDir}...`);
    const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.geojson'));
    
    console.log(`Loading and parsing ${files.length} features...`);
    const features = [];
    files.forEach(file => {
        const filePath = path.join(sourceDir, file);
        try {
            const raw = fs.readFileSync(filePath, 'utf8');
            const f = JSON.parse(raw);
            features.push(f);
        } catch (e) {
            console.error(`Error parsing feature file: ${file}`, e.message);
        }
    });

    // Let's sort features by ID to keep the output stable and deterministic!
    features.sort((a, b) => String(a.id || '').localeCompare(String(b.id || '')));

    const fc = {
        type: "FeatureCollection",
        features: features
    };

    console.log(`Formatting combined FeatureCollection...`);
    const formatted = formatFeatureCollection(fc);

    console.log(`Saving combined GeoJSON to ${destFile}...`);
    fs.writeFileSync(destFile, formatted, 'utf8');
    console.log(`Success! Assembled ${features.length} features. File size: ${(fs.statSync(destFile).size / 1024 / 1024).toFixed(2)} MB`);
}

if (require.main === module) {
    main();
}
