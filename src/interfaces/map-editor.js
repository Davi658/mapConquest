/**
 * Map Conquest - GEE-Inspired Map & Border Editor Controller
 * Manages drawing, editing, and layering GeoJSON borders like Google Earth Engine.
 */

class MapEditorController {
    constructor() {
        this.map = null;
        this.geoJSONData = null;
        this.selectedEra = 'napoleonic';
        this.selectedFeatureId = null;
        this.selectedLayer = null;
        
        // Maps feature.id (or properties.entityId) -> L.Layer
        this.layersMap = {};
        this.initialized = false;
        
        // Factions/Layers list: Maps layerId (e.g. 'france') -> { name: 'France', color: '#0000ff', visible: true, locked: false }
        this.geeLayers = {};
        this.activeGeeLayerId = null;
        this.editingLayerId = null; // Used by settings modal

        // Base paths for GeoJSON files
        this.paths = {
            'modern':      'src/data/modern/world-countries-hires.geojson',
            'medieval':    'src/data/medieval/world-medieval.geojson',
            'napoleonic':  'src/data/napoleonic/world-napoleonic.geojson',
            'worldwars':   'src/data/worldwars/world-worldwars.geojson',
        };

        // Undo/Redo Stacks
        this.undoStack = [];
        this.redoStack = [];
        this.basemaps = {};
        this.currentBasemap = null;

        // Hovered Marker tracking (for keyboard shortcuts like Blender)
        this.hoveredMarker = null;
        this.hoveredMarkerLayer = null;

        // Annexation Mode tracking
        this.isAnnexMode = false;
        this.isCutMode = false;

        // Multi-selection and Separate Island tracking
        this.selectedVertices = []; // Array of { marker, layer, indexPath }
        this.selectedPaths = {}; // Map of "ringIndex,vertexIndex" -> true
        this.isSeparateIslandMode = false;
        this.draggedMarkerStartLatLng = null;
    }

    /**
     * Completely destroys the Leaflet map instance and frees memory
     */
    destroyMap() {
        if (this.map) {
            console.log('MapEditor: removendo mapa e limpando recursos...');
            
            // Disable Geoman drawing if active
            try {
                if (this.map.pm) {
                    this.map.pm.disableDraw();
                    this.map.pm.disableGlobalEditMode();
                }
            } catch (e) {
                console.warn('Erro ao desativar Geoman:', e);
            }

            // Remove layers
            Object.keys(this.layersMap).forEach(key => {
                const layer = this.layersMap[key];
                if (layer) {
                    try {
                        layer.remove();
                    } catch (e) {
                        console.warn(`Erro ao remover layer ${key}:`, e);
                    }
                }
            });
            this.layersMap = {};
            this.geeLayers = {};

            try {
                this.map.remove();
            } catch (e) {
                console.warn('Erro ao remover instância do MapEditor:', e);
            }
            this.map = null;
        }
        this.initialized = false;
    }

    /**
     * Lazy initializes the Leaflet Map in GEE-editor mode
     */
    initEditor() {
        if (this.initialized) {
            setTimeout(() => {
                if (this.map) this.map.invalidateSize();
            }, 50);
            return;
        }

        const quality = window.Game.state.settings.quality || 'high';
        const useCanvas = quality === 'low' || quality === 'medium';
        const renderCopies = quality === 'high';

        console.log(`MapEditor: inicializando mapa do editor. Qualidade: ${quality}, Canvas: ${useCanvas}, Cópias Globo: ${renderCopies}`);

        // Initialize Map
        this.map = L.map('editor-map-container', {
            center: [20.0, 0.0],
            zoom: 3,
            minZoom: 2,
            maxZoom: 10,
            worldCopyJump: renderCopies,
            preferCanvas: useCanvas,
            maxBounds: renderCopies ? null : L.latLngBounds(L.latLng(-85, -180), L.latLng(85, 180)),
            maxBoundsViscosity: renderCopies ? 0.0 : 1.0
        });

        // Initialize Basemaps
        this.basemaps.satellite = L.tileLayer('https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
            maxZoom: 10,
            maxNativeZoom: 19,
            noWrap: !renderCopies,
            className: 'satellite-layer-tile',
            attribution: 'Tiles &copy; Esri'
        });

        this.basemaps.physical = L.tileLayer('https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png', {
            maxZoom: 10,
            noWrap: !renderCopies,
            attribution: 'Tiles &copy; OpenTopoMap'
        });

