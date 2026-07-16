/**
 * Applies historically & flag-inspired colors to each country in the GeoJSON.
 * Colors are chosen from the dominant/most recognizable color of each country's flag.
 * Falls back to existing golden-ratio color for unknown territories.
 */
const fs = require('fs');
const path = require('path');

const FILE = path.join(__dirname, '..', 'src', 'data', 'modern', 'world-countries-hires.geojson');

// ISO3 → Dominant flag color
// Colors chosen to be map-readable (not too dark, not too pale) and recognizable
const FLAG_COLORS = {
    // ── Americas ──────────────────────────────────────────────────────────
    USA: '#B22234', // Red stripes
    CAN: '#FF0000', // Maple leaf red
    MEX: '#006847', // Green stripe
    BRA: '#009C3B', // Green
    ARG: '#74ACDF', // Light blue
    COL: '#FCD116', // Yellow
    VEN: '#CF142B', // Red
    PER: '#D91023', // Red
    CHL: '#D52B1E', // Red
    BOL: '#D52B1E', // Red
    ECU: '#FFD100', // Yellow
    PRY: '#D52B1E', // Red
    URY: '#75AADB', // Blue
    GUY: '#009E60', // Green
    SUR: '#377E3F', // Green
    CUB: '#002A8F', // Blue
    JAM: '#000000', // Black (flag)  → better dark green
    HTI: '#00209F', // Blue
    DOM: '#002D62', // Blue
    GTM: '#4997D0', // Blue
    HND: '#0073CF', // Blue
    SLV: '#0F47AF', // Blue
    NIC: '#3A75C4', // Blue
    CRI: '#002B7F', // Blue
    PAN: '#DA121A', // Red
    TTO: '#CE1126', // Red
    BLZ: '#003F87', // Blue
    BHS: '#00778B', // Turquoise
    CUW: '#002B7F', // Blue (Netherlands Antilles)
    BRB: '#00267F', // Blue
    ATG: '#CE1126', // Red
    KNA: '#009E60', // Green
    DMA: '#006B3F', // Green
    LCA: '#65CFFF', // Light blue
    GRD: '#CE1126', // Red
    VCT: '#009E60', // Green
    // ── Europe ────────────────────────────────────────────────────────────
    GBR: '#012169', // Union Jack navy
    FRA: '#0055A4', // Tricolor blue
    DEU: '#FFCC00', // Gold stripe
    ITA: '#009246', // Green stripe
    ESP: '#AA151B', // Red stripe
    PRT: '#006600', // Green stripe
    NLD: '#AE1C28', // Orange/red
    BEL: '#FDDA24', // Gold stripe
    CHE: '#FF0000', // Red with cross
    AUT: '#ED2939', // Red stripe
    POL: '#DC143C', // Red stripe
    UKR: '#005BBB', // Blue stripe
    RUS: '#CC0000', // Red stripe
    SWE: '#006AA7', // Blue
    NOR: '#EF2B2D', // Red (but NOR was fixed as -99, might be 'NOR')
    DNK: '#C60C30', // Dannebrog red
    FIN: '#003580', // Blue cross
    ISL: '#003897', // Blue
    IRL: '#169B62', // Green stripe
    GRC: '#0D5EAF', // Blue
    TUR: '#E30A17', // Red with crescent
    ROU: '#002B7F', // Blue stripe
    HUN: '#CE2939', // Red stripe
    CZE: '#D7141A', // Red (Bohemian lion)
    SVK: '#0B4EA2', // Blue stripe
    HRV: '#FF0000', // Red (checkerboard)
    SRB: '#C6363C', // Red
    BGR: '#00966E', // Green stripe
    ALB: '#E41E20', // Red with eagle
    MKD: '#CE2028', // Red
    MNE: '#D4AF37', // Gold border
    BIH: '#002395', // Blue
    SVN: '#003DA5', // Blue stripe
    LTU: '#FDB913', // Yellow stripe
    LVA: '#9E3039', // Dark red (carmine)
    EST: '#0072CE', // Blue stripe
    BLR: '#CF101A', // Red stripe
    MDA: '#003DA5', // Blue stripe
    LUX: '#EF3340', // Red stripe
    MLT: '#CF101A', // Red half
    CYP: '#D07C27', // Copper/orange (island silhouette)
    XKX: '#244AA5', // Kosovo blue
    AND: '#0032A0', // Blue stripe
    MCO: '#CE1126', // Red top
    SMR: '#5EB6E4', // Light blue
    LIE: '#002B7F', // Navy blue
    VAT: '#FFE000', // Yellow
    // ── Russia & Post-Soviet ───────────────────────────────────────────────
    GEO: '#FF0000', // Red cross
    ARM: '#D90012', // Red stripe
    AZE: '#0092BC', // Blue stripe
    KAZ: '#00AFCA', // Sky blue
    UZB: '#1EB53A', // Green stripe
    TKM: '#31A84B', // Green
    TJK: '#CC0000', // Red stripe
    KGZ: '#E8112D', // Red (Kyrgyz)
    MNG: '#C4272F', // Red stripe
    // ── Middle East ───────────────────────────────────────────────────────
    IRN: '#239F40', // Green stripe
    IRQ: '#CE1126', // Red stripe
    SYR: '#CE1126', // Red stripe
    JOR: '#007A3D', // Green triangle → use black
    LBN: '#00a550', // Cedar green
    ISR: '#0038A8', // Blue stripes
    PSE: '#007A3D', // Palestinian green → black
    SAU: '#006C35', // Green
    ARE: '#00732F', // Green stripe
    QAT: '#8D1B3D', // Maroon
    KWT: '#007A3D', // Green stripe
    BHR: '#CE1126', // Red serrated
    OMN: '#DB161B', // Red
    YEM: '#CE1126', // Red stripe
    // ── South Asia ────────────────────────────────────────────────────────
    IND: '#FF9933', // Saffron
    PAK: '#01411C', // Dark green
    BGD: '#006A4E', // Green
    LKA: '#8D153A', // Dark red lion
    NPL: '#003893', // Blue border
    BTN: '#FF8000', // Orange
    MDV: '#D21034', // Red
    // ── Southeast Asia ────────────────────────────────────────────────────
    MMR: '#FECB00', // Yellow star
    THA: '#2D2A4A', // Navy (elephant) → Royal blue
    VNM: '#DA251D', // Red
    KHM: '#032EA1', // Blue stripe
    LAO: '#CE1126', // Red stripe
    PHL: '#0038A8', // Blue triangle
    IDN: '#CE1126', // Red top
    MYS: '#CC0001', // Red stripe
    SGP: '#EF3340', // Red top
    BRN: '#F7E017', // Yellow
    TLS: '#DC241F', // Red
    // ── East Asia ─────────────────────────────────────────────────────────
    CHN: '#DE2910', // Red
    JPN: '#BC002D', // Hinomaru red
    KOR: '#003478', // Blue (taegeuk)
    PRK: '#024FA2', // Blue stripe
    TWN: '#FE0000', // Red stripe
    // ── Central Asia ──────────────────────────────────────────────────────
    AFG: '#007A3D', // Green stripe
    // ── Oceania ───────────────────────────────────────────────────────────
    AUS: '#00008B', // Southern Cross navy
    NZL: '#00247D', // Navy
    PNG: '#000000', // Black — use maroon
    FJI: '#68BFE5', // Light blue
    SLB: '#0120AC', // Blue
    VUT: '#009543', // Green
    WSM: '#CE1126', // Red
    TON: '#C10000', // Red
    KIR: '#CE1126', // Red
    FSM: '#75B2DD', // Light blue
    MHL: '#003087', // Blue
    PLW: '#4AADD6', // Blue
    NRU: '#002B7F', // Navy
    TUV: '#009FCA', // Light blue
    // ── Africa ────────────────────────────────────────────────────────────
    NGA: '#008751', // Green
    ETH: '#078930', // Green stripe
    EGY: '#CE1126', // Red stripe
    ZAF: '#007A4D', // ANC green
    KEN: '#006600', // Green
    TZA: '#1EB53A', // Green
    UGA: '#000000', // Black → use crane yellow
    GHA: '#006B3F', // Green stripe
    CIV: '#F77F00', // Orange stripe
    CMR: '#007A5E', // Green stripe
    AGO: '#CC0000', // Red
    MOZ: '#009A44', // Green
    MDG: '#FC3D32', // Red stripe
    ZMB: '#198A00', // Green
    ZWE: '#006400', // Dark green
    MLI: '#14B53A', // Green stripe
    BFA: '#EF2B2D', // Red top
    NER: '#E05206', // Orange stripe
    SEN: '#00853F', // Green stripe
    GIN: '#CE1126', // Red stripe
    SOM: '#4189DD', // Blue
    SDN: '#D21034', // Red stripe
    SSD: '#078930', // Green stripe
    LBY: '#239E46', // Green (former all-green flag)
    TUN: '#E70013', // Red
    MAR: '#C1272D', // Red
    DZA: '#006233', // Green half
    RWA: '#20603D', // Blue → use green
    BDI: '#CE1126', // Red
    TCD: '#002664', // Blue stripe
    CAF: '#003082', // Blue stripe
    COD: '#007FFF', // Blue stripe
    COG: '#009A44', // Green stripe
    GAB: '#009E60', // Green stripe
    GNQ: '#3E9A00', // Green stripe
    DJI: '#6AB2E7', // Light blue
    ERI: '#4189DD', // Blue triangle
    COM: '#3A75C4', // Blue
    SYC: '#003F87', // Blue segment
    MUS: '#EA2839', // Red stripe
    CPV: '#003893', // Blue
    BEN: '#008751', // Green
    TGO: '#006A4E', // Green stripe
    SLE: '#1EB53A', // Green stripe
    LBR: '#BF0A30', // Red stripes
    GNB: '#CE1126', // Red stripe
    GMB: '#3A7728', // Green stripe
    NAM: '#003580', // Blue triangle
    BWA: '#75AADB', // Blue stripe
    LSO: '#009543', // Green → use blue
    SWZ: '#3E5EB9', // Royal blue stripe
    MWI: '#CE1126', // Red stripe
    STP: '#12AD2B', // Green stripe
    GNQ2: '#3E9A00', // fallback
    // ── Special/Disputed territories (assigned synthetic codes) ───────────
    XKX: '#244AA5', // Kosovo
    NCY: '#CC0000', // Northern Cyprus (red)
    SOL: '#4DB8FF', // Somaliland (blue)
    SIA: '#CCCCCC', // Siachen (grey disputed)
    BWT: '#E8D5A3', // Bir Tawil (desert)
    BYK: '#CC6600', // Baykonur
    DHK: '#CC0000', // Dhekelia
    AKR: '#CC0000', // Akrotiri
    CYN: '#CCCCCC', // Cyprus no mans land
    GNT: '#B22234', // Guantanamo (US colors)
    SPI: '#006699', // Spratly Islands
    SCR: '#006699', // Scarborough Reef
    CPT: '#0055A4', // Clipperton (French)
    CSI: '#00008B', // Coral Sea
    ACA: '#00008B', // Ashmore Cartier
    IOT: '#012169', // British IOT
    IOT2: '#012169', // British IOT duplicate
    SIF: '#CCDDEE', // Patagonian ice
    BNB: '#006699', // Bajo Nuevo
    SRB2: '#006699', // Serranilla
    BRI: '#009C3B', // Brazilian island - green
};

console.log('Reading GeoJSON...');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let applied = 0;
let fallback = 0;

data.features.forEach(f => {
    const flagColor = FLAG_COLORS[f.id];
    if (flagColor) {
        f.properties.color = flagColor;
        applied++;
    } else {
        // Keep the existing golden-ratio color as fallback
        fallback++;
        console.log('  No flag color for: ' + f.id + ' (' + f.properties.name + ') — keeping ' + f.properties.color);
    }
});

fs.writeFileSync(FILE, JSON.stringify(data), 'utf8');
console.log('\nApplied flag colors: ' + applied + '/' + data.features.length);
console.log('Using fallback colors: ' + fallback);
console.log('Saved: ' + FILE);
