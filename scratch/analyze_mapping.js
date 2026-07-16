const fs = require('fs');
const path = require('path');

// Load historical configs manually by parsing the JS files
function loadConfig(eraPath) {
    const content = fs.readFileSync(eraPath, 'utf8');
    // Extract JSON-like object by finding window.MC_NationsData_...
    const jsonMatch = content.match(/window\.MC_NationsData_\w+\s*=\s*([\s\S]+?);/);
    if (!jsonMatch) {
        throw new Error(`Could not find config in ${eraPath}`);
    }
    // Safely evaluate or parse (since it's a JS object declaration)
    try {
        const obj = eval(`(${jsonMatch[1]})`);
        return obj;
    } catch (e) {
        console.error(`Eval error for ${eraPath}:`, e.message);
        return null;
    }
}

const ERAS = [
    {
        id: 'medieval',
        configPath: 'src/data/medieval/map-data-medieval-inline.js',
        geojsonPath: 'src/data/medieval/world-medieval.geojson'
    },
    {
        id: 'napoleonic',
        configPath: 'src/data/napoleonic/map-data-napoleonic-inline.js',
        geojsonPath: 'src/data/napoleonic/world-napoleonic.geojson'
    },
    {
        id: 'worldwars',
        configPath: 'src/data/worldwars/map-data-worldwars-inline.js',
        geojsonPath: 'src/data/worldwars/world-worldwars.geojson'
    }
];

ERAS.forEach(era => {
    console.log(`=== Analyzing Era: ${era.id} ===`);
    const config = loadConfig(era.configPath);
    if (!config) return;

    const geojson = JSON.parse(fs.readFileSync(era.geojsonPath, 'utf8'));
    const mappedKeys = Object.keys(config.countryFactionMap || {});
    
    console.log(`GeoJSON features: ${geojson.features.length}`);
    console.log(`Config mapped keys: ${mappedKeys.length}`);

    let matchCount = 0;
    const missingKeys = [];
    const extraConfigKeys = new Set(mappedKeys);

    geojson.features.forEach(f => {
        const id = f.id;
        if (config.countryFactionMap && config.countryFactionMap[id]) {
            matchCount++;
            extraConfigKeys.delete(id);
        } else {
            missingKeys.push(id);
        }
    });

    console.log(`Matched features: ${matchCount}`);
    console.log(`Unmatched features in GeoJSON (neutral or unmapped): ${missingKeys.length}`);
    console.log(`Extra keys in config not in GeoJSON: ${extraConfigKeys.size}`);
    if (extraConfigKeys.size > 0) {
        console.log("Extra keys:", Array.from(extraConfigKeys).slice(0, 10));
    }
    console.log('');
});
