/**
 * Map Conquest - Language Selection Template (UI Localization Engine)
 */

window.GameTemplates = window.GameTemplates || {};

// Translation dictionaries
const translations = {
    'pt-BR': {
        gameSubtitle: 'Estratégia & Território',
        playBtn: 'Play',
        prevBtn: 'Jogos Anteriores',
        langBtn: 'Idioma',
        settBtn: 'Configurações',
        footerVer: 'Versão 1.0.0 &bull; Antigravity Engines',
        
        storyTitle: 'A Lenda de Conquest',
        storyP1: 'Criado em uma era de conflitos feudais e alianças quebradas, <strong>Map Conquest</strong> nasceu da paixão por jogos clássicos de estratégia e disputa de territórios.',
        storyP2: 'Cada província conta uma história de bravura, astúcia e decisões táticas cruciais. Desenvolvido para reviver o espírito de grandes generais, seu objetivo é unificar os continentes sob uma única bandeira.',
        storyP3: 'Trace sua rota, mobilize seus exércitos e que comece a conquista!',
        
        hintTitle: 'Imersão Total',
        hintP1: 'Para comandar seus exércitos com a melhor visão tática e usufruir da máxima fidelidade do mapa de batalha, jogue em tela cheia.',
        hintTip: '💡 <strong>Dica:</strong> Pressione a tecla **F11** no seu teclado para expandir a tela do navegador.'
    },
    'en-US': {
        gameSubtitle: 'Strategy & Territory',
        playBtn: 'Play Campaign',
        prevBtn: 'Saves',
        langBtn: 'Language',
        settBtn: 'Settings',
        footerVer: 'Version 1.0.0 &bull; Antigravity Engines',
        
        storyTitle: 'The Legend of Conquest',
        storyP1: 'Forged in an era of feudal conflicts and broken alliances, <strong>Map Conquest</strong> was born from a passion for classic strategy games and territorial control.',
        storyP2: 'Every contested province tells a story of valor, cunning, and critical tactical decisions. Created to revive the spirit of historical generals, your goal is to unify the land under one flag.',
        storyP3: 'Plot your course, mobilize your armies, and let the conquest begin!',
        
        hintTitle: 'Total Immersion',
        hintP1: 'To command your forces with the best tactical view and enjoy maximum map fidelity, we recommend playing in fullscreen mode.',
        hintTip: '💡 <strong>Tip:</strong> Press the **F11** key on your keyboard to expand the browser window.'
    },
    'es-ES': {
        gameSubtitle: 'Estrategia y Territorio',
        playBtn: 'Jugar',
        prevBtn: 'Partidas Guardadas',
        langBtn: 'Idioma',
        settBtn: 'Configuración',
        footerVer: 'Versión 1.0.0 &bull; Antigravity Engines',
        
        storyTitle: 'La Leyenda de Conquest',
        storyP1: 'Creado en una era de conflictos feudales y alianzas rotas, <strong>Map Conquest</strong> nació de la pasión por los juegos de estrategia clásicos y el control de territorios.',
        storyP2: 'Cada provincia cuenta una historia de valentía, astucia y decisiones tácticas cruciales. Diseñado para revivir el espíritu de los grandes generales, tu meta es unificar las tierras bajo una bandera.',
        storyP3: '¡Traza tu ruta, moviliza tus ejércitos y que comience la conquista!',
        
        hintTitle: 'Inmersión Total',
        hintP1: 'Para comandar a tus tropas con la mejor perspectiva táctica y disfrutar de la máxima fidelidad del mapa, juega en pantalla completa.',
        hintTip: '💡 <strong>Consejo:</strong> Presiona la tecla **F11** en tu teclado para expandir la ventana del navegador.'
    }
};

window.GameTemplates.language = {
    render: () => {
        const currentLang = window.Game.state.settings.language;

        const languages = [
            { code: 'pt-BR', name: 'Português (Brasil)', flag: '🇧🇷' },
            { code: 'en-US', name: 'English (United States)', flag: '🇺🇸' },
            { code: 'es-ES', name: 'Español (España)', flag: '🇪🇸' }
        ];

        let html = `
            <div class="template-header">
                <h2>Idioma / Language</h2>
                <p>Selecione seu idioma de preferência:</p>
            </div>
            <div class="languages-list">
        `;

        languages.forEach(lang => {
            const isSelected = lang.code === currentLang;
            html += `
                <div class="lang-option-card ${isSelected ? 'lang-selected' : ''}" data-lang-code="${lang.code}">
                    <span class="lang-flag">${lang.flag}</span>
                    <span class="lang-name">${lang.name}</span>
                    <span class="lang-check">${isSelected ? '✓' : ''}</span>
                </div>
            `;
        });

        html += `
            </div>
        `;
        return html;
    },

    bind: (container) => {
        const options = container.querySelectorAll('.lang-option-card');
        options.forEach(opt => {
            opt.addEventListener('mouseenter', () => window.Game.playHoverSound());
            opt.addEventListener('click', (e) => {
                window.Game.playClickSound();
                const card = e.currentTarget;
                const langCode = card.dataset.langCode;

                // Update settings
                window.Game.state.settings.language = langCode;
                window.Game.saveSettingsToCookies();

                // Apply UI update
                applyLocalization(langCode);

                // Show confirmation and close
                alert(`Idioma atualizado para: ${card.querySelector('.lang-name').textContent}`);
                const activeModal = document.querySelector('.modal-overlay');
                if (activeModal) activeModal.remove();
            });
        });
    }
};

/**
 * Localizes all elements on the DOM dynamically
 * @param {string} langCode 
 */
function applyLocalization(langCode) {
    const t = translations[langCode] || translations['pt-BR'];
    
    // Main Panel Elements
    const subtitle = document.querySelector('.game-subtitle');
    if (subtitle) subtitle.textContent = t.gameSubtitle;
    
    const playText = document.querySelector('#btn-play span:not(.btn-icon)');
    if (playText) playText.textContent = t.playBtn;
    
    const prevText = document.querySelector('#btn-previous span:not(.btn-icon)');
    if (prevText) prevText.textContent = t.prevBtn;
    
    const langText = document.querySelector('#btn-language span:not(.btn-icon)');
    if (langText) langText.textContent = t.langBtn;
    
    const settText = document.querySelector('#btn-settings span:not(.btn-icon)');
    if (settText) settText.textContent = t.settBtn;

    const footer = document.querySelector('.menu-footer');
    if (footer) footer.innerHTML = `<span>${t.footerVer}</span>`;

    // Left Panel (Story) Elements
    const storyTitle = document.querySelector('.story-panel .panel-title');
    if (storyTitle) storyTitle.textContent = t.storyTitle;

    const storyContent = document.querySelector('.story-panel .panel-content');
    if (storyContent) {
        storyContent.innerHTML = `
            <p>${t.storyP1}</p>
            <p>${t.storyP2}</p>
            <p>${t.storyP3}</p>
        `;
    }

    // Right Panel (Hint) Elements
    const hintTitle = document.querySelector('.hint-panel .panel-title');
    if (hintTitle) hintTitle.textContent = t.hintTitle;

    const hintContent = document.querySelector('.hint-panel .panel-content');
    if (hintContent) {
        hintContent.innerHTML = `
            <p>${t.hintP1}</p>
            <p class="hint-tip">${t.hintTip}</p>
        `;
    }
}

// Share localization method globally so settings and init can auto-trigger it
window.Game.localizeUI = applyLocalization;

// Run dynamic localization on init once settings load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        if (window.Game && window.Game.state.settings.language) {
            applyLocalization(window.Game.state.settings.language);
        }
    }, 100);
});
