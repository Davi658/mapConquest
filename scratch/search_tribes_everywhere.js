const fs = require('fs');
const path = require('path');

const files = [
    'src/data/modern/world-countries-hires.geojson',
    'src/data/medieval/world-medieval.geojson',
    'src/data/napoleonic/world-napoleonic.geojson',
    'src/data/worldwars/world-worldwars.geojson',
    'scratch/world_1800_temp.geojson'
];

const keywords = ['kutenai', 'chilcotin', 'esquim', 'esquimaux'];

files.forEach(f => {
    const fullPath = path.join(__dirname, '..', f);
    if (fs.existsSync(fullPath)) {
        console.log(`Checking ${f}:`);
        const content = fs.readFileSync(fullPath, 'utf8');
        keywords.forEach(kw => {
            const index = content.toLowerCase().indexOf(kw);
            if (index !== -1) {
                console.log(`  Found keyword "${kw}" at index ${index}!`);
                // Let's print around the match
                const start = Math.max(0, index - 100);
                const end = Math.min(content.length, index + 300);
                console.log(`  Context:\n${content.substring(start, end)}\n`);
            }
        });
    }
});
