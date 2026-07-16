const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const rawText = fs.readFileSync(geojsonPath, 'utf8');

const targets = ['t_atsaot_ine', 'rupert_s_land', 'vice_royalty_of_new_spain', 'luisiana', 'aboriginal_tasmanians', 'feature_147'];

targets.forEach(t => {
    const found = rawText.includes(t);
    console.log(`Searching raw text for "${t}": ${found}`);
});
