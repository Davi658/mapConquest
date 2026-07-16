const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://raw.githubusercontent.com/aourednik/historical-basemaps/master/geojson/world_1800.geojson';
const dest = path.join(__dirname, 'world_1800_temp.geojson');

console.log("Downloading world_1800.geojson...");
const file = fs.createWriteStream(dest);
https.get(url, (response) => {
    if (response.statusCode !== 200) {
        console.error("Failed to download:", response.statusCode);
        return;
    }
    response.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log("Download complete!");
        
        // Let's inspect features
        const data = JSON.parse(fs.readFileSync(dest, 'utf8'));
        console.log("Number of features:", data.features.length);
        
        // Walk some features and slugify names like processGeoJSON does
        function slugify(str) {
            return String(str || '')
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-z0-9]+/g, '_')
                .replace(/^_+|_+$/g, '');
        }
        
        const slugs = data.features.map((f, idx) => {
            const name = f.properties && (
                f.properties.NAME ||
                f.properties.name ||
                f.properties.ADMIN ||
                f.properties.Entity ||
                f.properties.entity ||
                ''
            );
            return slugify(name) || `feature_${idx}`;
        });
        
        console.log("Sample slugs:", slugs.slice(0, 20));
        console.log("Contains rupert_s_land:", slugs.includes("rupert_s_land"));
        console.log("Contains t_atsaot_ine:", slugs.includes("t_atsaot_ine"));
        console.log("Contains vice_royalty_of_new_spain:", slugs.includes("vice_royalty_of_new_spain"));
    });
}).on('error', (err) => {
    console.error("Error:", err.message);
});
