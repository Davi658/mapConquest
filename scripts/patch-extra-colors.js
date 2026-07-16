const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'src', 'data', 'modern', 'world-countries-hires.geojson');

const EXTRA = {
    ESH: '#007A3D', MAF: '#0055A4', SXM: '#003087', GIB: '#CF101A',
    MRT: '#006233', HKG: '#DE2910', ATA: '#AACCDD', GRL: '#003897',
    NCL: '#009E60', ABW: '#0047BA', TCA: '#012169', SPM: '#0055A4',
    PCN: '#012169', PYF: '#0055A4', ATF: '#0055A4', UMI: '#B22234',
    MSR: '#012169', VIR: '#003087', BLM: '#0055A4', PRI: '#002A8F',
    AIA: '#012169', VGB: '#012169', CYM: '#012169', BMU: '#012169',
    HMD: '#012169', SHN: '#012169', JEY: '#CF101A', GGY: '#CF101A',
    IMN: '#CF101A', ALA: '#003580', FRO: '#003897', NFK: '#009E60',
    COK: '#00247D', WLF: '#0055A4', SGS: '#012169', FLK: '#012169',
    NIU: '#003087', ASM: '#002868', GUM: '#193F87', MNP: '#003087',
    MAC: '#009A44', JAM: '#FED100', PNG: '#CE1126', UGA: '#FCDC04',
    PSE: '#000000',
};

const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
let fixed = 0;
data.features.forEach(f => {
    if (EXTRA[f.id]) { f.properties.color = EXTRA[f.id]; fixed++; }
});
fs.writeFileSync(FILE, JSON.stringify(data), 'utf8');
console.log('Patched ' + fixed + ' additional countries.');
