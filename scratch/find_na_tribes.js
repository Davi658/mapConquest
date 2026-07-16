const fs = require('fs');
const path = require('path');

const geojsonPath = path.join(__dirname, '..', 'src', 'data', 'napoleonic', 'world-napoleonic.geojson');
const data = JSON.parse(fs.readFileSync(geojsonPath, 'utf8'));

console.log("Searching for Native American / North American features in GeoJSON:");
const keywords = [
    'sioux', 'comanche', 'cheyenne', 'haida', 'tlingit', 'chinook', 'cherokee', 'creek',
    'cree', 'ojibwe', 'inuit', 'navajo', 'apache', 'shoshone', 'algonquin', 'iroquois',
    'huron', 'choctaw', 'chickasaw', 'seminole', 'blackfoot', 'crow', 'nez_perce', 'flathead',
    'kutenai', 'chilcotin', 'carrier', 'tatsaotine', 'dogrib', 'esquimaux', 'inupiaq',
    'yup_ik', 'eyaq', 'tlingit', 'haida', 'chinook', 'nootka', 'salish', 'shoshoni',
    'ute', 'hopi', 'zuni', 'pueblo', 'navaho', 'kiowa', 'arapaho', 'pawnee', 'osage',
    'caddo', 'wichita', 'tonkawa', 'coahuiltecan', 'karankawa', 'chumash', 'pomo', 'miwok',
    'maidu', 'wintun', 'yokuts', 'mojave', 'yuma', 'pima', 'papago', 'apachean', 'athabaskan'
];

data.features.forEach(f => {
    const id = String(f.id).toLowerCase();
    const name = String(f.properties.name || '').toLowerCase();
    
    let matched = false;
    for (const kw of keywords) {
        if (id.includes(kw) || name.includes(kw)) {
            matched = true;
            break;
        }
    }
    
    // Also include features that have coordinates in North America and don't match standard countries
    if (matched) {
        console.log(`- ID: "${f.id}", Name: "${f.properties.name}"`);
    }
});
