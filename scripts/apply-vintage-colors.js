/**
 * Vintage map color palette — inspired by historical atlas cartography.
 * Colors are muted-saturated pastels with high contrast between neighbors.
 * Large palette with ~12 distinct hues, ensuring no two adjacent countries share the same hue.
 *
 * Hue families:
 *  A = Salmon/Rose      #C47870
 *  B = Blue (muted)     #4A7DB5  ← USA
 *  C = Green            #5B9060
 *  D = Lavender/Purple  #8B7BB5
 *  E = Teal             #5B9B9B
 *  F = Ochre/Gold       #C4AA5B
 *  G = Orange/Rust      #C47B4A
 *  H = Gray-brown       #8B7B6B  ← Germany
 *  I = Olive            #7B8B5B
 *  J = Light green      #7BA87B
 *  K = Cream/tan        #C4B48B
 *  L = Yellow           #D4BB6A
 *  M = Grayish-white    #C4C8CC  ← Greenland/Antarctica
 *  N = Dusty rose       #B57B8B
 */
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'src', 'data', 'modern', 'world-countries-hires.geojson');

const COLORS = {
    // ── North America ──────────────────────────────────────────────────────
    USA: '#4A7DB5', // Blue (user request)
    CAN: '#C47870', // Salmon (contrasts USA blue)
    MEX: '#5B9B9B', // Teal (contrasts Canada salmon, USA blue)
    GRL: '#C4C8CC', // Grayish-white (user request)
    // ── Central America ────────────────────────────────────────────────────
    GTM: '#7BA87B', // Light green
    BLZ: '#C47B4A', // Orange/rust
    HND: '#8B7BB5', // Lavender
    SLV: '#C4AA5B', // Ochre
    NIC: '#5B9B9B', // Teal
    CRI: '#C47870', // Salmon
    PAN: '#C4AA5B', // Ochre
    // ── Caribbean ──────────────────────────────────────────────────────────
    CUB: '#4A7DB5', // Blue
    JAM: '#7BA87B', // Light green
    HTI: '#C47870', // Salmon
    DOM: '#8B7BB5', // Lavender
    TTO: '#C47B4A', // Rust
    BRB: '#5B9B9B', // Teal
    ATG: '#C4AA5B', // Ochre
    KNA: '#C47870', // Salmon
    DMA: '#7BA87B', // Light green
    LCA: '#8B7BB5', // Lavender
    GRD: '#C47B4A', // Rust
    VCT: '#C4AA5B', // Ochre
    BHS: '#4A7DB5', // Blue
    BLZ: '#C47870', // Salmon
    BRB: '#5B9B9B', // Teal
    // ── South America ──────────────────────────────────────────────────────
    BRA: '#5B9060', // Green (iconic)
    ARG: '#8B7BB5', // Lavender (contrasts Chile and Brazil)
    CHL: '#C47870', // Salmon (contrasts Argentina lavender)
    COL: '#C4AA5B', // Ochre/gold (contrasts Venezuela, Ecuador)
    VEN: '#5B9B9B', // Teal
    PER: '#8B7BB5', // Lavender/purple
    BOL: '#D4BB6A', // Yellow (landlocked — contrasts Peru/Brazil/Argentina)
    ECU: '#C47B4A', // Rust/orange
    PRY: '#7BA87B', // Light green
    URY: '#4A7DB5', // Blue (contrasts Argentina lavender)
    GUY: '#C47B4A', // Rust
    SUR: '#7BA87B', // Light green
    // ── Europe ─────────────────────────────────────────────────────────────
    GBR: '#5B9B9B', // Teal
    IRL: '#5B9060', // Green
    FRA: '#4A7DB5', // Blue
    ESP: '#C47B4A', // Rust/orange
    PRT: '#7BA87B', // Light green (contrasts Spain rust)
    DEU: '#8B7B6B', // Gray-brown (user request)
    ITA: '#C4AA5B', // Ochre/gold
    CHE: '#C47870', // Salmon
    AUT: '#8B7BB5', // Lavender
    BEL: '#D4BB6A', // Yellow
    NLD: '#C47B4A', // Orange (Dutch orange!)
    LUX: '#7BA87B', // Light green
    DNK: '#C47870', // Salmon
    NOR: '#5B9B9B', // Teal
    SWE: '#7B8B5B', // Olive
    FIN: '#C4AA5B', // Ochre
    ISL: '#4A7DB5', // Blue
    POL: '#C47870', // Salmon (contrasts Germany gray and Russia olive)
    CZE: '#D4BB6A', // Yellow
    SVK: '#5B9B9B', // Teal
    HUN: '#C47B4A', // Rust/orange
    ROU: '#7BA87B', // Light green
    BGR: '#8B7BB5', // Lavender
    GRC: '#4A7DB5', // Blue
    UKR: '#7B8B5B', // Olive (large area — contrasts Russia and Poland)
    BLR: '#C47870', // Salmon
    MDA: '#D4BB6A', // Yellow
    LTU: '#5B9B9B', // Teal
    LVA: '#C47B4A', // Rust
    EST: '#7BA87B', // Light green
    RUS: '#7B8B5B', // Olive (large, iconic)
    SRB: '#C47870', // Salmon
    HRV: '#5B9B9B', // Teal
    BIH: '#8B7BB5', // Lavender
    SVN: '#C4AA5B', // Ochre
    MKD: '#C47B4A', // Rust
    MNE: '#7BA87B', // Light green
    KOS: '#4A7DB5', // Blue
    XKX: '#4A7DB5', // Blue (Kosovo — same)
    ALB: '#C47870', // Salmon
    MCO: '#C47870', // Salmon (tiny)
    AND: '#5B9B9B', // Teal (tiny)
    SMR: '#7BA87B', // Light green (tiny)
    LIE: '#8B7BB5', // Lavender
    MLT: '#C47870', // Salmon (island)
    CYP: '#D4BB6A', // Yellow (island)
    GEO: '#C47B4A', // Rust
    ARM: '#C47870', // Salmon
    AZE: '#5B9B9B', // Teal
    TUR: '#C47870', // Salmon/rose
    VAT: '#D4BB6A', // Gold (tiny)
    // ── Russia & Central Asia ─────────────────────────────────────────────
    KAZ: '#C4B48B', // Cream/tan (vast steppe, contrasts Russia olive)
    UZB: '#C47B4A', // Rust
    TKM: '#D4BB6A', // Yellow
    TJK: '#8B7BB5', // Lavender
    KGZ: '#7BA87B', // Light green
    MNG: '#C4AA5B', // Ochre (Mongolian steppe)
    // ── Middle East ────────────────────────────────────────────────────────
    IRN: '#C4AA5B', // Ochre/gold (Persia — tan, like reference map)
    IRQ: '#C47B4A', // Rust
    SYR: '#7BA87B', // Light green
    JOR: '#D4BB6A', // Sand/yellow
    LBN: '#C47870', // Salmon
    ISR: '#4A7DB5', // Blue
    PSE: '#8B7BB5', // Lavender
    SAU: '#D4BB6A', // Sand/gold (large — tan like reference)
    ARE: '#C4AA5B', // Ochre
    QAT: '#C47870', // Salmon
    KWT: '#D4BB6A', // Sand
    BHR: '#C47870', // Salmon
    OMN: '#C47B4A', // Rust
    YEM: '#8B7BB5', // Lavender
    AFG: '#C4B48B', // Cream/tan
    // ── South Asia ────────────────────────────────────────────────────────
    IND: '#C47870', // Salmon/rose (like reference map)
    PAK: '#7B8B5B', // Olive (contrasts India salmon)
    BGD: '#5B9B9B', // Teal
    LKA: '#C47B4A', // Rust (island)
    NPL: '#D4BB6A', // Yellow (Himalayas)
    BTN: '#C47B4A', // Rust/orange
    MDV: '#5B9B9B', // Teal (islands)
    // ── East Asia ─────────────────────────────────────────────────────────
    CHN: '#C4B48B', // Cream/tan (Great Qing reference map style)
    JPN: '#C47870', // Salmon/rose (island — not adjacent to China)
    KOR: '#5B9B9B', // Teal
    PRK: '#8B7B6B', // Gray-brown
    TWN: '#C47B4A', // Rust (island)
    HKG: '#C47870', // Salmon
    MAC: '#D4BB6A', // Ochre
    // ── Southeast Asia ────────────────────────────────────────────────────
    MMR: '#7B8B5B', // Olive
    THA: '#4A7DB5', // Blue
    VNM: '#C47870', // Salmon
    KHM: '#C47B4A', // Rust
    LAO: '#8B7BB5', // Lavender
    PHL: '#5B9B9B', // Teal (archipelago)
    IDN: '#C47B4A', // Rust/orange (archipelago)
    MYS: '#7BA87B', // Light green
    SGP: '#4A7DB5', // Blue (tiny)
    BRN: '#C4AA5B', // Ochre
    TLS: '#C47870', // Salmon
    // ── Africa ───────────────────────────────────────────────────────────
    MAR: '#C47870', // Salmon
    DZA: '#C4B48B', // Cream/tan (large Sahara)
    TUN: '#D4BB6A', // Yellow
    LBY: '#C4AA5B', // Ochre
    EGY: '#D4BB6A', // Sand/gold (Nile delta)
    SDN: '#C47B4A', // Rust
    SSD: '#7BA87B', // Light green
    ETH: '#7B8B5B', // Olive
    ERI: '#C47870', // Salmon
    DJI: '#5B9B9B', // Teal
    SOM: '#C4AA5B', // Ochre
    KEN: '#C47870', // Salmon
    UGA: '#C47B4A', // Rust
    TZA: '#7BA87B', // Light green
    RWA: '#4A7DB5', // Blue
    BDI: '#C47870', // Salmon
    MOZ: '#8B7BB5', // Lavender
    ZWE: '#5B9060', // Green
    ZMB: '#C4AA5B', // Ochre
    MWI: '#C47B4A', // Rust
    MDG: '#8B7BB5', // Lavender (island)
    COM: '#5B9B9B', // Teal (island)
    SYC: '#D4BB6A', // Yellow (island)
    MUS: '#C47870', // Salmon (island)
    ZAF: '#4A7DB5', // Blue (contrasts neighbors)
    LSO: '#C4AA5B', // Ochre (enclave)
    SWZ: '#C47870', // Salmon
    NAM: '#D4BB6A', // Sand/yellow (Namib desert)
    BWA: '#C4B48B', // Cream/tan (Kalahari)
    AGO: '#C47B4A', // Rust
    COG: '#7BA87B', // Light green
    COD: '#4A7DB5', // Blue (large)
    CAF: '#8B7BB5', // Lavender
    CMR: '#C4AA5B', // Ochre
    NGA: '#5B9060', // Green
    GNQ: '#C47870', // Salmon
    GAB: '#7B8B5B', // Olive
    STP: '#5B9B9B', // Teal (island)
    TCD: '#D4BB6A', // Yellow (Chad — Saharan)
    NER: '#C4B48B', // Cream/tan (Saharan)
    MLI: '#C4AA5B', // Ochre
    BFA: '#C47870', // Salmon
    GHA: '#C47B4A', // Rust
    TGO: '#7BA87B', // Light green
    BEN: '#8B7BB5', // Lavender
    GIN: '#C47870', // Salmon
    GNB: '#5B9B9B', // Teal
    SLE: '#7B8B5B', // Olive
    LBR: '#C47B4A', // Rust
    CIV: '#D4BB6A', // Ochre/gold
    SEN: '#C47870', // Salmon
    GMB: '#5B9B9B', // Teal (enclave in Senegal)
    MRT: '#C4B48B', // Cream/tan (desert)
    ESH: '#D4BB6A', // Sand/yellow (Saharan)
    // ── Oceania ───────────────────────────────────────────────────────────
    AUS: '#C4AA5B', // Ochre (outback, contrasts ocean blue)
    NZL: '#7BA87B', // Light green
    PNG: '#C47B4A', // Rust
    FJI: '#5B9B9B', // Teal
    SLB: '#7BA87B', // Light green
    VUT: '#C47B4A', // Rust
    WSM: '#C47870', // Salmon
    TON: '#8B7BB5', // Lavender
    KIR: '#5B9B9B', // Teal
    FSM: '#4A7DB5', // Blue
    MHL: '#C47870', // Salmon
    PLW: '#7BA87B', // Light green
    NRU: '#C47B4A', // Rust
    TUV: '#5B9B9B', // Teal
    // ── Territories ───────────────────────────────────────────────────────
    ATA: '#C4C8CC', // Grayish-white (Antarctica)
    FLK: '#5B9B9B', // Teal (Falklands — British)
    SGS: '#5B9B9B', // Teal
    NCL: '#C47B4A', // Rust
    PYF: '#4A7DB5', // Blue
    ATF: '#C4C8CC', // Grayish
    GIB: '#C47870', // Salmon
    HKG: '#C47870', // Salmon
    MAF: '#4A7DB5', // Blue
    SXM: '#4A7DB5', // Blue
    ABW: '#D4BB6A', // Ochre
    TCA: '#5B9B9B', // Teal
    SPM: '#4A7DB5', // Blue
    PCN: '#5B9B9B', // Teal
    UMI: '#4A7DB5', // Blue
    MSR: '#7BA87B', // Light green
    VIR: '#4A7DB5', // Blue
    BLM: '#4A7DB5', // Blue
    PRI: '#4A7DB5', // Blue
    AIA: '#5B9B9B', // Teal
    VGB: '#5B9B9B', // Teal
    CYM: '#7BA87B', // Light green
    BMU: '#C47870', // Salmon
    HMD: '#C4C8CC', // Gray-white
    SHN: '#5B9B9B', // Teal
    JEY: '#C47870', // Salmon
    GGY: '#D4BB6A', // Ochre
    IMN: '#C47870', // Salmon
    ALA: '#5B9B9B', // Teal
    FRO: '#C47870', // Salmon
    NFK: '#7BA87B', // Light green
    COK: '#5B9B9B', // Teal
    WLF: '#C47870', // Salmon
    NIU: '#5B9B9B', // Teal
    ASM: '#4A7DB5', // Blue
    GUM: '#4A7DB5', // Blue
    MNP: '#5B9B9B', // Teal
    // ── Special territories ───────────────────────────────────────────────
    NCY: '#C47870', // Salmon (Northern Cyprus)
    SOL: '#5B9B9B', // Teal (Somaliland)
    SIA: '#C4C8CC', // Gray (Siachen glacier)
    BWT: '#D4BB6A', // Sand (Bir Tawil)
    BYK: '#C4B48B', // Cream (Baykonur)
    DHK: '#C47870', // Salmon (Dhekelia)
    AKR: '#C47870', // Salmon (Akrotiri)
    CYN: '#C4C8CC', // Gray (Cyprus no mans land)
    GNT: '#4A7DB5', // Blue (Guantanamo)
    SPI: '#5B9B9B', // Teal (Spratly Islands)
    SCR: '#5B9B9B', // Teal (Scarborough Reef)
    CPT: '#4A7DB5', // Blue (Clipperton)
    CSI: '#7BA87B', // Light green (Coral Sea)
    ACA: '#7BA87B', // Light green (Ashmore Cartier)
    IOT: '#5B9B9B', // Teal (British Indian Ocean)
    IOT2: '#5B9B9B', // Teal (duplicate)
    SIF: '#C4C8CC', // Gray (Patagonian ice)
    BNB: '#5B9B9B', // Teal (Bajo Nuevo)
    SRB2: '#5B9B9B', // Teal (Serranilla)
    BRI: '#5B9060', // Green (Brazilian island)
    CUW: '#4A7DB5', // Blue (Curacao)
};

console.log('Reading GeoJSON...');
const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));

let applied = 0;
let fallback = 0;

data.features.forEach(f => {
    const color = COLORS[f.id];
    if (color) {
        f.properties.color = color;
        applied++;
    } else {
        fallback++;
        console.log('  No vintage color for: ' + f.id + ' (' + f.properties.name + ')');
    }
});

fs.writeFileSync(FILE, JSON.stringify(data), 'utf8');
console.log('\nApplied vintage map colors: ' + applied + '/' + data.features.length);
if (fallback > 0) console.log('Fallback colors kept: ' + fallback);
console.log('Saved: ' + FILE);
