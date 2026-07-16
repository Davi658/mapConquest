/**
 * Map Conquest - Leaflet Map & Faction Command Board Engine
 * Uses XMLHttpRequest (sync) to load GeoJSON — compatible with file:// protocol
 */

class MapBoardController {
    constructor() {
        this.map = null;
        this.nationsData = null;
        this.geoJSONData = null;
        this.saveState = null;
        this.selectedCountryCode = null;
        this.selectedLayer = null;
        this.geojsonLayers = [];   // Holds the 1 or 3 world-copy GeoJSON layers
        this.initialized = false;
        /** ownershipMap: { [countryCode]: factionId } — tracks conquests */
        this.ownershipMap = {};
        /** allLayersByCode: { [countryCode]: L.Layer[] } — one entry per world copy */
        this.allLayersByCode = {};
        // Cache to store simplified GeoJSON by era and quality
        this.simplifiedCache = {};
    }

    /**
     * Completely destroys the Leaflet map instance and frees memory
     */
    destroyMap() {
        if (this.map) {
            console.log('MapBoard: removendo mapa e limpando camadas vetoriais...');
            try {
                this.geojsonLayers.forEach(l => l.remove());
            } catch (e) {
                console.warn('Erro ao remover camadas do MapBoard:', e);
            }
            this.geojsonLayers = [];
            this.allLayersByCode = {};
            
            try {
                this.map.remove();
            } catch (e) {
                console.warn('Erro ao remover instância do MapBoard:', e);
            }
            this.map = null;
        }
        this.initialized = false;
    }

