const fs = require('fs');
const path = require('path');

const files = [
    'src/data/modern/world-countries-hires.geojson',
    'src/data/medieval/world-medieval.geojson',
    'src/data/napoleonic/world-napoleonic.geojson',
    'src/data/worldwars/world-worldwars.geojson'
];

files.forEach(f => {
    const fullPath = path.join(__dirname, '..', f);
    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        console.log(`Checking ${f}:`);
        console.log(`  Contains 'rupert_s_land':`, content.includes('rupert_s_land'));
        console.log(`  Contains 't_atsaot_ine':`, content.includes('t_atsaot_ine'));
        console.log(`  Contains 'vice_royalty_of_new_spain':`, content.includes('vice_royalty_of_new_spain'));
        
        try {
            const data = JSON.parse(content);
            console.log(`  Number of features:`, data.features.length);
            const idsSample = data.features.slice(0, 5).map(x => x.id);
            console.log(`  Sample IDs:`, idsSample);
        } catch (e) {
            console.log(`  Error parsing JSON:`, e.message);
        }
    } else {
        console.log(`File ${f} does not exist.`);
    }
});
