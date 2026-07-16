/**
 * Fixes the world-countries-hires.geojson:
 * - Assigns proper ISO3 codes to countries incorrectly labeled as "-99"
 * - Generates stable unique IDs for unrecognized territories
 * - Deduplicates any remaining ID conflicts
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'data', 'modern', 'world-countries-hires.geojson');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// Known countries that incorrectly get "-99" in this dataset but have real ISO3 codes
const KNOWN_ISO3_FIXES = {
    'France':               'FRA',
    'Norway':               'NOR',
    'Kosovo':               'XKX',
    'Somaliland':           'SOL',
    'Northern Cyprus':      'NCY',
    'Siachen Glacier':      'SIA',
    'Bir Tawil':            'BWT',
    'Baykonur Cosmodrome':  'BYK',
    'Clipperton Island':    'CPT',
    'Coral Sea Islands':    'CSI',
    'Ashmore and Cartier Islands': 'ACA',
    'Spratly Islands':      'SPI',
    'Scarborough Reef':     'SCR',
    'Dhekelia Sovereign Base Area':  'DHK',
    'Akrotiri Sovereign Base Area':  'AKR',
    'Cyprus No Mans Area':  'CYN',
    'Brazilian Island':     'BRI',
    'Indian Ocean Territories': 'IOT',
    'Southern Patagonian Ice Field': 'SIF',
    'Bajo Nuevo Bank (Petrel Is.)': 'BNB',
    'Serranilla Bank':      'SRB',
    'US Naval Base Guantanamo Bay': 'GNT',
};

let fixedCount = 0;
const usedIds = new Set();

const fixed = data.features.map(f => {
    let id = f.id;
    const name = f.properties.name || '';

    // If id is -99 or missing, try known fixes then generate from name
    if (!id || id === '-99' || id === '') {
        if (KNOWN_ISO3_FIXES[name]) {
            id = KNOWN_ISO3_FIXES[name];
        } else {
            // Generate a stable 3-letter code from the name
            id = name.replace(/[^A-Za-z]/g, '').substring(0, 3).toUpperCase() || 'UNK';
        }
        fixedCount++;
    }

    // Deduplicate: if this id was already used, append a counter
    let finalId = id;
    let counter = 2;
    while (usedIds.has(finalId)) {
        finalId = id + counter;
        counter++;
    }
    usedIds.add(finalId);

    if (finalId !== f.id) {
        console.log('  Fixed: "' + (f.id || 'null') + '" -> "' + finalId + '" (' + name + ')');
    }

    return { ...f, id: finalId };
});

const out = JSON.stringify({ type: 'FeatureCollection', features: fixed });
fs.writeFileSync(FILE, out, 'utf8');

console.log('\nFixed ' + fixedCount + ' bad IDs.');
console.log('Total features:', fixed.length);
console.log('Total unique IDs:', usedIds.size);
console.log('Saved: ' + FILE);
