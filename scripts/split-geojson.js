const fs = require('fs');
const path = require('path');
const { formatFeatureCollection } = require('./format-geojson');

function formatFeature(f) {
    // Reuse formatFeatureCollection but strip the FeatureCollection wrappers
    const tempCollection = { type: "FeatureCollection", features: [f] };
    const formattedCol = formatFeatureCollection(tempCollection);
    // Find the interior feature text
    const lines = formattedCol.split('\n');
    // Extract the lines between the "features": [ and ]
    const featureLines = lines.slice(3, lines.length - 2);
    // Unindent the feature lines by 4 spaces
    return featureLines.map(line => line.substring(4)).join('\n');
}

function main() {
    const sourceFile = process.argv[2] 
        ? path.resolve(process.argv[2]) 
        : path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');

    if (!fs.existsSync(sourceFile)) {
        console.error(`Source file not found: ${sourceFile}`);
        process.exit(1);
    }

    const outputDir = path.join(path.dirname(sourceFile), 'features');
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }

    console.log(`Reading and parsing combined GeoJSON: ${sourceFile}...`);
    const raw = fs.readFileSync(sourceFile, 'utf8');
    const data = JSON.parse(raw);

    console.log(`Splitting ${data.features.length} features into ${outputDir}...`);
    
    // Clear out existing features in the directory first to prevent orphaned files
    const existingFiles = fs.readdirSync(outputDir);
    existingFiles.forEach(file => {
        if (file.endsWith('.geojson')) {
            fs.unlinkSync(path.join(outputDir, file));
        }
    });

    data.features.forEach(f => {
        const id = f.id;
        if (!id) {
            console.warn(`Feature skipped (missing ID):`, f.properties);
            return;
        }
        
        const filePath = path.join(outputDir, `${id}.geojson`);
        const formatted = formatFeature(f);
        fs.writeFileSync(filePath, formatted, 'utf8');
    });

    console.log(`Success! Exported ${data.features.length} features.`);
}

if (require.main === module) {
    main();
}