    /**
     * Initializes the Leaflet map. Called lazily on first startCampaign().
     */
    initMap() {
        if (this.initialized) {
            // Already initialized — just invalidate size (container may have been hidden)
            this.map.invalidateSize();
            return;
        }

        const quality = window.Game.state.settings.quality || 'high';
        const useCanvas = quality === 'low' || quality === 'medium';
        const renderCopies = quality === 'high';

        console.log(`MapBoard: inicializando mapa. Qualidade: ${quality}, Canvas: ${useCanvas}, Cópias Globo: ${renderCopies}`);

        this.map = L.map('map-container-leaflet', {
            center: [20.0, 10.0],
            zoom: 3,
            minZoom: 2,
            maxZoom: 8,
            zoomControl: true,
            /**
             * worldCopyJump: true — the key to seamless infinite panning.
             * Only enabled on high quality to save rendering overhead on lower profiles.
             */
            worldCopyJump: renderCopies,
            preferCanvas: useCanvas,
            // Limit navigation on horizontal axis if copies are not rendered to avoid panning to grey background
            maxBounds: renderCopies ? null : L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
            maxBoundsViscosity: renderCopies ? 0.0 : 1.0
        });

        // Base Layer: World_Imagery (provides rich satellite photography with biomes, forests, and deserts without text)
        this.satelliteBaseLayer = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 8,
            maxNativeZoom: 19, // server supports up to zoom 19, ensuring ultra-crisp Retina textures at zoom 8
            noWrap: !renderCopies, // do not wrap tile layer if copies are disabled
            detectRetina: true, // prevents pixelation on high-DPI/Retina screens
            className: 'satellite-layer-tile',
            attribution: 'Tiles &copy; Esri &mdash; Source: Map source state'
        }).addTo(this.map);

        this.map.on('zoomend', () => {
            this.reapplyAllStyles();
        });

        this.initialized = true;

        // Bind HUD events
        this.bindPanelEvents();
    }

    /**
     * Returns the server-relative path to the historical GeoJSON for an era.
     * Historical files use real political boundaries from aourednik/historical-basemaps.
     * Served via http://localhost:3000 — fetch() works correctly with the local server.
     */
    getGeoJSONPathForEra(eraId) {
        const paths = {
            'modern':      'src/data/modern/world-countries-hires.geojson',
            'medieval':    'src/data/medieval/world-medieval.geojson',
            'napoleonic':  'src/data/napoleonic/world-napoleonic.geojson',
            'worldwars':   'src/data/worldwars/world-worldwars.geojson',
        };
        return paths[eraId] || 'src/data/modern/world-countries-hires.geojson';
    }

    /**
     * Resolves a GeoJSON 3-letter country code to its faction ID.
     * For the modern era, uses the embedded countryFactionMap from MC_NationsData_Modern.
     * @param {string} code ISO 3166-1 alpha-3 country code
     * @returns {string} faction ID
     */
    getNationForCountry(code) {
        if (this.countryFactionMap && this.countryFactionMap[code]) {
            return this.countryFactionMap[code];
        }
        return 'neutral';
    }

    /**
     * Main entry point. Loads GeoJSON via fetch (requires server) with inline fallback.
     * @param {Object} campaignState
     */
    async startCampaign(campaignState) {
        this.saveState = campaignState;

        const eraId = campaignState.metadata.eraId;

        // Load era-specific nations data and country→faction map dynamically
        let eraData = null;
        if (eraId === 'medieval') {
            eraData = window.MC_NationsData_Medieval;
        } else if (eraId === 'napoleonic') {
            eraData = window.MC_NationsData_Napoleonic;
        } else if (eraId === 'worldwars') {
            eraData = window.MC_NationsData_WorldWars;
        } else {
            eraData = window.MC_NationsData_Modern;
        }

        if (eraData) {
            this.nationsData = eraData.nations;
            this.countryFactionMap = eraData.countryFactionMap || {};
            this.puppetsMap = eraData.puppets || {};
            console.log(`Loaded ${eraId} nations configurations.`);
        } else {
            this.nationsData = {};
            this.countryFactionMap = {};
            this.puppetsMap = {};
            console.warn(`Dados da era "${eraId}" não encontrados.`);
        }

        // Initialize ownershipMap from default era countryFactionMap
        this.ownershipMap = {};
        if (this.countryFactionMap) {
            Object.keys(this.countryFactionMap).forEach(code => {
                this.ownershipMap[code] = this.countryFactionMap[code];
            });
        }

        // Override with saveState conquests if they exist
        if (campaignState && campaignState.territories) {
            Object.keys(campaignState.territories).forEach(code => {
                const t = campaignState.territories[code];
                if (t && t.nationId) {
                    this.ownershipMap[code] = t.nationId;
                }
            });
        }

        // Init Leaflet map lazily (only once)
        this.initMap();

        // Show loading indicator in HUD area
        const mapContainer = document.getElementById('map-container-leaflet');
        const loadingDiv = document.createElement('div');
        loadingDiv.id = 'map-loading-overlay';
        loadingDiv.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(7,9,14,0.75);z-index:9999;color:#e5c158;font-size:1.3rem;font-family:Cinzel,serif;letter-spacing:.05em;';
        loadingDiv.innerHTML = '⏳ Carregando e otimizando mapa...';
        mapContainer?.parentElement?.appendChild(loadingDiv);

        const quality = window.Game.state.settings.quality || 'high';
        const cacheKey = `${eraId}_${quality}`;

        if (this.simplifiedCache && this.simplifiedCache[cacheKey]) {
            this.geoJSONData = this.simplifiedCache[cacheKey];
            console.log(`MapBoard: usando GeoJSON simplificado de cache para ${cacheKey}`);
        } else {
            let rawGeoJSON = null;
            try {
                const geojsonPath = this.getGeoJSONPathForEra(eraId);
                console.log(`Carregando GeoJSON hi-res: ${geojsonPath}`);

                const res = await fetch(geojsonPath);
                if (!res.ok) throw new Error(`HTTP ${res.status}`);
                rawGeoJSON = await res.json();
                console.log(`GeoJSON carregado: ${rawGeoJSON.features.length} países`);
            } catch (fetchErr) {
                console.warn('Fetch falhou — usando fallback inline:', fetchErr.message);
                if (window.MC_GeoJSON_Modern) {
                    // Deep clone inline modern geojson to avoid mutating shared fallback
                    rawGeoJSON = JSON.parse(JSON.stringify(window.MC_GeoJSON_Modern));
                    console.log('Usando GeoJSON inline (baixa resolução)');
                } else {
                    loadingDiv?.remove();
                    alert('Erro: Não foi possível carregar os dados geográficos.\nCertifique-se de acessar via http://localhost:3000');
                    return;
                }
            }

            // Apply Turf.js simplification based on quality
            if (quality === 'low' && window.turf) {
                console.log('MapBoard: simplificando geometrias para qualidade Baixa (tolerância 0.04)...');
                this.geoJSONData = window.turf.simplify(rawGeoJSON, { tolerance: 0.04, highQuality: false, mutate: true });
            } else if (quality === 'medium' && window.turf) {
                console.log('MapBoard: simplificando geometrias para qualidade Média (tolerância 0.012)...');
                this.geoJSONData = window.turf.simplify(rawGeoJSON, { tolerance: 0.012, highQuality: false, mutate: true });
            } else {
                console.log('MapBoard: usando GeoJSON original em alta resolução...');
                this.geoJSONData = rawGeoJSON;
            }

            // Cache the result
            if (this.simplifiedCache) {
                this.simplifiedCache[cacheKey] = this.geoJSONData;
            }
        }

        // Remove loading indicator
        loadingDiv?.remove();

        // Build a color lookup from GeoJSON properties (generated by gen-country-colors.js)
        // { ISO3: '#hexcolor' }
        this.countryColorMap = {};
        this.geoJSONData.features.forEach(f => {
            if (f.id && f.properties && f.properties.color) {
                this.countryColorMap[f.id] = f.properties.color;
            }
        });
        console.log('Loaded colors for ' + Object.keys(this.countryColorMap).length + ' countries.');

        // Draw borders on map
        this.plotGeoJSONBorders();

        // Sync HUD
        this.updateHUD();
        document.querySelector('.hud-panel').style.display = 'flex';

        // Force Leaflet to recalculate layout after CSS transition
        setTimeout(() => {
            if (this.map) this.map.invalidateSize();
        }, 300);
    }

    /**
     * Generates a deterministic, unique pastel color from an entity ID string.
     * Produces the same color every time for the same ID (no randomness).
     * Used for historical eras where each territory has its own identity.
     * @param {string} id  entity slug (e.g. 'holy_roman_empire')
     * @returns {string} hsl color string
     */
    hashEntityColor(id) {
        let hash = 0;
        const str = String(id || 'x');
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
        }
        const hue        = hash % 360;
        const saturation = 45 + (hash >> 8) % 35;   // 45–80%  — vivid but not neon
        const lightness  = 55 + (hash >> 16) % 20;  // 55–75%  — pastel
        return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    }

    /**
     * Converts a hex color string to HSL object
     * @param {string} hex 
     * @returns {Object} { h, s, l }
     */
    hexToHsl(hex) {
        hex = String(hex || '#546e7a').replace(/^#/, '');
        if (hex.length === 3) {
            hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        }
        let r = parseInt(hex.substring(0, 2), 16) / 255;
        let g = parseInt(hex.substring(2, 4), 16) / 255;
        let b = parseInt(hex.substring(4, 6), 16) / 255;

        let max = Math.max(r, g, b), min = Math.min(r, g, b);
        let h, s, l = (max + min) / 2;

        if (max === min) {
            h = s = 0; // achromatic
        } else {
            let d = max - min;
            s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
            switch (max) {
                case r: h = (g - b) / d + (g < b ? 6 : 0); break;
                case g: h = (b - r) / d + 2; break;
                case b: h = (r - g) / d + 4; break;
            }
            h /= 6;
        }

        return {
            h: Math.round(h * 360),
            s: Math.round(s * 100),
            l: Math.round(l * 100)
        };
    }

    /**
     * Helper to parse an 'hsl(h, s%, l%)' string back into an object
     */
    parseHsl(hslStr) {
        const matches = hslStr.match(/\d+/g);
        if (matches && matches.length >= 3) {
            return {
                h: parseInt(matches[0], 10),
                s: parseInt(matches[1], 10),
                l: parseInt(matches[2], 10)
            };
        }
        return { h: 210, s: 50, l: 50 }; // default fallback
    }

    /**
     * Generates a deterministic unique shade of a base color based on a string code.
     * @param {string} baseColorHex hex or hsl string
     * @param {string} code country code/id
     * @returns {string} hsl color string
     */
    generateColorShade(baseColorHex, code) {
        let hsl = baseColorHex.startsWith('hsl') ? 
            this.parseHsl(baseColorHex) : 
            this.hexToHsl(baseColorHex);

        let hash = 0;
        const str = String(code || 'x');
        for (let i = 0; i < str.length; i++) {
            hash = (hash * 31 + str.charCodeAt(i)) >>> 0;
        }

        // Tweak HSL deterministically using the hash
        // Hue shift: ±8 degrees (subtle shift in tone)
        const hShift = -8 + (hash % 17); // -8 to +8
        const newH = (hsl.h + hShift + 360) % 360;

        // Saturation shift: ±12%
        const sShift = -12 + ((hash >> 4) % 25); // -12 to +12
        const newS = Math.max(25, Math.min(95, hsl.s + sShift));

        // Lightness shift: ±10%
        const lShift = -10 + ((hash >> 8) % 21); // -10 to +10
        const newL = Math.max(30, Math.min(80, hsl.l + lShift));

        return `hsl(${newH}, ${newS}%, ${newL}%)`;
    }

    /**
     * Returns the display color for a country.
     * Priority: ownershipMap (conquered faction) > hashEntityColor (unique per entity)
     * @param {string} code
     * @returns {string} color
     */
    getOwnerColor(code) {
        // 1. If conquered/owned by a faction, use that faction's color (shaded by country)
        const conquerorId = this.ownershipMap[code];
        if (conquerorId && this.nationsData && this.nationsData[conquerorId]) {
            const baseColor = this.nationsData[conquerorId].color;
            return this.generateColorShade(baseColor, code);
        }
        // 2. If the country has a pre-defined color in the GeoJSON (like modern era), use it
        if (this.countryColorMap && this.countryColorMap[code]) {
            return this.countryColorMap[code];
        }
        // 3. If the campaign has a specific neutral color, use it as a clean unified fallback (shaded by country)
        if (this.nationsData && this.nationsData['neutral'] && this.nationsData['neutral'].color) {
            const baseColor = this.nationsData['neutral'].color;
            return this.generateColorShade(baseColor, code);
        }
        // 4. Ultimate fallback: generate a deterministic unique color
        return this.hashEntityColor(code);
    }

    /**
     * Builds and returns the canonical Leaflet style for a country layer.
     * Uses unique per-country colors. Conquered territories show the faction color.
     * @param {string} code  ISO3 country code
     * @param {boolean} selected  true when the country is clicked/selected
     * @param {boolean} hovered   true during mouseover
     * @returns {L.PathOptions}
     */
    getCountryStyle(code, selected = false, hovered = false) {
        const baseColor = this.getOwnerColor(code);
        const zoom = this.map ? this.map.getZoom() : 3;

        if (zoom >= 6) {
            // Zoomed in: borders are black, fills disappear (transparent)
            return {
                color:       selected ? '#ffffff' : '#000000',
                weight:      selected ? 3.0 : hovered ? 2.0 : 1.0,
                opacity:     selected ? 1.0 : hovered ? 0.8 : 0.6,
                fillColor:   baseColor, // keep fillColor so selection/hover targets still work
                fillOpacity: selected ? 0.25 : hovered ? 0.12 : 0.0
            };
        } else {
            // Zoomed out (global view): full vintage colors
            return {
                color:       selected ? '#ffffff' : baseColor,
                weight:      selected ? 3.5 : hovered ? 2.5 : 1.0,
                opacity:     selected ? 1.0 : 0.9,
                fillColor:   baseColor,
                fillOpacity: selected ? 0.82 : hovered ? 0.72 : 0.58
            };
        }
    }

    /**
     * Restores a layer to its correct current style (ownership-aware).
     */
    restoreStyle(code, layer) {
        layer.setStyle(this.getCountryStyle(code));
    }

    /**
     * Re-applies current style rules to all loaded country layers on the map.
     * Triggered on map zoom events.
     */
    reapplyAllStyles() {
        if (!this.allLayersByCode) return;
        Object.keys(this.allLayersByCode).forEach(code => {
            const isSelected = (this.selectedCountryCode === code);
            this.setStyleAllCopies(code, isSelected, false);
        });
    }

    /**
     * Updates the tooltip for a layer.
     * Tooltips disabled per user request.
     */
    refreshTooltip(code, layer, name) {
        // Tooltips disabled per user request - do not bind anything
    }

    /**
     * Applies a style to ALL world-copy layers for a given country code.
     * @param {string} code
     * @param {boolean} selected
     * @param {boolean} hovered
     */
    setStyleAllCopies(code, selected = false, hovered = false) {
        const style = this.getCountryStyle(code, selected, hovered);
        (this.allLayersByCode[code] || []).forEach(l => l.setStyle(style));
    }

    /**
     * Restores ALL world-copy layers for a country to their correct ownership style.
     */
    restoreStyleAllCopies(code) {
        this.setStyleAllCopies(code, false, false);
    }

    /**
     * Updates tooltips on ALL world-copy layers for a country.
     */
    refreshTooltipAllCopies(code, name) {
        (this.allLayersByCode[code] || []).forEach(l => this.refreshTooltip(code, l, name));
    }

    /**
     * Creates a single GeoJSON layer at a given longitude offset.
     * Uses coordsToLatLng to shift rendering WITHOUT duplicating the data object.
     * @param {number} lngOffset  0, -360, or +360
     * @returns {L.GeoJSON}
     */
    createWorldCopyLayer(lngOffset) {
        return L.geoJSON(this.geoJSONData, {
            // Shift coordinates at render time — no data clone needed
            coordsToLatLng: (c) => new L.LatLng(c[1], c[0] + lngOffset, c[2]),

            style: (feature) => this.getCountryStyle(feature.id),

            onEachFeature: (feature, layer) => {
                // Register this layer under its country code
                if (!this.allLayersByCode[feature.id]) {
                    this.allLayersByCode[feature.id] = [];
                }
                this.allLayersByCode[feature.id].push(layer);

                this.refreshTooltip(feature.id, layer, feature.properties.name);

                layer.on('mouseover', () => {
                    if (window.Game) window.Game.playHoverSound();
                    if (this.selectedCountryCode !== feature.id) {
                        this.setStyleAllCopies(feature.id, false, true);
                    }
                });

                layer.on('mouseout', () => {
                    if (this.selectedCountryCode !== feature.id) {
                        this.restoreStyleAllCopies(feature.id);
                    }
                });

                layer.on('click', () => {
                    if (window.Game) window.Game.playClickSound();
                    // Always select using the feature data; the clicked layer is passed
                    // for highlight but style updates propagate to all copies via allLayersByCode
                    this.selectCountry(feature, layer);
                });
            }
        });
    }

    /**
     * Renders the world countries GeoJSON in 3 longitude copies:
     * -360° (west copy), 0° (main), +360° (east copy).
     * This ensures all painted countries appear seamlessly on infinite pan.
     */
    plotGeoJSONBorders() {
        // Remove all existing world-copy layers
        this.geojsonLayers.forEach(l => l.remove());
        this.geojsonLayers = [];
        this.allLayersByCode = {};

        const quality = window.Game.state.settings.quality || 'high';
        const offsets = quality === 'high' ? [-360, 0, 360] : [0];

        console.log(`MapBoard: desenhando ${offsets.length} cópia(s) do globo (Offsets: ${offsets.join(', ')})`);

        // Create world copies
        offsets.forEach(offset => {
            const layer = this.createWorldCopyLayer(offset).addTo(this.map);
            this.geojsonLayers.push(layer);
        });
    }


    /**
     * Selects a country and populates the Command Panel
     */
    selectCountry(feature, layer) {
        // Restore ALL world-copy layers of previous selection
        if (this.selectedCountryCode) {
            this.restoreStyleAllCopies(this.selectedCountryCode);
        }

        this.selectedCountryCode = feature.id;
        this.selectedLayer = layer;

        // Highlight ALL world-copy layers for this country
        this.setStyleAllCopies(feature.id, true);

        // Determine ownership: conquered faction or independent
        const conquerorId = this.ownershipMap[feature.id];
        const conquerorNation = conquerorId && this.nationsData ? this.nationsData[conquerorId] : null;
        const countryColor = this.getOwnerColor(feature.id);
        const playerFactionId = this.saveState.metadata.eraId;
        // isPlayerOwned: true if the player's faction currently controls this territory
        let isPlayerOwned = conquerorId === playerFactionId;

        // Initialize territory state if first visit
        if (!this.saveState.territories[feature.id]) {
            this.saveState.territories[feature.id] = {
                troops:    80,
                goldRate:  30,
                name:      feature.properties.name,
                nationId:  conquerorId || 'neutral'
            };
        }

        const state = this.saveState.territories[feature.id];

        // Display-friendly name: prefer properties.name, fall back to humanizing the id
        const displayName = feature.properties.name ||
            String(feature.id || '').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        document.getElementById('province-title').innerHTML =
            '<span>' + displayName + '</span>' +
            '<span class="btn-close-command" id="btn-close-panel">&times;</span>';
        document.getElementById('stat-region').textContent = feature.id;

        // Populate Facção/Aliança
        const factionBadge = document.getElementById('stat-faction');
        if (conquerorNation) {
            factionBadge.textContent = (conquerorNation.flag || '') + ' ' + conquerorNation.name;
            factionBadge.style.cssText = 'background:' + conquerorNation.color + '25; border:1px solid ' + conquerorNation.color + '; border-radius:4px; padding:2px 6px;';
        } else {
            factionBadge.textContent = '\ud83c\udff3\ufe0f Independente';
            factionBadge.style.cssText = 'background:' + countryColor + '25; border:1px solid ' + countryColor + '; border-radius:4px; padding:2px 6px;';
        }

        // Check if this country is historically a puppet, colony or protectorate, and check if it hasn't changed ownership
        const originalOwner = this.countryFactionMap && this.countryFactionMap[feature.id];
        const isOriginalOwner = (originalOwner === conquerorId);

        const rowController = document.getElementById('row-controller');
        const statController = document.getElementById('stat-controller');
        if (isOriginalOwner && this.puppetsMap && this.puppetsMap[feature.id]) {
            // It is a puppet/colony/protectorate! Show the row and set the controller description
            rowController.style.display = 'flex';
            statController.textContent = this.puppetsMap[feature.id];
            statController.style.cssText = 'background: rgba(229, 193, 88, 0.1); border: 1px solid rgba(229, 193, 88, 0.4); border-radius: 4px; padding: 2px 6px; color: var(--color-gold);';
        } else if (!isOriginalOwner && conquerorNation) {
            // Conquered during the game! Show which faction annexed/conquered it
            rowController.style.display = 'flex';
            statController.textContent = `Anexado por ${conquerorNation.name}`;
            statController.style.cssText = 'background: rgba(224, 58, 58, 0.1); border: 1px solid rgba(224, 58, 58, 0.4); border-radius: 4px; padding: 2px 6px; color: #e03a3a;';
        } else {
            // Directly controlled core nation or independent country. Hide the row!
            rowController.style.display = 'none';
        }

        document.getElementById('stat-troops').textContent = state.troops;
        document.getElementById('stat-taxes').textContent = '+' + state.goldRate + ' Gold / turno';

        // Re-evaluate isPlayerOwned using the saved state (handles page reload / loaded saves)
        isPlayerOwned = (state.nationId === playerFactionId);
        const actionsStack = document.getElementById('actions-stack');

        if (isPlayerOwned) {
            actionsStack.innerHTML = `
                <button id="btn-action-recruit" class="btn-menu">⚔️ Recrutar Exércitos (Custo: 50 Gold)</button>
                <button id="btn-action-tax" class="btn-menu">💰 Cobrar Impostos</button>
            `;
            this.bindActionEvents();
        } else {
            actionsStack.innerHTML = `
                <button id="btn-action-attack" class="btn-menu btn-danger">⚔️ Invadir Território</button>
            `;
            document.getElementById('btn-action-attack').addEventListener('click', () => {
                if (window.Game) window.Game.playClickSound();
                this.expandBordersToCountry();
            });
        }

        document.getElementById('command-panel').classList.add('active');

        document.getElementById('btn-close-panel').addEventListener('click', () => {
            if (window.Game) window.Game.playClickSound();
            document.getElementById('command-panel').classList.remove('active');
            if (this.selectedCountryCode) {
                this.restoreStyleAllCopies(this.selectedCountryCode);
            }
            this.selectedCountryCode = null;
            this.selectedLayer = null;
        });
    }

    /**
     * Binds recruit/tax action buttons
     */
    bindActionEvents() {
        const recruitBtn = document.getElementById('btn-action-recruit');
        const taxBtn = document.getElementById('btn-action-tax');

        recruitBtn?.addEventListener('click', () => {
            if (window.Game) window.Game.playClickSound();
            this.recruitTroops();
        });
        taxBtn?.addEventListener('click', () => {
            if (window.Game) window.Game.playClickSound();
            this.collectTaxes();
        });
    }

    bindPanelEvents() {
        const endTurnBtn = document.getElementById('btn-end-turn');
        endTurnBtn?.addEventListener('click', () => {
            if (window.Game) window.Game.playClickSound();
            this.endTurn();
        });
    }

    recruitTroops() {
        if (!this.selectedCountryCode) return;
        if (this.saveState.territories.gold < 50) {
            alert('Ouro insuficiente! (Custo: 50 Gold)');
            return;
        }
        this.saveState.territories.gold -= 50;
        const state = this.saveState.territories[this.selectedCountryCode];
        state.troops += 50;
        this.persistCampaignProgress();
        this.updateHUD();
        document.getElementById('stat-troops').textContent = state.troops;
        alert(`+50 tropas em ${state.name}.`);
    }

    collectTaxes() {
        if (!this.selectedCountryCode) return;
        const state = this.saveState.territories[this.selectedCountryCode];
        if (state.taxCollectedThisTurn) {
            alert('Impostos já recolhidos neste turno!');
            return;
        }
        this.saveState.territories.gold += state.goldRate;
        state.taxCollectedThisTurn = true;
        this.persistCampaignProgress();
        this.updateHUD();
        alert(`+${state.goldRate} Gold recolhidos.`);
    }

    expandBordersToCountry() {
        if (!this.selectedCountryCode || !this.selectedLayer) return;
        const code = this.selectedCountryCode;
        const state = this.saveState.territories[code];
        const playerFaction = this.saveState.metadata.eraId;
        const playerNation = this.nationsData[playerFaction] || { color: '#e03a3a', name: 'Sua Nação', flag: '👑' };

        if (confirm(`Invadir ${state.name} para ${playerNation.name}?`)) {
            state.nationId = playerFaction;
            state.troops = Math.max(10, state.troops - 40);

            // Record conquest — getCountryStyle will use this for all copies
            this.ownershipMap[code] = playerFaction;

            // Update ALL world-copy layers and tooltips simultaneously
            this.restoreStyleAllCopies(code);
            this.refreshTooltipAllCopies(code, state.name);

            this.persistCampaignProgress();
            this.selectCountry({ id: code, properties: { name: state.name } }, this.selectedLayer);
            alert(`${state.name} conquistada! 🏆`);
        }
    }

    endTurn() {
        this.saveState.turn += 1;
        let income = 0;
        const faction = this.saveState.metadata.eraId;

        Object.keys(this.saveState.territories).forEach(code => {
            const t = this.saveState.territories[code];
            if (t && t.nationId === faction) {
                t.taxCollectedThisTurn = false;
                income += t.goldRate || 0;
            }
        });

        this.saveState.territories.gold += income;
        this.persistCampaignProgress();
        this.updateHUD();
        alert(`Turno ${this.saveState.turn} iniciado.\n+${income} Gold de renda territorial.`);
    }

    updateHUD() {
        const meta = this.saveState.metadata;
        document.getElementById('hud-campaign-name').textContent = meta.name;
        document.getElementById('hud-turn-count').textContent = this.saveState.turn;
        document.getElementById('hud-gold-count').textContent = this.saveState.territories.gold;
        const eraLabel = document.getElementById('hud-era-name');
        if (eraLabel) eraLabel.textContent = `${meta.eraName} (${meta.eraYear})`;
    }

    persistCampaignProgress() {
        const saveId = this.saveState.metadata.id;
        let saves = window.Game.getCookie('mc_saves') || [];
        const idx = saves.findIndex(s => String(s.id) === String(saveId));
        if (idx !== -1) {
            saves[idx].date = new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
            window.Game.setCookie('mc_saves', saves);
        }
        if (window.Game.state.saveDirectoryHandle) {
            window.Game.writeSaveFile(`save_${saveId}.json`, JSON.stringify(this.saveState, null, 4))
                .catch(err => {
                    console.warn('Erro ao salvar arquivo, usando LocalStorage fallback:', err);
                    localStorage.setItem(`mc_save_${saveId}`, JSON.stringify(this.saveState));
                });
        } else {
            localStorage.setItem(`mc_save_${saveId}`, JSON.stringify(this.saveState));
        }
    }
}

window.MapBoard = new MapBoardController();
// NOTE: DO NOT call initMap() here — it's called lazily inside startCampaign()
