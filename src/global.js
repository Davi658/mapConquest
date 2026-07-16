/**
 * Map Conquest - Global Game Manager & Routing
 */

class GameEngine {
    constructor() {
        this.state = {
            activeInterface: 'start-screen',
            settings: {
                language: 'pt-BR',
                soundVolume: 0.5,
                musicVolume: 0.3,
                quality: 'high'
            },
            audioInitialized: false,
            saveDirectoryHandle: null,
            saveDirectoryAuthorized: false
        };
        
        this.audioCtx = null;
    }

    init() {
        // Set background image
        const container = document.getElementById('game-container');
        if (container) {
            container.style.backgroundImage = "url('src/assets/background.jpg')";
        }

        // Initialize user interaction hooks (like unlocking audio context)
        document.addEventListener('click', () => this.initAudio(), { once: true });
        
        // Load Settings and Directory Handle on start
        this.loadSettingsFromCookies();
        this.applyQualitySetting();
        this.tryAutoRestoreDirectoryHandle();

        // Show start screen
        this.switchInterface('start-screen');
    }

    /**
     * Applies the quality setting as an attribute on the body element
     */
    applyQualitySetting() {
        const quality = this.state.settings.quality || 'high';
        document.body.setAttribute('data-quality', quality);
    }

    /**
     * Initializes the Web Audio API on first interaction
     */
    initAudio() {
        if (this.state.audioInitialized) return;
        try {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContext();
            this.state.audioInitialized = true;
            console.log('Audio Context initialized successfully.');
        } catch (e) {
            console.warn('Web Audio API not supported in this browser.', e);
        }
    }

    /**
     * Switches between interface layers with smooth animations
     * @param {string} interfaceId 
     */
    switchInterface(interfaceId) {
        const layers = document.querySelectorAll('.interface-layer');
        const targetLayer = document.getElementById(interfaceId);
        const container = document.getElementById('game-container');

        if (!targetLayer) {
            console.error(`Interface layer "${interfaceId}" not found.`);
            return;
        }

        // Clean up previous interface resources to free memory
        if (this.state.activeInterface === 'map-board' && interfaceId !== 'map-board') {
            if (window.MapBoard && typeof window.MapBoard.destroyMap === 'function') {
                console.log('Saindo do tabuleiro de jogo: limpando instâncias do mapa...');
                window.MapBoard.destroyMap();
            }
        }
        if (this.state.activeInterface === 'map-editor' && interfaceId !== 'map-editor') {
            if (window.MapEditor && typeof window.MapEditor.destroyMap === 'function') {
                console.log('Saindo do editor de mapas: limpando instâncias do mapa...');
                window.MapEditor.destroyMap();
            }
        }

        // Gerencia as classes do container para controlar o fundo via CSS
        if (container) {
            if (interfaceId === 'start-screen') {
                container.classList.add('on-start-screen');
            } else {
                container.classList.remove('on-start-screen');
            }
        }

        // Deactivate all layers
        layers.forEach(layer => {
            if (layer.classList.contains('active')) {
                layer.classList.remove('active');
            }
        });

        // Activate target layer
        setTimeout(() => {
            targetLayer.classList.add('active');
            this.state.activeInterface = interfaceId;
        }, 150);
    }