        this.basemaps.streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 10,
            noWrap: !renderCopies,
            attribution: 'Tiles &copy; OpenStreetMap'
        });

        this.basemaps.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 10,
            noWrap: !renderCopies,
            attribution: '&copy; CartoDB'
        });

        this.basemaps.light = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
            maxZoom: 10,
            noWrap: !renderCopies,
            attribution: '&copy; CartoDB'
        });

        // Set default basemap
        this.currentBasemap = this.basemaps.satellite;
        this.currentBasemap.addTo(this.map);

        // Configure Leaflet Geoman Controls (we handle tools from our floating bar)
        this.map.pm.addControls({
            drawPolygon: false,
            drawMarker: false,
            drawCircleMarker: false,
            drawPolyline: false,
            drawRectangle: false,
            drawCircle: false,
            drawText: false,
            cutPolygon: false,
            editMode: false,
            dragMode: false,
            rotateMode: false,
            removalMode: false
        });

        this.map.pm.setLang('pt_br');

        // Bind global drawing/creation events
        this.map.on('pm:create', (e) => {
            this.handleNewShapeCreated(e);
        });

        // Click on the sea/ocean deselects the currently selected province (ignoring nodes, popups, and shapes)
        this.map.on('click', (e) => {
            if (e.originalEvent && e.originalEvent.target) {
                const target = e.originalEvent.target;
                const isMapBackground = target.classList.contains('leaflet-tile') || 
                                        target.classList.contains('leaflet-container') || 
                                        target.id === 'editor-map-container';
                if (!isMapBackground) return;
            }
            if (this.selectedFeatureId) {
                this.deselectFeature();
            }
        });

        // Bind keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'z') {
                e.preventDefault();
                this.undo();
            } else if (e.ctrlKey && e.key.toLowerCase() === 'y') {
                e.preventDefault();
                this.redo();
            }
        });

        this.bindEvents();
        this.initialized = true;

        // Auto load default era
        this.loadEraBorders('napoleonic');
    }

    /**
     * Binds GEE UI panel interactions and elements
     */
    bindEvents() {
        // Drawing tools
        const toolSelect = document.getElementById('tool-select');
        const toolDrawPolygon = document.getElementById('tool-draw-polygon');
        const toolDrawRectangle = document.getElementById('tool-draw-rectangle');
        const toolDrawMarker = document.getElementById('tool-draw-marker');

        if (toolSelect) {
            toolSelect.addEventListener('click', () => this.setActiveTool('tool-select'));
        }
        if (toolDrawPolygon) {
            toolDrawPolygon.addEventListener('click', () => {
                this.setActiveTool('tool-draw-polygon');
                this.map.pm.enableDraw('Polygon', { snappable: true, snapDistance: 20 });
            });
        }
        if (toolDrawRectangle) {
            toolDrawRectangle.addEventListener('click', () => {
                this.setActiveTool('tool-draw-rectangle');
                this.map.pm.enableDraw('Rectangle', { snappable: true, snapDistance: 20 });
            });
        }
        if (toolDrawMarker) {
            toolDrawMarker.addEventListener('click', () => {
                this.setActiveTool('tool-draw-marker');
                this.map.pm.enableDraw('Marker');
            });
        }

        // Add Layer link
        const addLayerBtn = document.getElementById('btn-add-gee-layer');
        if (addLayerBtn) {
            addLayerBtn.addEventListener('click', () => this.openLayerModal(null));
        }

        // Layer Modal buttons
        const modalCancel = document.getElementById('btn-layer-modal-cancel');
        const modalClose = document.getElementById('btn-close-layer-modal');
        const modalSave = document.getElementById('btn-layer-modal-save');

        if (modalCancel) modalCancel.addEventListener('click', () => this.closeLayerModal());
        if (modalClose) modalClose.addEventListener('click', () => this.closeLayerModal());
        if (modalSave) modalSave.addEventListener('click', () => this.saveLayerModalData());

        // Control Panel actions
        const loadBtn = document.getElementById('btn-gee-load');
        const newEmptyBtn = document.getElementById('btn-gee-new-empty');
        const undoBtn = document.getElementById('btn-gee-undo');
        const redoBtn = document.getElementById('btn-gee-redo');
        const basemapSelect = document.getElementById('gee-basemap-select');
        const saveBtn = document.getElementById('btn-gee-save');
        const importBtn = document.getElementById('btn-gee-import');
        const exportBtn = document.getElementById('btn-gee-export');
        const importFile = document.getElementById('input-gee-import-file');
        const backBtn = document.getElementById('btn-gee-back');

        if (loadBtn) {
            loadBtn.addEventListener('click', () => {
                const eraSelect = document.getElementById('gee-era-select');
                if (eraSelect) this.loadEraBorders(eraSelect.value);
            });
        }
        if (newEmptyBtn) {
            newEmptyBtn.addEventListener('click', () => this.createNewEmptyMap());
        }
        if (undoBtn) undoBtn.addEventListener('click', () => this.undo());
        if (redoBtn) redoBtn.addEventListener('click', () => this.redo());
        if (basemapSelect) {
            basemapSelect.addEventListener('change', (e) => this.changeBasemap(e.target.value));
        }
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveChangesToServer());
        }
        if (importBtn && importFile) {
            importBtn.addEventListener('click', () => importFile.click());
            importFile.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = (evt) => {
                    try {
                        const jsonData = JSON.parse(evt.target.result);
                        this.importGeoJSON(jsonData);
                    } catch (err) {
                        this.showNotification('error', 'Falha ao ler arquivo. Formato JSON inválido.');
                    }
                };
                reader.readAsText(file);
                importFile.value = '';
            });
        }
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportGeoJSON());
        }
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.deselectFeature();
                window.Game.switchInterface('start-screen');
            });
        }

        // Properties Card bindings
        const propClose = document.getElementById('btn-close-gee-properties');
        const propName = document.getElementById('gee-prop-name');
        const propLayerSelect = document.getElementById('gee-prop-layer-select');
        const propColor = document.getElementById('gee-prop-color');
        const propDelete = document.getElementById('btn-gee-delete-feature');
        const propSave = document.getElementById('btn-gee-save-feature');

        if (propClose) propClose.addEventListener('click', () => this.deselectFeature());
        if (propName) {
            propName.addEventListener('input', (e) => {
                if (this.selectedFeatureId) {
                    const feature = this.findFeatureById(this.selectedFeatureId);
                    if (feature) feature.properties.name = e.target.value;
                }
            });
        }
        if (propLayerSelect) {
            propLayerSelect.addEventListener('change', (e) => {
                const newLayerId = e.target.value;
                if (this.selectedFeatureId && this.selectedLayer) {
                    this.saveHistoryState();
                    const feature = this.findFeatureById(this.selectedFeatureId);
                    if (feature) {
                        feature.properties.faction = newLayerId;
                        const layerColor = this.geeLayers[newLayerId] ? this.geeLayers[newLayerId].color : '#e5c158';
                        feature.properties.color = layerColor;
                        
                        this.selectedLayer.setStyle({
                            color: '#ffffff',
                            fillColor: layerColor
                        });

                        const colInput = document.getElementById('gee-prop-color');
                        const colHex = document.getElementById('gee-prop-color-hex');
                        if (colInput) colInput.value = layerColor;
                        if (colHex) colHex.textContent = layerColor;

                        this.refreshLayersList();
                        this.showNotification('success', `Território movido para a camada "${this.geeLayers[newLayerId].name}"`);
                    }
                }
            });
        }
        if (propColor) {
            propColor.addEventListener('input', (e) => {
                const hexColor = e.target.value;
                const colHex = document.getElementById('gee-prop-color-hex');
                if (colHex) colHex.textContent = hexColor;
                if (this.selectedFeatureId && this.selectedLayer) {
                    const feature = this.findFeatureById(this.selectedFeatureId);
                    if (feature) {
                        feature.properties.color = hexColor;
                        this.selectedLayer.setStyle({
                            fillColor: hexColor
                        });
                    }
                }
            });
        }
        if (propDelete) {
            propDelete.addEventListener('click', () => this.deleteSelectedFeature());
        }
        if (propSave) {
            propSave.addEventListener('click', () => {
                this.deselectFeature();
                this.showNotification('success', 'Nós e limites salvos.');
            });
        }
        const propAnnex = document.getElementById('btn-gee-annex-feature');
        if (propAnnex) {
            propAnnex.addEventListener('click', () => this.startAnnexationMode());
        }
        const propCut = document.getElementById('btn-gee-cut-feature');
        if (propCut) {
            propCut.addEventListener('click', () => this.startCutMode());
        }
        const separateIslandBtn = document.getElementById('btn-gee-separate-island');
        if (separateIslandBtn) {
            separateIslandBtn.addEventListener('click', () => {
                if (this.isSeparateIslandMode) {
                    this.cancelSeparateIslandMode();
                } else {
                    this.startSeparateIslandMode();
                }
            });
        }

        // Geometry modal finish button
        const finishGeomBtn = document.getElementById('btn-geom-finish');
        const closeGeomBtn = document.getElementById('btn-close-geom-modal');
        if (finishGeomBtn) {
            finishGeomBtn.addEventListener('click', () => this.deselectFeature());
        }
        if (closeGeomBtn) {
            closeGeomBtn.addEventListener('click', () => this.deselectFeature());
        }

        const closeLoopBtn = document.getElementById('btn-geom-close-loop');
        if (closeLoopBtn) {
            closeLoopBtn.addEventListener('click', () => this.closeSelectedOpenBoundary());
        }

        const deleteSelectedBtn = document.getElementById('btn-geom-delete-selected');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => this.deleteSelectedVertices());
        }

        const snapSelectedBtn = document.getElementById('btn-geom-snap-selected');
        if (snapSelectedBtn) {
            snapSelectedBtn.addEventListener('click', () => this.snapSelectedVertices());
        }

        // Document-level keydown shortcuts (Blender-like node editing)
        document.addEventListener('keydown', (e) => {
            // Only trigger if a feature is selected and editing is active
            if (!this.selectedFeatureId || !this.selectedLayer) return;

            // Ignore shortcuts if the user is typing in form elements
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'TEXTAREA') {
                return;
            }

            const key = e.key.toLowerCase();
            if (key === 'x' || key === 'delete') {
                if (this.selectedVertices && this.selectedVertices.length > 0) {
                    e.preventDefault();
                    this.deleteSelectedVertices();
                } else if (this.hoveredMarker) {
                    e.preventDefault();
                    this.saveHistoryState();
                    this.hoveredMarker.fire('contextmenu'); // triggers Geoman vertex removal
                    this.map.closePopup();
                    this.updateFeatureGeometry(this.selectedFeatureId, this.hoveredMarkerLayer);
                    this.hoveredMarker = null;
                    this.hoveredMarkerLayer = null;
                    this.showNotification('success', 'Nó excluído com sucesso (Tecla X/Del).');
                }
            } else if (key === 'f' || key === 'm') {
                if (this.selectedVertices && this.selectedVertices.length > 0) {
                    e.preventDefault();
                    this.snapSelectedVertices();
                } else if (this.hoveredMarker) {
                    e.preventDefault();
                    this.saveHistoryState();
                    const closestLatLng = this.findClosestNeighborVertex(this.hoveredMarker.getLatLng());
                    if (closestLatLng) {
                        this.hoveredMarker.setLatLng(closestLatLng);
                        // Trigger drag events to force Leaflet Geoman to update polygon geometry internally
                        this.hoveredMarker.fire('dragstart');
                        this.hoveredMarker.fire('drag');
                        this.hoveredMarker.fire('dragend');

                        this.map.closePopup();
                        this.updateFeatureGeometry(this.selectedFeatureId, this.hoveredMarkerLayer);
                        this.showNotification('success', 'Nó conectado ao vizinho (Tecla F/M).');
                    } else {
                        this.showNotification('error', 'Nenhum nó de outra nação próximo para conectar (limite de 150 km).');
                    }
                }
            }
        });
    }

    /**
     * Toggles tool activation state on toolbar
     */
    setActiveTool(toolId) {
        document.querySelectorAll('.gee-tool-btn').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(toolId);
        if (activeBtn) activeBtn.classList.add('active');
        this.map.pm.disableDraw();
    }

    /**
     * Downloads base era geojson and populates GEE layers
     */
    async loadEraBorders(eraId) {
        this.selectedEra = eraId;
        this.deselectFeature();

        if (eraId === 'medieval') {
            this.nationsData = window.MC_NationsData_Medieval?.nations || null;
            this.factionMap = window.MC_NationsData_Medieval?.countryFactionMap || null;
        } else if (eraId === 'napoleonic') {
            this.nationsData = window.MC_NationsData_Napoleonic?.nations || null;
            this.factionMap = window.MC_NationsData_Napoleonic?.countryFactionMap || null;
        } else if (eraId === 'worldwars') {
            this.nationsData = window.MC_NationsData_WorldWars?.nations || null;
            this.factionMap = window.MC_NationsData_WorldWars?.countryFactionMap || null;
        } else {
            this.nationsData = window.MC_NationsData_Modern?.nations || null;
            this.factionMap = window.MC_NationsData_Modern?.countryFactionMap || null;
        }

        // Clear existing map layers
        Object.keys(this.layersMap).forEach(key => {
            const layer = this.layersMap[key];
            if (layer) this.map.removeLayer(layer);
        });
        this.layersMap = {};
        this.geeLayers = {};

        const loadingOverlay = document.createElement('div');
        loadingOverlay.style.cssText = 'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(7,9,14,0.6);z-index:9999;color:#e5c158;font-family:Cinzel,serif;font-size:1.2rem;';
        loadingOverlay.innerHTML = '⏳ Carregando Fronteiras GEE...';
        document.getElementById('editor-map-container').appendChild(loadingOverlay);

        try {
            const path = this.paths[eraId];
            const res = await fetch(path);
            if (!res.ok) throw new Error(`Erro ao baixar: ${res.status}`);
            
            this.geoJSONData = await res.json();
            
            // 1. Populate GEE Layers from era nationsData
            if (this.nationsData) {
                Object.keys(this.nationsData).forEach(factionId => {
                    this.geeLayers[factionId] = {
                        name: this.nationsData[factionId].name,
                        color: this.nationsData[factionId].color,
                        visible: true,
                        locked: false
                    };
                });
            }

            // 2. Scan features to map factions and default independents
            if (this.geoJSONData && this.geoJSONData.features) {
                this.geoJSONData.features.forEach(feature => {
                    const id = feature.id || feature.properties.entityId || feature.properties.id;
                    let factionId = feature.properties.faction;
                    if (!factionId && this.factionMap) {
                        factionId = this.factionMap[id];
                    }
                    if (!factionId) factionId = 'independents';

                    feature.properties.faction = factionId;

                    if (!this.geeLayers[factionId]) {
                        this.geeLayers[factionId] = {
                            name: factionId.toUpperCase(),
                            color: feature.properties.color || '#e5c158',
                            visible: true,
                            locked: false
                        };
                    }
                });
            }

            if (Object.keys(this.geeLayers).length === 0) {
                this.geeLayers['default'] = { name: 'Geometria 1', color: '#e5c158', visible: true, locked: false };
            }

            this.activeGeeLayerId = Object.keys(this.geeLayers)[0];

            this.plotGeoJSONLayers();
            this.refreshLayersList();
            this.showNotification('success', 'Fronteiras da era GEE prontas!');
        } catch (e) {
            console.error(e);
            this.showNotification('error', `Falha ao carregar: ${e.message}`);
        } finally {
            loadingOverlay.remove();
        }
    }

    /**
     * Plots all features in GeoJSON data
     */
    plotGeoJSONLayers() {
        if (!this.geoJSONData || !this.geoJSONData.features) return;
        this.geoJSONData.features.forEach(feature => {
            this.plotSingleGeoJSONFeature(feature);
        });
    }

    /**
     * Plots a single feature on Leaflet
     */
    plotSingleGeoJSONFeature(feature) {
        const id = feature.id || feature.properties.entityId || feature.properties.id;
        if (!id) return;

        const factionId = feature.properties.faction || 'independents';
        const color = feature.properties.color || (this.geeLayers[factionId] ? this.geeLayers[factionId].color : '#e5c158');

        const layer = L.geoJSON(feature, {
            style: {
                color: color,
                weight: 1.5,
                opacity: 0.8,
                fillColor: color,
                fillOpacity: 0.25
            }
        });

        let polygonLayer = null;
        layer.eachLayer((child) => {
            polygonLayer = child;
        });

        if (!polygonLayer) return;

        polygonLayer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (this.isSeparateIslandMode) {
                if (this.selectedFeatureId === id) {
                    this.performSeparateIsland(this.selectedFeatureId, e.latlng);
                } else {
                    this.showNotification('warning', 'Clique na ilha da província selecionada.');
                }
                return;
            }
            if (this.isAnnexMode) {
                this.performAnnexation(this.selectedFeatureId, id);
            } else if (this.selectedFeatureId === id) {
                // Ignore clicks if they were actually on a marker (vertex)
                if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.classList.contains('leaflet-marker-icon')) {
                    return;
                }
                this.addNodeAtLatLng(e.latlng, polygonLayer);
            } else {
                this.selectFeature(id, polygonLayer);
            }
        });

        this.layersMap[id] = polygonLayer;

        const layerMeta = this.geeLayers[factionId];
        if (!layerMeta || layerMeta.visible) {
            polygonLayer.addTo(this.map);
        }
    }

    /**
     * Redraws the imports layer list in sidebar panel
     */
    refreshLayersList() {
        const container = document.getElementById('gee-layer-list');
        const countSpan = document.getElementById('gee-layer-count');
        if (!container) return;

        container.innerHTML = '';
        const layerKeys = Object.keys(this.geeLayers);
        if (countSpan) {
            countSpan.textContent = `${layerKeys.length} camada${layerKeys.length === 1 ? '' : 's'}`;
        }

        if (!this.activeGeeLayerId && layerKeys.length > 0) {
            this.activeGeeLayerId = layerKeys[0];
        }

        // Fill properties selection dropdown
        const propSelect = document.getElementById('gee-prop-layer-select');
        if (propSelect) {
            propSelect.innerHTML = '';
            layerKeys.forEach(k => {
                const opt = document.createElement('option');
                opt.value = k;
                opt.textContent = this.geeLayers[k].name;
                propSelect.appendChild(opt);
            });
        }

        layerKeys.forEach(key => {
            const layer = this.geeLayers[key];
            const isActive = (this.activeGeeLayerId === key);

            let provinceCount = 0;
            if (this.geoJSONData && this.geoJSONData.features) {
                this.geoJSONData.features.forEach(f => {
                    if (f.properties.faction === key) provinceCount++;
                });
            }

            const item = document.createElement('div');
            item.className = `gee-layer-item ${isActive ? 'active' : ''}`;
            item.dataset.id = key;

            item.innerHTML = `
                <div class="gee-layer-meta">
                    <span class="gee-layer-color-indicator" style="background-color: ${layer.color};"></span>
                    <span class="gee-layer-name">${layer.name} <span class="gee-layer-count">(${provinceCount})</span></span>
                </div>
                <div class="gee-layer-controls">
                    <button class="gee-layer-btn btn-toggle-vis" title="Esconder/Mostrar">${layer.visible ? '👁️' : '❌'}</button>
                    <button class="gee-layer-btn btn-toggle-lock" title="Bloquear">${layer.locked ? '🔒' : '🔓'}</button>
                    <button class="gee-layer-btn btn-edit-layer" title="Configurações">⚙️</button>
                    <button class="gee-layer-btn btn-remove-layer" title="Deletar Camada">🗑️</button>
                </div>
            `;

            item.addEventListener('click', (e) => {
                if (e.target.closest('.gee-layer-controls') || e.target.closest('.gee-layer-btn')) return;
                this.selectLayer(key);
            });

            item.querySelector('.btn-toggle-vis').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLayerVisibility(key);
            });

            item.querySelector('.btn-toggle-lock').addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLayerLock(key);
            });

            item.querySelector('.btn-edit-layer').addEventListener('click', (e) => {
                e.stopPropagation();
                this.openLayerModal(key);
            });

            item.querySelector('.btn-remove-layer').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Excluir a nação "${layer.name}" e todas as suas províncias?`)) {
                    this.removeLayer(key);
                }
            });

            container.appendChild(item);
        });
    }

    selectLayer(layerId) {
        this.activeGeeLayerId = layerId;
        this.refreshLayersList();
    }

    toggleLayerVisibility(layerId) {
        const layer = this.geeLayers[layerId];
        layer.visible = !layer.visible;
        this.refreshLayersList();

        Object.keys(this.layersMap).forEach(id => {
            const f = this.findFeatureById(id);
            if (f && f.properties.faction === layerId) {
                const mapLayer = this.layersMap[id];
                if (mapLayer) {
                    if (layer.visible) {
                        if (!this.map.hasLayer(mapLayer)) mapLayer.addTo(this.map);
                    } else {
                        if (this.map.hasLayer(mapLayer)) this.map.removeLayer(mapLayer);
                    }
                }
            }
        });
    }

    toggleLayerLock(layerId) {
        const layer = this.geeLayers[layerId];
        layer.locked = !layer.locked;
        this.refreshLayersList();

        if (layer.locked && this.selectedFeatureId) {
            const selected = this.findFeatureById(this.selectedFeatureId);
            if (selected && selected.properties.faction === layerId) {
                this.deselectFeature();
            }
        }
    }

    openLayerModal(layerId = null) {
        this.editingLayerId = layerId;
        const modal = document.getElementById('gee-layer-modal');
        const modalTitle = document.getElementById('layer-modal-title');
        const nameInput = document.getElementById('layer-modal-name');
        const colorInput = document.getElementById('layer-modal-color');

        if (!modal || !nameInput || !colorInput) return;

        if (layerId) {
            modalTitle.textContent = 'Configurar Camada';
            nameInput.value = this.geeLayers[layerId].name;
            colorInput.value = this.geeLayers[layerId].color;
        } else {
            modalTitle.textContent = 'Adicionar Nova Camada';
            nameInput.value = '';
            colorInput.value = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        }

        modal.style.display = 'flex';
    }

    closeLayerModal() {
        const modal = document.getElementById('gee-layer-modal');
        if (modal) modal.style.display = 'none';
        this.editingLayerId = null;
    }

    saveLayerModalData() {
        const nameInput = document.getElementById('layer-modal-name');
        const colorInput = document.getElementById('layer-modal-color');
        if (!nameInput || !colorInput) return;

        const name = nameInput.value.trim();
        const color = colorInput.value;

        if (!name) {
            this.showNotification('error', 'Nome é obrigatório.');
            return;
        }

        if (this.editingLayerId && this.geoJSONData && this.geoJSONData.features) {
            const affectedIds = this.geoJSONData.features
                .filter(f => f.properties.faction === this.editingLayerId)
                .map(f => f.id || f.properties.entityId || f.properties.id);
            this.saveHistoryState(affectedIds);
        } else {
            this.saveHistoryState();
        }

        if (this.editingLayerId) {
            this.geeLayers[this.editingLayerId].name = name;
            this.geeLayers[this.editingLayerId].color = color;

            Object.keys(this.layersMap).forEach(id => {
                const f = this.findFeatureById(id);
                if (f && f.properties.faction === this.editingLayerId) {
                    f.properties.color = color;
                    const mapLayer = this.layersMap[id];
                    if (mapLayer) {
                        mapLayer.setStyle({
                            color: color,
                            fillColor: color
                        });
                    }
                }
            });
            this.showNotification('success', 'Camada atualizada!');
        } else {
            const newKey = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
            if (this.geeLayers[newKey]) {
                this.showNotification('error', 'Camada já existe.');
                return;
            }

            this.geeLayers[newKey] = {
                name: name,
                color: color,
                visible: true,
                locked: false
            };
            this.activeGeeLayerId = newKey;
            this.showNotification('success', 'Camada criada!');
        }

        this.closeLayerModal();
        this.refreshLayersList();
    }

    removeLayer(layerId) {
        this.saveHistoryState();

        if (this.geoJSONData && this.geoJSONData.features) {
            this.geoJSONData.features = this.geoJSONData.features.filter(f => {
                if (f.properties.faction === layerId) {
                    const mapLayer = this.layersMap[f.id];
                    if (mapLayer) {
                        this.map.removeLayer(mapLayer);
                        delete this.layersMap[f.id];
                    }
                    return false;
                }
                return true;
            });
        }

        delete this.geeLayers[layerId];

        if (this.activeGeeLayerId === layerId) {
            this.activeGeeLayerId = Object.keys(this.geeLayers)[0] || null;
        }

        if (this.selectedFeatureId) {
            const current = this.findFeatureById(this.selectedFeatureId);
            if (!current) this.deselectFeature();
        }

        this.refreshLayersList();
        this.showNotification('success', 'Camada e geometrias deletadas.');
    }

    /**
     * Selects and highlights a polygon feature for vertex node editing
     */
    selectFeature(id, layer) {
        const feature = this.findFeatureById(id);
        if (!feature) return;

        const factionId = feature.properties.faction || 'independents';
        const layerMeta = this.geeLayers[factionId];
        if (layerMeta && layerMeta.locked) {
            this.showNotification('warning', `A camada "${layerMeta.name}" está bloqueada.`);
            return;
        }

        this.deselectFeature();

        this.selectedFeatureId = id;
        this.selectedLayer = layer;

        const card = document.getElementById('gee-properties-card');
        if (card) card.style.display = 'flex';

        document.getElementById('gee-prop-id').value = id;
        document.getElementById('gee-prop-name').value = feature.properties.name || '';

        const layerSelect = document.getElementById('gee-prop-layer-select');
        if (layerSelect) layerSelect.value = factionId;

        const color = feature.properties.color || (layerMeta ? layerMeta.color : '#e5c158');
        document.getElementById('gee-prop-color').value = color;
        document.getElementById('gee-prop-color-hex').textContent = color;

        if (layer) {
            layer.setStyle({
                weight: 3.5,
                fillOpacity: 0.5,
                color: '#ffffff'
            });

            layer.pm.enable({
                allowSelfIntersection: false,
                snappingOption: true,
                snapDistance: 20,
                limitMarkersToCount: 150
            });

            layer.on('pm:edit', () => {
                this.saveHistoryState();
                this.updateFeatureGeometry(id, layer);
            });

            layer.on('pm:markerdragend', () => {
                this.saveHistoryState();
                this.updateFeatureGeometry(id, layer);
            });

            layer.on('pm:vertexremoved', () => {
                this.saveHistoryState();
                this.updateFeatureGeometry(id, layer);
            });

            layer.on('pm:markerclick', (e) => {
                if (e.originalEvent && e.originalEvent.shiftKey) {
                    this.toggleVertexSelection(e.marker, layer, e.indexPath);
                    return;
                }
                this.showNodeToolbar(e.marker, e.indexPath, layer);
            });

            // Listen to marker creation to attach Blender hover and multi-selection drag effects
            layer.on('pm:markercreate', (e) => {
                const marker = e.marker;
                const indexPath = e.indexPath;

                // Re-apply selection style and update reference if this path is selected
                if (indexPath) {
                    const pathStr = indexPath.join(',');
                    if (this.selectedPaths && this.selectedPaths[pathStr]) {
                        setTimeout(() => {
                            const el = marker.getElement();
                            if (el) el.classList.add('gee-selected-vertex');
                        }, 10);
                        
                        const sIdx = this.selectedVertices.findIndex(v => v.indexPath.join(',') === pathStr);
                        if (sIdx !== -1) {
                            this.selectedVertices[sIdx].marker = marker;
                        } else {
                            this.selectedVertices.push({ marker, layer, indexPath });
                        }
                    }
                }
                
                marker.on('mouseover', () => {
                    this.hoveredMarker = marker;
                    this.hoveredMarkerLayer = layer;
                    const el = marker.getElement();
                    if (el) el.classList.add('blender-vertex-hover');
                });
                
                marker.on('mouseout', () => {
                    const el = marker.getElement();
                    if (el) el.classList.remove('blender-vertex-hover');
                    if (this.hoveredMarker === marker) {
                        this.hoveredMarker = null;
                        this.hoveredMarkerLayer = null;
                    }
                });

                // Bulk dragging event handlers
                marker.on('dragstart', () => {
                    if (this.selectedVertices && this.selectedVertices.some(v => v.marker === marker)) {
                        this.selectedVertices.forEach(v => {
                            if (v.marker) {
                                v.startLatLng = L.latLng(v.marker.getLatLng().lat, v.marker.getLatLng().lng);
                            }
                        });
                        this.draggedMarkerStartLatLng = L.latLng(marker.getLatLng().lat, marker.getLatLng().lng);
                    }
                });

                marker.on('drag', () => {
                    if (this.selectedVertices && this.selectedVertices.some(v => v.marker === marker) && this.draggedMarkerStartLatLng) {
                        const currentLatLng = marker.getLatLng();
                        const deltaLat = currentLatLng.lat - this.draggedMarkerStartLatLng.lat;
                        const deltaLng = currentLatLng.lng - this.draggedMarkerStartLatLng.lng;

                        const latlngs = layer.getLatLngs();
                        
                        this.selectedVertices.forEach(v => {
                            if (v.marker && v.indexPath) {
                                if (v.marker !== marker) {
                                    const newLat = v.startLatLng.lat + deltaLat;
                                    const newLng = v.startLatLng.lng + deltaLng;
                                    const newLatLng = L.latLng(newLat, newLng);
                                    v.marker.setLatLng(newLatLng);
                                    
                                    this.setCoordByPath(latlngs, v.indexPath, newLatLng);
                                } else {
                                    this.setCoordByPath(latlngs, v.indexPath, currentLatLng);
                                }
                            }
                        });
                        
                        layer.setLatLngs(latlngs);
                    }
                });

                marker.on('dragend', () => {
                    if (this.selectedVertices && this.selectedVertices.some(v => v.marker === marker)) {
                        this.saveHistoryState();
                        this.updateFeatureGeometry(id, layer);
                        this.draggedMarkerStartLatLng = null;
                    }
                });
            });
        }

        const closeLoopBtn = document.getElementById('btn-geom-close-loop');
        if (closeLoopBtn) {
            const isLine = (layer instanceof L.Polyline && !(layer instanceof L.Polygon));
            closeLoopBtn.style.display = isLine ? 'block' : 'none';
        }

        const geomModal = document.getElementById('geometry-tools-modal');
        const geomCountryName = document.getElementById('geom-country-name');
        if (geomModal && geomCountryName) {
            geomCountryName.textContent = feature.properties.name || id;
            geomModal.style.display = 'block';
        }
    }

    deselectFeature() {
        if (this.selectedFeatureId) {
            if (this.selectedLayer) {
                this.updateFeatureGeometry(this.selectedFeatureId, this.selectedLayer);
            }

            const prevLayer = this.layersMap[this.selectedFeatureId];
            if (prevLayer) {
                const feature = this.findFeatureById(this.selectedFeatureId);
                let originalColor = '#e5c158';
                if (feature) {
                    const fId = feature.properties.faction;
                    originalColor = feature.properties.color || (this.geeLayers[fId] ? this.geeLayers[fId].color : '#e5c158');
                }

                prevLayer.setStyle({
                    weight: 1.5,
                    fillOpacity: 0.25,
                    color: originalColor,
                    fillColor: originalColor
                });

                prevLayer.pm.disable();
                prevLayer.off('pm:edit');
                prevLayer.off('pm:markerdragend');
                prevLayer.off('pm:vertexremoved');
                prevLayer.off('pm:markerclick');
                prevLayer.off('pm:markercreate');
                this.hoveredMarker = null;
                this.hoveredMarkerLayer = null;
            }
        }

        // Clear selected vertices and paths
        if (this.selectedVertices && this.selectedVertices.length > 0) {
            this.selectedVertices.forEach(v => {
                if (v.marker) {
                    const el = v.marker.getElement();
                    if (el) el.classList.remove('gee-selected-vertex');
                }
            });
        }
        this.selectedVertices = [];
        this.selectedPaths = {};
        this.updateSelectedNodesUI();

        this.selectedFeatureId = null;
        this.selectedLayer = null;

        const card = document.getElementById('gee-properties-card');
        if (card) card.style.display = 'none';

        const geomModal = document.getElementById('geometry-tools-modal');
        if (geomModal) geomModal.style.display = 'none';

        const closeLoopBtn = document.getElementById('btn-geom-close-loop');
        if (closeLoopBtn) closeLoopBtn.style.display = 'none';

        // Reset annexation, cut and separate island mode states on deselection
        this.isAnnexMode = false;
        this.isCutMode = false;
        this.cancelSeparateIslandMode();

        const annexBtn = document.getElementById('btn-gee-annex-feature');
        if (annexBtn) {
            annexBtn.textContent = '🔗 Anexar';
            annexBtn.classList.remove('gee-btn-danger-outline');
            annexBtn.classList.add('gee-btn-gold');
        }

        const cutBtn = document.getElementById('btn-gee-cut-feature');
        if (cutBtn) {
            cutBtn.textContent = '✂️ Cortar';
            cutBtn.classList.remove('gee-btn-danger-outline');
            cutBtn.classList.add('gee-btn-gold');
        }

        this.map.pm.disableDraw();

        this.map.closePopup();
    }

    updateFeatureGeometry(id, layer) {
        const feature = this.findFeatureById(id);
        if (feature && layer) {
            const geojson = layer.toGeoJSON();
            feature.geometry = geojson.geometry;
        }
    }

    addNodeAtLatLng(latlng, layer) {
        this.saveHistoryState();
        
        const latlngs = layer.getLatLngs();
        let closestRing = null;
        let closestIndex = -1;
        let minDistance = Infinity;

        // Traverse all rings regardless of MultiPolygon nesting depth
        const traverseRings = (arr) => {
            if (arr.length === 0) return;
            // Check if this array is a ring (array of LatLngs or coordinate objects)
            if (arr[0] instanceof L.LatLng || (typeof arr[0] === 'object' && arr[0].lat !== undefined)) {
                const ring = arr;
                const isClosed = (layer instanceof L.Polygon);
                const limit = isClosed ? ring.length : ring.length - 1;
                
                for (let j = 0; j < limit; j++) {
                    const a = ring[j];
                    const b = isClosed ? ring[(j + 1) % ring.length] : ring[j + 1];
                    const dist = this.distanceToSegment(latlng, a, b);
                    if (dist < minDistance) {
                        minDistance = dist;
                        closestRing = ring;
                        closestIndex = j;
                    }
                }
            } else if (Array.isArray(arr)) {
                // Nested arrays (MultiPolygon or Polygon with holes)
                arr.forEach(sub => traverseRings(sub));
            }
        };

        traverseRings(latlngs);

        if (closestRing && closestIndex !== -1) {
            // Insert the new latlng between closestIndex and closestIndex + 1
            closestRing.splice(closestIndex + 1, 0, latlng);
            
            // Set the updated latlngs back on the layer
            layer.setLatLngs(latlngs);
            
            // Force redraw of Geoman markers
            layer.pm.disable();
            layer.pm.enable({
                allowSelfIntersection: false,
                snappingOption: true,
                snapDistance: 20,
                limitMarkersToCount: 150
            });

            this.updateFeatureGeometry(this.selectedFeatureId, layer);
            this.showNotification('success', 'Nó adicionado na fronteira (Clique).');
        }
    }

    setCoordByPath(latlngs, path, newLatLng) {
        if (!path || path.length === 0) return;
        let current = latlngs;
        for (let i = 0; i < path.length - 1; i++) {
            current = current[path[i]];
        }
        current[path[path.length - 1]] = newLatLng;
    }

    toggleVertexSelection(marker, layer, indexPath) {
        this.selectedVertices = this.selectedVertices || [];
        this.selectedPaths = this.selectedPaths || {};
        
        if (!indexPath) return;
        const pathStr = indexPath.join(',');
        
        const el = marker.getElement();

        if (this.selectedPaths[pathStr]) {
            // Deselect
            delete this.selectedPaths[pathStr];
            const idx = this.selectedVertices.findIndex(v => v.indexPath.join(',') === pathStr);
            if (idx !== -1) this.selectedVertices.splice(idx, 1);
            if (el) el.classList.remove('gee-selected-vertex');
            this.showNotification('info', 'Nó desmarcado.');
        } else {
            // Select
            this.selectedPaths[pathStr] = true;
            this.selectedVertices.push({ marker, layer, indexPath });
            if (el) el.classList.add('gee-selected-vertex');
            this.showNotification('info', 'Nó adicionado à seleção.');
        }
        
        this.updateSelectedNodesUI();
    }

    updateSelectedNodesUI() {
        const section = document.getElementById('geom-multi-select-section');
        const countSpan = document.getElementById('geom-selected-nodes-count');
        if (!section || !countSpan) return;
        
        const count = this.selectedVertices ? this.selectedVertices.length : 0;
        if (count > 0) {
            countSpan.textContent = count;
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    }

    deleteSelectedVertices() {
        if (!this.selectedVertices || this.selectedVertices.length === 0) return;
        
        const layer = this.selectedLayer;
        if (!layer) return;
        
        const id = this.selectedFeatureId;
        const feature = this.findFeatureById(id);
        if (!feature) return;

        this.saveHistoryState();
        
        let latlngs = layer.getLatLngs();
        
        // Group by ring path (joined by '_')
        const groups = {};
        this.selectedVertices.forEach(v => {
            if (!v.indexPath) return;
            const path = v.indexPath;
            const parentPath = path.slice(0, -1);
            const key = parentPath.join('_');
            const idx = path[path.length - 1];
            if (!groups[key]) {
                groups[key] = {
                    parentPath: parentPath,
                    indices: []
                };
            }
            groups[key].indices.push(idx);
        });

        let success = true;
        let errorMsg = '';

        // For each group, sort indices in descending order and remove them
        Object.keys(groups).forEach(key => {
            const group = groups[key];
            const parentPath = group.parentPath;
            
            let ring = latlngs;
            for (let i = 0; i < parentPath.length; i++) {
                ring = ring[parentPath[i]];
            }
            
            // Sort indices descending
            group.indices.sort((a, b) => b - a);
            
            // Check if removing these vertices leaves too few vertices (minimum 3 for path, 4 for polygon)
            const remainingCount = ring.length - group.indices.length;
            const isPolygon = (layer instanceof L.Polygon);
            const minRequired = isPolygon ? 3 : 2;
            
            if (remainingCount < minRequired) {
                success = false;
                errorMsg = 'A exclusão deixará um dos anéis com vértices insuficientes para se manter válido.';
                return;
            }

            group.indices.forEach(idx => {
                ring.splice(idx, 1);
            });
        });

        if (!success) {
            this.showNotification('error', errorMsg || 'Erro ao excluir vértices.');
            return;
        }

        // Apply updated latlngs
        layer.setLatLngs(latlngs);
        
        // Re-render Geoman markers
        layer.pm.disable();
        layer.pm.enable({
            allowSelfIntersection: false,
            snappingOption: true,
            snapDistance: 20,
            limitMarkersToCount: 150
        });

        this.updateFeatureGeometry(id, layer);
        
        this.selectedPaths = {};
        this.selectedVertices = [];
        this.updateSelectedNodesUI();
        this.showNotification('success', 'Nós selecionados excluídos com sucesso!');
    }

    snapSelectedVertices() {
        if (!this.selectedVertices || this.selectedVertices.length === 0) return;
        const layer = this.selectedLayer;
        if (!layer) return;

        this.saveHistoryState();
        
        let snappedCount = 0;
        const latlngs = layer.getLatLngs();

        this.selectedVertices.forEach(v => {
            if (v.marker && v.indexPath) {
                const currentLatLng = v.marker.getLatLng();
                const closestLatLng = this.findClosestNeighborVertex(currentLatLng);
                if (closestLatLng) {
                    v.marker.setLatLng(closestLatLng);
                    this.setCoordByPath(latlngs, v.indexPath, closestLatLng);
                    snappedCount++;
                }
            }
        });

        if (snappedCount > 0) {
            layer.setLatLngs(latlngs);
            // Force redraw of Geoman markers
            layer.pm.disable();
            layer.pm.enable({
                allowSelfIntersection: false,
                snappingOption: true,
                snapDistance: 20,
                limitMarkersToCount: 150
            });
            this.updateFeatureGeometry(this.selectedFeatureId, layer);
            this.showNotification('success', `${snappedCount} nó(s) juntados com sucesso!`);
        } else {
            this.showNotification('error', 'Nenhum dos nós selecionados tem vizinhos próximos o suficiente (limite de 150 km).');
        }
    }

    distanceToSegment(p, a, b) {
        const x = p.lng, y = p.lat;
        const x1 = a.lng, y1 = a.lat;
        const x2 = b.lng, y2 = b.lat;
        
        const A = x - x1;
        const B = y - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const len_sq = C * C + D * D;
        let param = -1;
        if (len_sq !== 0) {
            param = dot / len_sq;
        }
        
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = x - xx;
        const dy = y - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Shows a popup dropdown menu for node action choices
     */
    showNodeToolbar(marker, index, layer) {
        const container = document.createElement('div');
        container.className = 'node-popup-toolbar';

        const select = document.createElement('select');
        select.className = 'node-dropdown-select';

        const pOpt = document.createElement('option');
        pOpt.value = '';
        pOpt.textContent = '-- Ações do Nó --';
        select.appendChild(pOpt);

        const isPolygon = (layer instanceof L.Polygon);
        if (isPolygon) {
            const delClose = document.createElement('option');
            delClose.value = 'delete-close';
            delClose.textContent = '🗑️ Excluir (Unir Vizinhos)';
            select.appendChild(delClose);

            const delOpen = document.createElement('option');
            delOpen.value = 'delete-open';
            delOpen.textContent = '✂️ Excluir e Abrir Caminho';
            select.appendChild(delOpen);

            const delSplit = document.createElement('option');
            delSplit.value = 'delete-split';
            delSplit.textContent = '➗ Excluir e Dividir';
            select.appendChild(delSplit);
        } else {
            const delOpt = document.createElement('option');
            delOpt.value = 'delete-close';
            delOpt.textContent = '🗑️ Excluir Nó';
            select.appendChild(delOpt);
        }

        const snapOpt = document.createElement('option');
        snapOpt.value = 'snap';
        snapOpt.textContent = '🧲 Juntar ao Vizinho';
        select.appendChild(snapOpt);

        container.appendChild(select);

        select.addEventListener('change', (e) => {
            const val = e.target.value;
            if (val.startsWith('delete')) {
                this.deleteVertexWithOptions(marker, index, layer, val);
                this.map.closePopup();
            } else if (val === 'snap') {
                this.saveHistoryState();
                const closestLatLng = this.findClosestNeighborVertex(marker.getLatLng());
                if (closestLatLng) {
                    marker.setLatLng(closestLatLng);
                    marker.fire('dragstart');
                    marker.fire('drag');
                    marker.fire('dragend');
                    
                    this.map.closePopup();
                    this.updateFeatureGeometry(this.selectedFeatureId, layer);
                    this.showNotification('success', 'Nó juntado com sucesso!');
                } else {
                    this.showNotification('error', 'Nenhum nó próximo para juntar (limite de 150 km).');
                }
            }
        });

        L.popup({
            closeButton: false,
            offset: L.point(0, -8),
            autoPan: false
        })
        .setLatLng(marker.getLatLng())
        .setContent(container)
        .openOn(this.map);
    }

    deleteVertexWithOptions(marker, index, layer, mode) {
        const id = this.selectedFeatureId;
        const feature = this.findFeatureById(id);
        if (!feature) return;

        // Get coordinates from layer
        let latlngs = layer.getLatLngs();

        let ring = null;
        let vertexIdx = -1;
        let pathIndices = [];

        if (Array.isArray(index)) {
            pathIndices = index;
        } else if (typeof index === 'object' && index !== null && Array.isArray(index.indexPath)) {
            pathIndices = index.indexPath;
        }

        if (pathIndices.length > 0) {
            let current = latlngs;
            for (let i = 0; i < pathIndices.length - 1; i++) {
                current = current[pathIndices[i]];
            }
            ring = current;
            vertexIdx = pathIndices[pathIndices.length - 1];
        } else {
            // index is a number or not provided
            const isMultiPolygon = Array.isArray(latlngs[0]) && Array.isArray(latlngs[0][0]);
            const hasHoles = Array.isArray(latlngs[0]) && !isMultiPolygon;

            if (isMultiPolygon) {
                ring = latlngs[0][0];
                pathIndices = [0, 0, index];
            } else if (hasHoles) {
                ring = latlngs[0];
                pathIndices = [0, index];
            } else {
                ring = latlngs;
                pathIndices = [index];
            }
            vertexIdx = index !== undefined ? index : 0;
        }

        if (!ring || vertexIdx < 0 || vertexIdx >= ring.length) {
            this.showNotification('error', 'Não foi possível localizar o vértice.');
            return;
        }

        if (mode === 'delete-close') {
            if (ring.length <= 3) {
                this.showNotification('error', 'Vértices insuficientes para manter o polígono fechado (mínimo 4).');
                return;
            }
            this.saveHistoryState();
            ring.splice(vertexIdx, 1);
            layer.setLatLngs(latlngs);

            // Re-render Geoman edit markers
            layer.pm.disable();
            layer.pm.enable({
                allowSelfIntersection: false,
                snappingOption: true,
                snapDistance: 20,
                limitMarkersToCount: 150
            });

            this.updateFeatureGeometry(id, layer);
            this.showNotification('success', 'Nó excluído (Fronteira mantida fechada).');
        } else if (mode === 'delete-open') {
            if (ring.length <= 3) {
                this.showNotification('error', 'Vértices insuficientes para abrir a fronteira (mínimo 4).');
                return;
            }

            // Delete the vertex and shift coordinates so the path opens at this point
            const tempRing = [...ring];
            tempRing.splice(vertexIdx, 1);

            const openCoords = [];
            for (let j = 0; j < tempRing.length; j++) {
                openCoords.push(tempRing[(vertexIdx + j) % tempRing.length]);
            }

            // Determine if it is a MultiPolygon with multiple polygons
            const isMultiPolygon = Array.isArray(latlngs[0]) && Array.isArray(latlngs[0][0]);

            if (isMultiPolygon && latlngs.length > 1 && pathIndices.length >= 3) {
                this.saveHistoryState();
                const polyIdx = pathIndices[0];

                // 1. Remove the clicked polygon from this layer
                latlngs.splice(polyIdx, 1);
                layer.setLatLngs(latlngs);
                this.updateFeatureGeometry(id, layer);

                // Re-render Geoman edit markers for the remaining polygons
                layer.pm.disable();
                layer.pm.enable({
                    allowSelfIntersection: false,
                    snappingOption: true,
                    snapDistance: 20,
                    limitMarkersToCount: 150
                });

                // 2. Create a new LineString feature for the opened ring
                const newId = 'custom_' + Date.now();
                const factionId = feature.properties.faction || 'independents';
                const color = feature.properties.color || (this.geeLayers[factionId] ? this.geeLayers[factionId].color : '#e5c158');

                // Leaflet coords are [LatLng, LatLng, ...]. We need to convert them to GeoJSON coordinates [lng, lat]
                const geojsonCoords = openCoords.map(ll => [ll.lng, ll.lat]);

                const newFeature = {
                    type: 'Feature',
                    id: newId,
                    geometry: {
                        type: 'LineString',
                        coordinates: geojsonCoords
                    },
                    properties: {
                        entityId: newId,
                        name: (feature.properties.name || 'Província') + ' (Linha)',
                        faction: factionId,
                        color: color,
                        era: this.selectedEra
                    }
                };

                this.geoJSONData.features.push(newFeature);
                this.plotSingleGeoJSONFeature(newFeature);
                this.refreshLayersList();

                this.showNotification('success', 'Nó excluído (Fronteira aberta como nova Linha separada).');
            } else {
                // Simple Polygon or single-component MultiPolygon -> replace the whole layer
                this.saveHistoryState();
                this.replaceLayerWithType(layer, 'LineString', openCoords);
                this.showNotification('success', 'Nó excluído (Fronteira aberta / Linha).');
            }
        } else if (mode === 'delete-split') {
            if (ring.length < 6) {
                this.showNotification('error', 'Vértices insuficientes para dividir em dois polígonos (mínimo 6).');
                return;
            }

            const tempRing = [...ring];
            tempRing.splice(vertexIdx, 1);

            // Split into two parts around the deleted index
            const part1 = tempRing.slice(0, vertexIdx);
            const part2 = tempRing.slice(vertexIdx);

            if (part1.length < 3 || part2.length < 3) {
                this.showNotification('error', 'A divisão resultaria em polígonos inválidos (menos de 3 nós).');
                return;
            }

            // Save state
            this.saveHistoryState();

            // Determine if it's a MultiPolygon
            const isMultiPolygon = Array.isArray(latlngs[0]) && Array.isArray(latlngs[0][0]);

            if (isMultiPolygon && pathIndices.length >= 3) {
                const polyIdx = pathIndices[0];
                const ringIdx = pathIndices[1];
                if (ringIdx === 0) {
                    // Replace the polygon at polyIdx with the two new split polygons
                    latlngs.splice(polyIdx, 1, [part1], [part2]);
                } else {
                    // It's a hole, just modify it in-place
                    ring.splice(vertexIdx, 1);
                }
                layer.setLatLngs(latlngs);
            } else {
                // Flat Polygon or Polygon with holes -> convert to MultiPolygon
                const newCoords = [ [part1], [part2] ];
                layer.setLatLngs(newCoords);
            }

            // Re-render Geoman edit markers
            layer.pm.disable();
            layer.pm.enable({
                allowSelfIntersection: false,
                snappingOption: true,
                snapDistance: 20,
                limitMarkersToCount: 150
            });

            this.updateFeatureGeometry(id, layer);
            this.showNotification('success', 'Nó excluído (Território dividido em dois polígonos).');
        }
    }

    replaceLayerWithType(oldLayer, geomType, newCoords) {
        const id = this.selectedFeatureId;
        const feature = this.findFeatureById(id);
        if (!feature) return;

        // Remove old layer from map
        if (this.map.hasLayer(oldLayer)) {
            this.map.removeLayer(oldLayer);
        }

        // Clean up old layer events
        oldLayer.off('click');
        oldLayer.off('pm:edit');
        oldLayer.off('pm:markerdragend');
        oldLayer.off('pm:vertexremoved');
        oldLayer.off('pm:markerclick');
        oldLayer.off('pm:markercreate');
        oldLayer.pm.disable();

        // Create new Leaflet layer
        let newLayer;
        const factionId = feature.properties.faction || 'independents';
        const layerMeta = this.geeLayers[factionId];
        const color = '#ffffff'; // White border for active selection styling
        const fillColor = feature.properties.color || (layerMeta ? layerMeta.color : '#e5c158');

        if (geomType === 'LineString') {
            newLayer = L.polyline(newCoords, {
                color: color,
                weight: 3.5,
                opacity: 0.8
            });
        } else {
            newLayer = L.polygon(newCoords, {
                color: color,
                weight: 3.5,
                fillColor: fillColor,
                fillOpacity: 0.5
            });
        }

        // Add to map
        newLayer.addTo(this.map);

        // Bind events on the new layer
        newLayer.on('click', (e) => {
            L.DomEvent.stopPropagation(e);
            if (this.isSeparateIslandMode) {
                if (this.selectedFeatureId === id) {
                    this.performSeparateIsland(this.selectedFeatureId, e.latlng);
                } else {
                    this.showNotification('warning', 'Clique na ilha da província selecionada.');
                }
                return;
            }
            if (this.isAnnexMode) {
                this.performAnnexation(this.selectedFeatureId, id);
            } else if (this.selectedFeatureId === id) {
                if (e.originalEvent && e.originalEvent.target && e.originalEvent.target.classList.contains('leaflet-marker-icon')) {
                    return;
                }
                this.addNodeAtLatLng(e.latlng, newLayer);
            } else {
                this.selectFeature(id, newLayer);
            }
        });

        newLayer.on('pm:edit', () => {
            this.saveHistoryState();
            this.updateFeatureGeometry(id, newLayer);
        });

        newLayer.on('pm:markerdragend', () => {
            this.saveHistoryState();
            this.updateFeatureGeometry(id, newLayer);
        });

        newLayer.on('pm:vertexremoved', () => {
            this.saveHistoryState();
            this.updateFeatureGeometry(id, newLayer);
        });

        newLayer.on('pm:markerclick', (e) => {
            if (e.originalEvent && e.originalEvent.shiftKey) {
                this.toggleVertexSelection(e.marker, newLayer, e.indexPath);
                return;
            }
            this.showNodeToolbar(e.marker, e.indexPath, newLayer);
        });

        newLayer.on('pm:markercreate', (e) => {
            const marker = e.marker;
            const indexPath = e.indexPath;

            // Re-apply selection style and update reference if this path is selected
            if (indexPath) {
                const pathStr = indexPath.join(',');
                if (this.selectedPaths && this.selectedPaths[pathStr]) {
                    setTimeout(() => {
                        const el = marker.getElement();
                        if (el) el.classList.add('gee-selected-vertex');
                    }, 10);
                    
                    const sIdx = this.selectedVertices.findIndex(v => v.indexPath.join(',') === pathStr);
                    if (sIdx !== -1) {
                        this.selectedVertices[sIdx].marker = marker;
                    } else {
                        this.selectedVertices.push({ marker, layer: newLayer, indexPath });
                    }
                }
            }
            
            marker.on('mouseover', () => {
                this.hoveredMarker = marker;
                this.hoveredMarkerLayer = newLayer;
                const el = marker.getElement();
                if (el) el.classList.add('blender-vertex-hover');
            });
            
            marker.on('mouseout', () => {
                const el = marker.getElement();
                if (el) el.classList.remove('blender-vertex-hover');
                if (this.hoveredMarker === marker) {
                    this.hoveredMarker = null;
                    this.hoveredMarkerLayer = null;
                }
            });

            // Bulk dragging event handlers
            marker.on('dragstart', () => {
                if (this.selectedVertices && this.selectedVertices.some(v => v.marker === marker)) {
                    this.selectedVertices.forEach(v => {
                        if (v.marker) {
                            v.startLatLng = L.latLng(v.marker.getLatLng().lat, v.marker.getLatLng().lng);
                        }
                    });
                    this.draggedMarkerStartLatLng = L.latLng(marker.getLatLng().lat, marker.getLatLng().lng);
                }
            });

            marker.on('drag', () => {
                if (this.selectedVertices && this.selectedVertices.some(v => v.marker === marker) && this.draggedMarkerStartLatLng) {
                    const currentLatLng = marker.getLatLng();
                    const deltaLat = currentLatLng.lat - this.draggedMarkerStartLatLng.lat;
                    const deltaLng = currentLatLng.lng - this.draggedMarkerStartLatLng.lng;

                    const latlngs = newLayer.getLatLngs();
                    
                    this.selectedVertices.forEach(v => {
                        if (v.marker && v.indexPath) {
                            if (v.marker !== marker) {
                                const newLat = v.startLatLng.lat + deltaLat;
                                const newLng = v.startLatLng.lng + deltaLng;
                                const newLatLng = L.latLng(newLat, newLng);
                                v.marker.setLatLng(newLatLng);
                                
                                this.setCoordByPath(latlngs, v.indexPath, newLatLng);
                            } else {
                                this.setCoordByPath(latlngs, v.indexPath, currentLatLng);
                            }
                        }
                    });
                    
                    newLayer.setLatLngs(latlngs);
                }
            });

            marker.on('dragend', () => {
                if (this.selectedVertices && this.selectedVertices.some(v => v.marker === marker)) {
                    this.saveHistoryState();
                    this.updateFeatureGeometry(id, newLayer);
                    this.draggedMarkerStartLatLng = null;
                }
            });
        });

        // Enable Geoman editing on new layer
        newLayer.pm.enable({
            allowSelfIntersection: false,
            snappingOption: true,
            snapDistance: 20,
            limitMarkersToCount: 150
        });

        // Update layersMap and selection references
        this.layersMap[id] = newLayer;
        this.selectedLayer = newLayer;

        // Update GeoJSON feature geometry
        const geojson = newLayer.toGeoJSON();
        feature.geometry = geojson.geometry;

        // Toggle the "Fechar Fronteira" button display based on geomType
        const closeLoopBtn = document.getElementById('btn-geom-close-loop');
        if (closeLoopBtn) {
            closeLoopBtn.style.display = (geomType === 'LineString') ? 'block' : 'none';
        }
    }

    closeSelectedOpenBoundary() {
        if (!this.selectedFeatureId || !this.selectedLayer) return;
        
        // Only valid if the selected layer is a Polyline (open boundary)
        if (this.selectedLayer instanceof L.Polygon) return;
        if (!(this.selectedLayer instanceof L.Polyline)) return;

        this.saveHistoryState();
        
        const coords = this.selectedLayer.getLatLngs();
        // L.polygon expects an array of rings: [ ring ]
        this.replaceLayerWithType(this.selectedLayer, 'Polygon', [coords]);
        this.showNotification('success', 'Fronteira fechada com sucesso (Convertida para Polígono).');
    }

    startAnnexationMode() {
        if (!this.selectedFeatureId) {
            this.showNotification('error', 'Selecione um território primeiro.');
            return;
        }

        if (this.isAnnexMode) {
            this.cancelAnnexationMode();
            return;
        }

        if (this.isCutMode) this.cancelCutMode();
        if (this.isSeparateIslandMode) this.cancelSeparateIslandMode();

        this.isAnnexMode = true;
        this.showNotification('info', 'Modo Anexação Ativado! Clique no território que deseja anexar.');
        const annexBtn = document.getElementById('btn-gee-annex-feature');
        if (annexBtn) {
            annexBtn.textContent = '❌ Cancelar';
            annexBtn.classList.remove('gee-btn-gold');
            annexBtn.classList.add('gee-btn-danger-outline');
        }
    }

    cancelAnnexationMode() {
        this.isAnnexMode = false;
        const annexBtn = document.getElementById('btn-gee-annex-feature');
        if (annexBtn) {
            annexBtn.textContent = '🔗 Anexar';
            annexBtn.classList.remove('gee-btn-danger-outline');
            annexBtn.classList.add('gee-btn-gold');
        }
        this.showNotification('info', 'Modo Anexação Cancelado.');
    }

    startCutMode() {
        if (!this.selectedFeatureId) {
            this.showNotification('error', 'Selecione um território primeiro.');
            return;
        }

        if (this.isCutMode) {
            this.cancelCutMode();
            return;
        }

        if (this.isAnnexMode) this.cancelAnnexationMode();
        if (this.isSeparateIslandMode) this.cancelSeparateIslandMode();

        this.isCutMode = true;
        this.showNotification('info', 'Modo Corte Ativado! Desenhe uma linha cruzando completamente o território.');

        const cutBtn = document.getElementById('btn-gee-cut-feature');
        if (cutBtn) {
            cutBtn.textContent = '❌ Cancelar';
            cutBtn.classList.remove('gee-btn-gold');
            cutBtn.classList.add('gee-btn-danger-outline');
        }

        this.map.pm.enableDraw('Line', {
            snappable: true,
            snapDistance: 20
        });
    }

    cancelCutMode() {
        this.isCutMode = false;
        const cutBtn = document.getElementById('btn-gee-cut-feature');
        if (cutBtn) {
            cutBtn.textContent = '✂️ Cortar';
            cutBtn.classList.remove('gee-btn-danger-outline');
            cutBtn.classList.add('gee-btn-gold');
        }
        this.map.pm.disableDraw();
    }

    startSeparateIslandMode() {
        if (!this.selectedFeatureId) {
            this.showNotification('error', 'Selecione um território primeiro.');
            return;
        }

        const feature = this.findFeatureById(this.selectedFeatureId);
        if (!feature) return;

        if (feature.geometry.type !== 'MultiPolygon') {
            this.showNotification('warning', 'Esta província é composta por um único território. Para dividi-la, utilize o botão Cortar.');
            return;
        }

        if (feature.geometry.coordinates.length <= 1) {
            this.showNotification('warning', 'Esta província tem apenas um território principal.');
            return;
        }

        this.cancelAnnexationMode();
        this.cancelCutMode();

        this.isSeparateIslandMode = true;
        
        // Disable Geoman editing to prevent marker click popup/drag during selection
        if (this.selectedLayer) {
            this.selectedLayer.pm.disable();
        }

        const btn = document.getElementById('btn-gee-separate-island');
        if (btn) {
            btn.textContent = '❌ Cancelar Separação';
            btn.classList.remove('gee-btn-gold');
            btn.classList.add('gee-btn-danger-outline');
        }

        this.showNotification('info', 'Modo Separação Ativado: Clique na ilha/parte que deseja desmembrar no mapa.');
    }

    cancelSeparateIslandMode() {
        this.isSeparateIslandMode = false;
        const btn = document.getElementById('btn-gee-separate-island');
        if (btn) {
            btn.textContent = '🏝️ Separar Ilha';
            btn.classList.remove('gee-btn-danger-outline');
            btn.classList.add('gee-btn-gold');
        }
        // Re-enable Geoman editing if a feature is selected
        if (this.selectedFeatureId && this.selectedLayer) {
            this.selectedLayer.pm.enable({
                allowSelfIntersection: false,
                snappingOption: true,
                snapDistance: 20,
                limitMarkersToCount: 150
            });
        }
    }

    performSeparateIsland(featureId, latlng) {
        const feature = this.findFeatureById(featureId);
        if (!feature || feature.geometry.type !== 'MultiPolygon') {
            this.cancelSeparateIslandMode();
            return;
        }

        const pt = turf.point([latlng.lng, latlng.lat]);
        let targetIndex = -1;

        for (let i = 0; i < feature.geometry.coordinates.length; i++) {
            const coords = feature.geometry.coordinates[i];
            try {
                const poly = turf.polygon(coords);
                if (turf.booleanPointInPolygon(pt, poly)) {
                    targetIndex = i;
                    break;
                }
            } catch (err) {
                console.error("Erro no Turf ao validar sub-polígono:", err);
            }
        }

        if (targetIndex === -1) {
            this.showNotification('warning', 'Não foi possível identificar a ilha clicada. Tente clicar bem dentro da ilha.');
            return;
        }

        // Save history state (both original and the soon-to-be-created feature)
        const newId = featureId + '_island_' + Date.now();
        this.saveHistoryState([featureId, newId]);

        try {
            const separatedCoords = feature.geometry.coordinates.splice(targetIndex, 1)[0];

            // If only one part remains in the original feature, simplify it to Polygon
            if (feature.geometry.coordinates.length === 1) {
                feature.geometry.type = 'Polygon';
                feature.geometry.coordinates = feature.geometry.coordinates[0];
            }

            // Create new faction/nation
            const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0');
            const newFactionId = 'nation_' + Date.now();
            const newFactionName = 'Nação de ' + (feature.properties.name || 'Nova Província');

            this.geeLayers[newFactionId] = {
                name: newFactionName,
                color: randomColor,
                visible: true,
                locked: false
            };

            const newFeature = {
                type: 'Feature',
                id: newId,
                geometry: {
                    type: 'Polygon',
                    coordinates: separatedCoords
                },
                properties: {
                    entityId: newId,
                    name: (feature.properties.name || 'Província') + ' (Ilha)',
                    faction: newFactionId,
                    color: randomColor,
                    era: this.selectedEra
                }
            };

            // Remove old layer from map
            const oldLayer = this.layersMap[featureId];
            if (oldLayer) {
                if (this.map.hasLayer(oldLayer)) this.map.removeLayer(oldLayer);
                oldLayer.off('click');
                oldLayer.off('pm:edit');
                oldLayer.off('pm:markerdragend');
                oldLayer.off('pm:vertexremoved');
                oldLayer.off('pm:markerclick');
                oldLayer.off('pm:markercreate');
                oldLayer.pm.disable();
                delete this.layersMap[featureId];
            }

            // Add the new feature and re-add the old feature to data & map
            this.geoJSONData.features.push(newFeature);

            this.plotSingleGeoJSONFeature(feature);
            this.plotSingleGeoJSONFeature(newFeature);

            this.refreshLayersList();

            this.showNotification('success', `Ilha separada! Criada a nação "${newFactionName}". Salvando...`);
            this.saveChangesToServer();

            // Automatically select the new feature for editing
            setTimeout(() => {
                const newLayer = this.layersMap[newId];
                if (newLayer) {
                    this.selectFeature(newId, newLayer);
                }
            }, 100);

        } catch (e) {
            console.error("Erro ao separar ilha:", e);
            this.showNotification('error', `Falha ao separar ilha: ${e.message}`);
        } finally {
            this.cancelSeparateIslandMode();
        }
    }

    performCut(lineGeoJSON) {
        if (!this.selectedFeatureId) {
            this.showNotification('error', 'Nenhum território selecionado.');
            this.cancelCutMode();
            return;
        }

        const featureToCut = this.findFeatureById(this.selectedFeatureId);
        if (!featureToCut) {
            this.showNotification('error', 'Território não encontrado.');
            this.cancelCutMode();
            return;
        }

        try {
            // 1. Create a very thin buffer around the cutting line (e.g. 0.0001 km = 10cm)
            const buffer = turf.buffer(lineGeoJSON, 0.0001, { units: 'kilometers' });

            // 2. Perform difference operation using Turf
            const cutResult = turf.difference(featureToCut, buffer);

            if (!cutResult) {
                this.showNotification('warning', 'O corte não intersecta a província.');
                this.cancelCutMode();
                return;
            }

            // 3. Separate MultiPolygon or Polygon into individual Polygon features
            const polygons = [];
            if (cutResult.geometry.type === 'Polygon') {
                polygons.push(cutResult);
            } else if (cutResult.geometry.type === 'MultiPolygon') {
                cutResult.geometry.coordinates.forEach(coords => {
                    polygons.push(turf.polygon(coords));
                });
            }

            // If we got less than 2 polygons, the line didn't cut all the way through
            if (polygons.length < 2) {
                this.showNotification('warning', 'A linha de corte precisa atravessar a província de ponta a ponta.');
                this.cancelCutMode();
                return;
            }

            // Generate IDs for new parts
            const newIds = [];
            for (let i = 1; i < polygons.length; i++) {
                newIds.push('custom_' + Date.now() + '_' + i);
            }

            // Save history delta for all affected IDs
            this.saveHistoryState([featureToCut.id, ...newIds]);

            // 4. Update the original feature geometry to be the first part
            featureToCut.geometry = polygons[0].geometry;

            // 5. Create new features for the remaining parts
            const nameBase = featureToCut.properties.name || 'Província';
            const faction = featureToCut.properties.faction || 'independents';
            const color = featureToCut.properties.color || (this.geeLayers[faction] ? this.geeLayers[faction].color : '#e5c158');

            for (let i = 1; i < polygons.length; i++) {
                const newId = newIds[i - 1];
                const newFeature = {
                    type: 'Feature',
                    id: newId,
                    geometry: polygons[i].geometry,
                    properties: {
                        entityId: newId,
                        name: `${nameBase} (Cortado)`,
                        faction: faction,
                        color: color,
                        era: this.selectedEra
                    }
                };
                this.geoJSONData.features.push(newFeature);
            }

            // 6. Reload map editor states to reflect the cuts
            this.applyStateUpdate();
            this.showNotification('success', `Território dividido com sucesso em ${polygons.length} partes! Salvando...`);
            this.saveChangesToServer();
        } catch (e) {
            console.error(e);
            this.showNotification('error', `Erro ao realizar o corte: ${e.message}`);
        } finally {
            this.cancelCutMode();
        }
    }

    performAnnexation(idA, idB) {
        if (idA === idB) {
            this.showNotification('error', 'Não é possível anexar um território a ele mesmo.');
            return;
        }

        const featureA = this.findFeatureById(idA);
        const featureB = this.findFeatureById(idB);

        if (!featureA || !featureB) {
            this.showNotification('error', 'Territórios não encontrados.');
            this.cancelAnnexationMode();
            return;
        }

        const nameA = featureA.properties.name || featureA.properties.NAME || idA;
        const nameB = featureB.properties.name || featureB.properties.NAME || idB;

        if (!confirm(`Deseja realmente anexar "${nameB}" a "${nameA}"?\nIsso irá unir as fronteiras e remover "${nameB}".`)) {
            this.cancelAnnexationMode();
            return;
        }

        this.saveHistoryState([idA, idB]);

        try {
            // Perform Turf union
            let unionFeature;
            try {
                unionFeature = turf.union(featureA, featureB);
            } catch (err) {
                unionFeature = turf.union(turf.featureCollection([featureA, featureB]));
            }

            if (!unionFeature || !unionFeature.geometry) {
                throw new Error("A união das geometrias falhou.");
            }

            // 1. Remove old layers from map and clean up
            const layerA = this.layersMap[idA];
            const layerB = this.layersMap[idB];

            const cleanupLayer = (layer) => {
                if (layer) {
                    if (this.map.hasLayer(layer)) this.map.removeLayer(layer);
                    layer.off('click');
                    layer.off('pm:edit');
                    layer.off('pm:markerdragend');
                    layer.off('pm:vertexremoved');
                    layer.off('pm:markerclick');
                    layer.off('pm:markercreate');
                    layer.pm.disable();
                }
            };

            cleanupLayer(layerA);
            cleanupLayer(layerB);

            // 2. Update Feature A geometry
            featureA.geometry = unionFeature.geometry;

            // 3. Remove Feature B from geoJSONData.features
            this.geoJSONData.features = this.geoJSONData.features.filter(f => {
                const fid = f.id || f.properties.entityId || f.properties.id;
                return fid !== idB;
            });

            // 4. Remove Feature B from layersMap
            delete this.layersMap[idB];

            // 5. Plot the updated Feature A back on the map
            this.plotSingleGeoJSONFeature(featureA);

            // 6. Exit annexation mode
            this.isAnnexMode = false;
            const annexBtn = document.getElementById('btn-gee-annex-feature');
            if (annexBtn) {
                annexBtn.textContent = '🔗 Anexar Outro Território';
                annexBtn.classList.remove('gee-btn-danger-outline');
                annexBtn.classList.add('gee-btn-gold');
            }

            // 7. Select Feature A again to refresh its editing state and markers
            this.selectFeature(idA, this.layersMap[idA]);

            this.showNotification('success', `Território "${nameB}" anexado com sucesso a "${nameA}". Salvando...`);
            this.saveChangesToServer();
        } catch (e) {
            console.error(e);
            this.showNotification('error', `Erro na anexação: ${e.message}`);
            this.cancelAnnexationMode();
        }
    }

    findClosestNeighborVertex(latlng) {
        let closestLatLng = null;
        let minDistance = Infinity;

        Object.keys(this.layersMap).forEach(key => {
            if (key === this.selectedFeatureId) return;
            const neighbor = this.layersMap[key];
            if (!neighbor) return;

            const coords = neighbor.getLatLngs();
            const traverse = (array) => {
                if (Array.isArray(array) && array.length > 0) {
                    if (array[0] instanceof L.LatLng) {
                        array.forEach(pt => {
                            const dist = latlng.distanceTo(pt);
                            if (dist < minDistance) {
                                minDistance = dist;
                                closestLatLng = pt;
                            }
                        });
                    } else {
                        array.forEach(item => traverse(item));
                    }
                }
            };
            traverse(coords);
        });

        // Snap only if within 150 km
        if (minDistance < 150000) return closestLatLng;
        return null;
    }

    /**
     * Handles creation of new drawn shapes (Polygon, Rectangle, Marker)
     */
    handleNewShapeCreated(e) {
        const layer = e.layer;
        
        if (this.isCutMode) {
            const lineGeoJSON = layer.toGeoJSON();
            this.map.removeLayer(layer);
            this.performCut(lineGeoJSON);
            return;
        }

        if (!this.activeGeeLayerId) {
            this.showNotification('error', 'Selecione uma camada ativa no painel Imports.');
            this.map.removeLayer(layer);
            return;
        }

        const id = 'custom_' + Date.now();
        this.saveHistoryState([id]);
        const layerColor = this.geeLayers[this.activeGeeLayerId].color;

        const geojsonFeature = layer.toGeoJSON();
        geojsonFeature.id = id;
        geojsonFeature.properties = {
            entityId: id,
            name: 'Nova Província ' + id.substring(7, 12),
            faction: this.activeGeeLayerId,
            color: layerColor,
            era: this.selectedEra
        };

        if (!this.geoJSONData) {
            this.geoJSONData = { type: 'FeatureCollection', features: [] };
        }
        this.geoJSONData.features.push(geojsonFeature);

        // Remove raw drawn layer
        this.map.removeLayer(layer);

        // Re-plot correctly with click listener
        this.plotSingleGeoJSONFeature(geojsonFeature);
        this.refreshLayersList();
        
        // Auto select the new feature
        const newLayer = this.layersMap[id];
        if (newLayer) {
            this.selectFeature(id, newLayer);
        }

        this.setActiveTool('tool-select');
        this.showNotification('success', 'Geometria desenhada e inserida na camada ativa.');
    }

    deleteSelectedFeature() {
        if (!this.selectedFeatureId) return;
        this.saveHistoryState();

        const id = this.selectedFeatureId;
        const layer = this.layersMap[id];
        if (layer) {
            this.map.removeLayer(layer);
            delete this.layersMap[id];
        }

        if (this.geoJSONData && this.geoJSONData.features) {
            this.geoJSONData.features = this.geoJSONData.features.filter(f => f.id !== id && f.properties.entityId !== id);
        }

        this.deselectFeature();
        this.refreshLayersList();
        this.showNotification('success', 'Província excluída. Salvando no servidor...');
        this.saveChangesToServer();
    }

    changeBasemap(type) {
        if (!this.map || !this.basemaps[type]) return;
        if (this.currentBasemap) this.map.removeLayer(this.currentBasemap);
        this.currentBasemap = this.basemaps[type];
        this.currentBasemap.addTo(this.map);
    }

    /**
     * Submits the updated GeoJSON back to server
     */
    async saveChangesToServer() {
        if (!this.geoJSONData) {
            this.showNotification('error', 'Nenhum dado carregado.');
            return;
        }

        if (this.selectedFeatureId && this.selectedLayer) {
            this.updateFeatureGeometry(this.selectedFeatureId, this.selectedLayer);
        }

        const relativePath = this.paths[this.selectedEra];

        // Capture control buttons
        const saveBtn = document.getElementById('btn-gee-save');
        const importBtn = document.getElementById('btn-gee-import');
        const exportBtn = document.getElementById('btn-gee-export');
        const newEmptyBtn = document.getElementById('btn-gee-new-empty');
        const loadBtn = document.getElementById('btn-gee-load');

        const buttonsToDisable = [saveBtn, importBtn, exportBtn, newEmptyBtn, loadBtn].filter(b => b !== null);

        // Disable buttons & show loading state
        buttonsToDisable.forEach(btn => btn.disabled = true);
        const originalSaveText = saveBtn ? saveBtn.textContent : '💾 Salvar no Servidor';
        if (saveBtn) saveBtn.textContent = '⏳ Gravando no Servidor...';

        try {
            const res = await fetch('/api/save-geojson', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filePath: relativePath,
                    content: this.geoJSONData
                })
            });

            const data = await res.json();
            if (res.ok && data.success) {
                this.showNotification('success', 'Alterações salvas no servidor GeoJSON!');
            } else {
                throw new Error(data.error || 'Erro desconhecido');
            }
        } catch (e) {
            console.error(e);
            this.showNotification('error', `Falha ao salvar: ${e.message}`);
        } finally {
            // Restore buttons & text
            buttonsToDisable.forEach(btn => btn.disabled = false);
            if (saveBtn) saveBtn.textContent = originalSaveText;
            this.updateHistoryButtons(); // Ensure undo/redo buttons sync correctly
        }
    }

    importGeoJSON(jsonData) {
        if (!jsonData || !jsonData.features) {
            this.showNotification('error', 'GeoJSON inválido.');
            return;
        }
        this.saveHistoryState();
        this.geoJSONData = jsonData;
        
        // Re-read layers
        this.geeLayers = {};
        this.geoJSONData.features.forEach(feature => {
            const factionId = feature.properties.faction || 'independents';
            if (!this.geeLayers[factionId]) {
                this.geeLayers[factionId] = {
                    name: factionId.toUpperCase(),
                    color: feature.properties.color || '#e5c158',
                    visible: true,
                    locked: false
                };
            }
        });
        this.activeGeeLayerId = Object.keys(this.geeLayers)[0];

        this.applyStateUpdate();
        this.showNotification('success', 'Arquivo importado localmente.');
    }

    exportGeoJSON() {
        if (!this.geoJSONData) return;
        if (this.selectedFeatureId && this.selectedLayer) {
            this.updateFeatureGeometry(this.selectedFeatureId, this.selectedLayer);
        }
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.geoJSONData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `${this.selectedEra}.geojson`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        this.showNotification('success', 'Download iniciado.');
    }

    createNewEmptyMap() {
        if (confirm('Criar um novo mapa do zero? Todo o progresso não salvo será perdido.')) {
            this.saveHistoryState();
            this.deselectFeature();

            Object.keys(this.layersMap).forEach(k => this.map.removeLayer(this.layersMap[k]));
            this.layersMap = {};

            this.geoJSONData = { type: "FeatureCollection", features: [] };
            this.geeLayers = {
                'default': { name: 'Geometria 1', color: '#e5c158', visible: true, locked: false }
            };
            this.activeGeeLayerId = 'default';

            this.refreshLayersList();
            this.showNotification('success', 'Novo mapa do zero criado!');
        }
    }

    // History undo/redo state tracking
    saveHistoryState(affectedIds = null) {
        if (!this.geoJSONData) return;

        // Determine which features are affected
        let ids = null;
        if (Array.isArray(affectedIds)) {
            ids = affectedIds;
        } else if (affectedIds) {
            ids = [affectedIds];
        } else if (this.selectedFeatureId) {
            ids = [this.selectedFeatureId];
        }

        let entry;
        if (ids && ids.length > 0) {
            // Delta backup: clone only the specified features
            const featuresDelta = {};
            ids.forEach(id => {
                const feature = this.findFeatureById(id);
                if (feature) {
                    featuresDelta[id] = JSON.parse(JSON.stringify(feature));
                } else {
                    // Feature did not exist (e.g. it was just created, so its previous state is null)
                    featuresDelta[id] = null;
                }
            });

            entry = {
                type: 'delta',
                featuresDelta: featuresDelta,
                // Keep a list of all current feature IDs in order to restore deletion/addition state
                featureIdsList: this.geoJSONData.features.map(f => f.id || f.properties.entityId || f.properties.id),
                geeLayers: JSON.parse(JSON.stringify(this.geeLayers))
            };
        } else {
            // Full backup (fallback for import, create empty, or layer deletions)
            entry = {
                type: 'full',
                geoJSONData: JSON.parse(JSON.stringify(this.geoJSONData)),
                geeLayers: JSON.parse(JSON.stringify(this.geeLayers))
            };
        }

        this.undoStack.push(entry);
        if (this.undoStack.length > 50) this.undoStack.shift();
        this.redoStack = [];
        this.updateHistoryButtons();
    }

    undo() {
        if (this.undoStack.length === 0) return;

        const entry = this.undoStack.pop();

        // Before applying, capture the current state of these same elements to the redo stack
        let redoEntry;
        if (entry.type === 'delta') {
            const redoDelta = {};
            Object.keys(entry.featuresDelta).forEach(id => {
                const feature = this.findFeatureById(id);
                redoDelta[id] = feature ? JSON.parse(JSON.stringify(feature)) : null;
            });
            redoEntry = {
                type: 'delta',
                featuresDelta: redoDelta,
                featureIdsList: this.geoJSONData.features.map(f => f.id || f.properties.entityId || f.properties.id),
                geeLayers: JSON.parse(JSON.stringify(this.geeLayers))
            };
        } else {
            redoEntry = {
                type: 'full',
                geoJSONData: JSON.parse(JSON.stringify(this.geoJSONData)),
                geeLayers: JSON.parse(JSON.stringify(this.geeLayers))
            };
        }
        this.redoStack.push(redoEntry);

        // Now apply the undo state
        if (entry.type === 'delta') {
            const updatedFeaturesMap = {};
            
            // Get all current features that are NOT in the delta
            this.geoJSONData.features.forEach(f => {
                const fid = f.id || f.properties.entityId || f.properties.id;
                if (!(fid in entry.featuresDelta)) {
                    updatedFeaturesMap[fid] = f;
                }
            });

            // Re-insert or update features from delta
            Object.keys(entry.featuresDelta).forEach(id => {
                const oldFeature = entry.featuresDelta[id];
                if (oldFeature) {
                    updatedFeaturesMap[id] = oldFeature;
                }
            });

            // Reconstruct the features list in the exact order specified by featureIdsList
            const newFeaturesList = [];
            entry.featureIdsList.forEach(id => {
                if (updatedFeaturesMap[id]) {
                    newFeaturesList.push(updatedFeaturesMap[id]);
                }
            });
            
            this.geoJSONData.features = newFeaturesList;
            this.geeLayers = entry.geeLayers;
        } else {
            this.geoJSONData = entry.geoJSONData;
            this.geeLayers = entry.geeLayers;
        }

        this.applyStateUpdate();
        this.showNotification('success', 'Desfeito.');
    }

    redo() {
        if (this.redoStack.length === 0) return;

        const entry = this.redoStack.pop();

        // Before applying, capture the current state of these same elements to the undo stack
        let undoEntry;
        if (entry.type === 'delta') {
            const undoDelta = {};
            Object.keys(entry.featuresDelta).forEach(id => {
                const feature = this.findFeatureById(id);
                undoDelta[id] = feature ? JSON.parse(JSON.stringify(feature)) : null;
            });
            undoEntry = {
                type: 'delta',
                featuresDelta: undoDelta,
                featureIdsList: this.geoJSONData.features.map(f => f.id || f.properties.entityId || f.properties.id),
                geeLayers: JSON.parse(JSON.stringify(this.geeLayers))
            };
        } else {
            undoEntry = {
                type: 'full',
                geoJSONData: JSON.parse(JSON.stringify(this.geoJSONData)),
                geeLayers: JSON.parse(JSON.stringify(this.geeLayers))
            };
        }
        this.undoStack.push(undoEntry);

        // Now apply the redo state
        if (entry.type === 'delta') {
            const updatedFeaturesMap = {};
            this.geoJSONData.features.forEach(f => {
                const fid = f.id || f.properties.entityId || f.properties.id;
                if (!(fid in entry.featuresDelta)) {
                    updatedFeaturesMap[fid] = f;
                }
            });

            Object.keys(entry.featuresDelta).forEach(id => {
                const newFeature = entry.featuresDelta[id];
                if (newFeature) {
                    updatedFeaturesMap[id] = newFeature;
                }
            });

            const newFeaturesList = [];
            entry.featureIdsList.forEach(id => {
                if (updatedFeaturesMap[id]) {
                    newFeaturesList.push(updatedFeaturesMap[id]);
                }
            });

            this.geoJSONData.features = newFeaturesList;
            this.geeLayers = entry.geeLayers;
        } else {
            this.geoJSONData = entry.geoJSONData;
            this.geeLayers = entry.geeLayers;
        }

        this.applyStateUpdate();
        this.showNotification('success', 'Refito.');
    }

    applyStateUpdate() {
        this.deselectFeature();
        Object.keys(this.layersMap).forEach(key => {
            const layer = this.layersMap[key];
            if (layer) {
                layer.off('click');
                layer.off('pm:edit');
                layer.off('pm:markerdragend');
                layer.off('pm:vertexremoved');
                layer.off('pm:markerclick');
                layer.off('pm:markercreate');
                layer.pm.disable();
                if (this.map.hasLayer(layer)) {
                    this.map.removeLayer(layer);
                }
            }
        });
        this.layersMap = {};

        this.plotGeoJSONLayers();
        this.refreshLayersList();
        this.updateHistoryButtons();
    }

    updateHistoryButtons() {
        const undoBtn = document.getElementById('btn-gee-undo');
        const redoBtn = document.getElementById('btn-gee-redo');
        if (undoBtn) undoBtn.disabled = (this.undoStack.length === 0);
        if (redoBtn) redoBtn.disabled = (this.redoStack.length === 0);
    }

    findFeatureById(id) {
        if (!this.geoJSONData || !this.geoJSONData.features) return null;
        return this.geoJSONData.features.find(f => f.id === id || f.properties.entityId === id);
    }

    showNotification(type, msg) {
        const oldNotif = document.querySelector('.editor-notification');
        if (oldNotif) oldNotif.remove();

        const notif = document.createElement('div');
        notif.className = `editor-notification notification-${type}`;
        const icon = type === 'success' ? '🛡️' : '⚠️';
        notif.innerHTML = `<span>${icon}</span> <span>${msg}</span>`;

        document.body.appendChild(notif);
        setTimeout(() => notif.classList.add('show'), 10);

        setTimeout(() => {
            notif.classList.remove('show');
            setTimeout(() => notif.remove(), 400);
        }, 3500);
    }
}

// Global instance mapping
window.MapEditor = new MapEditorController();
