/**
 * Generates a visually distinct unique color for each country
 * using the Golden Ratio hue distribution (φ = 0.618...)
 * Colors are embedded directly in each feature's properties.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'data', 'modern', 'world-countries-hires.geojson');

// HSL → Hex conversion
function hslToHex(h, s, l) {
    s /= 100;
    l /= 100;
    const a = s * Math.min(l, 1 - l);
    const f = n => {
        const k = (n + h / 30) % 12;
        const c = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
        return Math.round(255 * c).toString(16).padStart(2, '0');
    };
    return '#' + f(0) + f(8) + f(4);
}

const GOLDEN_RATIO = 0.618033988749895;

console.log('Reading GeoJSON...');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

// Sort features by id so colors are always deterministic (same id = same color)
const sorted = [...data.features].sort((a, b) => String(a.id).localeCompare(String(b.id)));

let hue = 37; // starting hue (warm amber)

sorted.forEach((f, i) => {
    hue = (hue + GOLDEN_RATIO * 360) % 360;

    // Vary saturation and lightness for visual richness
    const satVariants  = [58, 62, 55, 65, 60];  // cycle through 5 variants
    const litVariants  = [42, 46, 50, 38, 54];  // cycle through 5 variants
    const sat = satVariants[i % satVariants.length];
    const lit = litVariants[i % litVariants.length];

    f.properties.color = hslToHex(Math.round(hue), sat, lit);
    f.properties.colorHsl = Math.round(hue) + ' ' + sat + '% ' + lit + '%';
});

// Restore original feature order (sorted only to ensure determinism)
const colorById = {};
sorted.forEach(f => { colorById[f.id] = f.properties.color; });
data.features.forEach(f => {
    f.properties.color    = colorById[f.id];
});

const out = JSON.stringify(data);
fs.writeFileSync(FILE, out, 'utf8');

console.log('Assigned unique colors to ' + data.features.length + ' countries.');
console.log('Sample colors:');
data.features.slice(0, 8).forEach(f => {
    console.log('  ' + f.id + ' (' + f.properties.name + '): ' + f.properties.color);
});
console.log('Saved: ' + FILE);