    /**
     * Premium Sound Synthesizer: Hover effect
     */
    playHoverSound() {
        if (!this.state.audioInitialized || !this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(320, this.audioCtx.currentTime); // Soft sound
        osc.frequency.exponentialRampToValueAtTime(440, this.audioCtx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(this.state.settings.soundVolume * 0.15, this.audioCtx.currentTime + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.15);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.15);
    }

    /**
     * Premium Sound Synthesizer: Click effect
     */
    playClickSound() {
        if (!this.state.audioInitialized || !this.audioCtx) return;
        if (this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        const osc = this.audioCtx.createOscillator();
        const gain = this.audioCtx.createGain();

        osc.connect(gain);
        gain.connect(this.audioCtx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(150, this.audioCtx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(80, this.audioCtx.currentTime + 0.15);

        gain.gain.setValueAtTime(0.01, this.audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(this.state.settings.soundVolume * 0.4, this.audioCtx.currentTime + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.25);

        osc.start();
        osc.stop(this.audioCtx.currentTime + 0.25);
    }

    /* =========================================================================
       COOKIE MANAGEMENT HELPERS
       ========================================================================= */

    setCookie(name, value, days = 365) {
        const d = new Date();
        d.setTime(d.getTime() + (days * 24 * 60 * 60 * 1000));
        const expires = "expires=" + d.toUTCString();
        document.cookie = name + "=" + encodeURIComponent(JSON.stringify(value)) + ";" + expires + ";path=/";
    }

    getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) {
                try {
                    return JSON.parse(decodeURIComponent(c.substring(nameEQ.length, c.length)));
                } catch (e) {
                    return c.substring(nameEQ.length, c.length);
                }
            }
        }
        return null;
    }

    loadSettingsFromCookies() {
        const saved = this.getCookie('mc_settings');
        if (saved) {
            this.state.settings = { ...this.state.settings, ...saved };
        }
    }

    saveSettingsToCookies() {
        this.setCookie('mc_settings', this.state.settings);
    }

    /* =========================================================================
       INDEXEDDB HELPERS (For persisting folder handles)
       ========================================================================= */

    async getDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('MapConquestDB', 1);
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains('handles')) {
                    db.createObjectStore('handles');
                }
            };
            request.onsuccess = (e) => resolve(e.target.result);
            request.onerror = (e) => reject(e.target.error);
        });
    }

    async saveDirectoryHandleToDB(handle) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('handles', 'readwrite');
            const store = tx.objectStore('handles');
            const request = store.put(handle, 'saveDir');
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    async loadDirectoryHandleFromDB() {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction('handles', 'readonly');
            const store = tx.objectStore('handles');
            const request = store.get('saveDir');
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /* =========================================================================
       FILE SYSTEM ACCESS API HELPERS
       ========================================================================= */

    async selectSaveDirectory() {
        try {
            if (!window.showDirectoryPicker) {
                throw new Error("Seu navegador não suporta a API de Acesso a Arquivos Local.");
            }
            const handle = await window.showDirectoryPicker({
                mode: 'readwrite'
            });
            await this.saveDirectoryHandleToDB(handle);
            this.state.saveDirectoryHandle = handle;
            this.state.saveDirectoryAuthorized = true;
            return handle;
        } catch (e) {
            console.error("Erro ao selecionar diretório:", e);
            throw e;
        }
    }

    async tryAutoRestoreDirectoryHandle() {
        try {
            const handle = await this.loadDirectoryHandleFromDB();
            if (handle) {
                this.state.saveDirectoryHandle = handle;
                // Note: Still requires user permission check request on action
                console.log("Restaurado handle do diretório de salvamento do IndexedDB.");
            }
        } catch (e) {
            console.warn("Falha ao tentar auto-restaurar diretório de salvamento:", e);
        }
    }

    async verifyDirectoryPermission(handle, readWrite = true) {
        const options = {};
        if (readWrite) {
            options.mode = 'readwrite';
        }
        const state = await handle.queryPermission(options);
        if (state === 'granted') {
            this.state.saveDirectoryAuthorized = true;
            return true;
        }
        // requestPermission triggers user interaction prompt
        const requestState = await handle.requestPermission(options);
        if (requestState === 'granted') {
            this.state.saveDirectoryAuthorized = true;
            return true;
        }
        this.state.saveDirectoryAuthorized = false;
        return false;
    }

    async writeSaveFile(filename, content) {
        if (!this.state.saveDirectoryHandle) {
            throw new Error("Diretório de salvamento não autorizado.");
        }
        const hasPermission = await this.verifyDirectoryPermission(this.state.saveDirectoryHandle, true);
        if (!hasPermission) {
            throw new Error("Permissão de escrita negada pelo usuário.");
        }
        const fileHandle = await this.state.saveDirectoryHandle.getFileHandle(filename, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
    }

    async readSaveFile(filename) {
        if (!this.state.saveDirectoryHandle) {
            throw new Error("Diretório de salvamento não autorizado.");
        }
        const hasPermission = await this.verifyDirectoryPermission(this.state.saveDirectoryHandle, false);
        if (!hasPermission) {
            throw new Error("Permissão de leitura negada pelo usuário.");
        }
        const fileHandle = await this.state.saveDirectoryHandle.getFileHandle(filename);
        const file = await fileHandle.getFile();
        const text = await file.text();
        return text;
    }

    async listSaveFiles() {
        if (!this.state.saveDirectoryHandle) return [];
        const hasPermission = await this.verifyDirectoryPermission(this.state.saveDirectoryHandle, false);
        if (!hasPermission) return [];
        const files = [];
        for await (const entry of this.state.saveDirectoryHandle.values()) {
            if (entry.kind === 'file' && entry.name.endsWith('.json')) {
                files.push(entry.name);
            }
        }
        return files;
    }
}

// Attach to window object
window.Game = new GameEngine();

document.addEventListener('DOMContentLoaded', () => {
    window.Game.init();
});
