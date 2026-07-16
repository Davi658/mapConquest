/**
 * Map Conquest - Start Screen Controller (Modal Handler & Templates Connector)
 */

class StartScreenController {
    constructor() {
        this.buttons = {};
    }

    init() {
        // Cache DOM elements
        this.buttons = {
            play: document.getElementById('btn-play'),
            previousGames: document.getElementById('btn-previous'),
            language: document.getElementById('btn-language'),
            settings: document.getElementById('btn-settings'),
            editor: document.getElementById('btn-editor')
        };

        // Attach event listeners for hover and click
        Object.keys(this.buttons).forEach(key => {
            const btn = this.buttons[key];
            if (btn) {
                // Sound on hover
                btn.addEventListener('mouseenter', () => {
                    if (window.Game) {
                        window.Game.playHoverSound();
                    }
                });

                // Sound and action on click
                btn.addEventListener('click', (e) => {
                    if (window.Game) {
                        window.Game.playClickSound();
                    }
                    this.handleButtonClick(key, e);
                });
            }
        });
    }

    /**
     * Handles menu options interactions
     * @param {string} key 
     * @param {Event} event 
     */
    handleButtonClick(key, event) {
        console.log(`StartScreen: Clicked option -> ${key}`);

        if (key === 'editor') {
            window.Game.switchInterface('map-editor');
            if (window.MapEditor) {
                window.MapEditor.initEditor();
            }
            return;
        }
        
        // Dynamic localized titles for modals
        const lang = window.Game.state.settings.language || 'pt-BR';
        const modalTitles = {
            'pt-BR': {
                play: 'Nova Campanha',
                previousGames: 'Jogos Salvos',
                language: 'Selecione o Idioma',
                settings: 'Configurações do Jogo'
            },
            'en-US': {
                play: 'New Campaign',
                previousGames: 'Saved Games',
                language: 'Select Language',
                settings: 'Game Settings'
            },
            'es-ES': {
                play: 'Nueva Campaña',
                previousGames: 'Partidas Guardadas',
                language: 'Seleccione el Idioma',
                settings: 'Configuración del Juego'
            }
        };

        const titles = modalTitles[lang] || modalTitles['pt-BR'];
        const title = titles[key] || 'Opções';

        // Open modal and load corresponding template
        this.openModal(title, key);
    }

    /**
     * Dynamic Modal Overlay Spawner
     * @param {string} title 
     * @param {string} templateKey 
     */
    openModal(title, templateKey) {
        // Remove existing overlay if any remains
        const oldOverlay = document.querySelector('.modal-overlay');
        if (oldOverlay) oldOverlay.remove();

        // Create overlay element
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';

        // Create container element
        const container = document.createElement('div');
        container.className = 'modal-container';

        // Create header
        const header = document.createElement('header');
        header.className = 'modal-header';

        const titleEl = document.createElement('h2');
        titleEl.className = 'modal-title';
        titleEl.textContent = title;

        const closeBtn = document.createElement('button');
        closeBtn.className = 'btn-close-modal';
        closeBtn.innerHTML = '&times;';
        closeBtn.ariaLabel = 'Fechar';

        header.appendChild(titleEl);
        header.appendChild(closeBtn);

        // Create body container
        const body = document.createElement('div');
        body.className = 'modal-body';

        // Inject template markup and bind event listeners
        const template = window.GameTemplates[templateKey];
        if (template) {
            body.innerHTML = template.render();
            template.bind(body);
        } else {
            body.innerHTML = `<p style="color:var(--color-text-muted)">Aviso: O template "${templateKey}" não foi carregado corretamente.</p>`;
        }

        // Assemble modal
        container.appendChild(header);
        container.appendChild(body);
        overlay.appendChild(container);
        document.body.appendChild(overlay);

        // Close event handles
        const closeModal = () => {
            if (window.Game) window.Game.playClickSound();
            overlay.classList.remove('active');
            setTimeout(() => overlay.remove(), 300);
        };

        closeBtn.addEventListener('click', closeModal);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) closeModal();
        });

        // Trigger fade-in transition
        setTimeout(() => overlay.classList.add('active'), 20);
    }
}

// Instantiate and initialize when document is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    const startScreen = new StartScreenController();
    startScreen.init();
});
