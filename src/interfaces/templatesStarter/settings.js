/**
 * Map Conquest - Settings Interface Template (Audio, Graphics, Folder Authorizations)
 */

window.GameTemplates = window.GameTemplates || {};

window.GameTemplates.settings = {
    render: () => {
        const settings = window.Game.state.settings;
        const isAuthorized = window.Game.state.saveDirectoryAuthorized;

        return `
            <div class="template-header">
                <h2>Configurações do Jogo</h2>
                <p>Personalize suas preferências táticas, áudio, vídeo e salvamento.</p>
            </div>
            
            <form class="settings-form" onsubmit="return false;">
                
                <!-- Section: Audio -->
                <fieldset class="settings-section">
                    <legend>🎚️ Ajustes de Áudio</legend>
                    <div class="setting-item">
                        <label for="slider-sound">Efeitos Sonoros (Sons):</label>
                        <div class="range-value-container">
                            <input type="range" id="slider-sound" min="0" max="1" step="0.05" value="${settings.soundVolume}">
                            <span id="val-sound">${Math.round(settings.soundVolume * 100)}%</span>
                        </div>
                    </div>
                </fieldset>

                <!-- Section: Graphics -->
                <fieldset class="settings-section">
                    <legend>🖼️ Qualidade de Imagem</legend>
                    <div class="setting-item">
                        <label for="select-quality">Resolução e Efeitos:</label>
                        <select id="select-quality" class="btn-menu select-setting">
                            <option value="low" ${settings.quality === 'low' ? 'selected' : ''}>Mínimo (Performance)</option>
                            <option value="medium" ${settings.quality === 'medium' ? 'selected' : ''}>Médio</option>
                            <option value="high" ${settings.quality === 'high' ? 'selected' : ''}>Alto (Qualidade Visual)</option>
                        </select>
                    </div>
                </fieldset>

                <!-- Section: Local Folder Saving Permission -->
                <fieldset class="settings-section">
                    <legend>📂 Pasta de Salvamentos (Dispositivo)</legend>
                    <div class="setting-item flex-column">
                        <p class="section-desc">Autorize uma pasta no seu computador ou celular para ler/escrever arquivos físicos de campanhas salvas (.json).</p>
                        <div class="folder-status-row">
                            <span class="folder-status-badge ${isAuthorized ? 'badge-active' : 'badge-inactive'}">
                                ${isAuthorized ? 'Pasta Conectada' : 'Sem Conexão'}
                            </span>
                            <button id="btn-authorize-folder" class="btn-menu btn-folder-action">
                                ${isAuthorized ? 'Alterar Pasta' : 'Conectar Pasta Local'}
                            </button>
                        </div>
                    </div>
                </fieldset>

            </form>
            
            <div class="settings-footer">
                <button id="btn-save-settings" class="btn-menu btn-save-action">Salvar Configurações</button>
            </div>
        `;
    },

    bind: (container) => {
        const soundSlider = container.querySelector('#slider-sound');
        const soundVal = container.querySelector('#val-sound');
        const qualitySelect = container.querySelector('#select-quality');
        const authBtn = container.querySelector('#btn-authorize-folder');
        const saveBtn = container.querySelector('#btn-save-settings');

        // Sounds slide listeners
        if (soundSlider) {
            soundSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                if (soundVal) soundVal.textContent = `${Math.round(val * 100)}%`;
                window.Game.state.settings.soundVolume = val;
            });

            // Trigger a soft beep on change release to preview the volume
            soundSlider.addEventListener('change', () => {
                window.Game.playHoverSound();
            });
        }

        // Folder authorization picker
        if (authBtn) {
            authBtn.addEventListener('mouseenter', () => window.Game.playHoverSound());
            authBtn.addEventListener('click', async () => {
                window.Game.playClickSound();
                try {
                    await window.Game.selectSaveDirectory();
                    alert("Diretório de salvamento conectado e autorizado com sucesso!");
                    
                    // Re-render settings to show success badge
                    const modalBody = container.closest('.modal-body');
                    if (modalBody) {
                        modalBody.innerHTML = window.GameTemplates.settings.render();
                        window.GameTemplates.settings.bind(modalBody);
                    }
                } catch (err) {
                    alert(`Permissão negada ou erro ao conectar diretório: ${err.message}`);
                }
            });
        }

        // General settings save
        if (saveBtn) {
            saveBtn.addEventListener('mouseenter', () => window.Game.playHoverSound());
            saveBtn.addEventListener('click', () => {
                window.Game.playClickSound();
                if (qualitySelect) {
                    window.Game.state.settings.quality = qualitySelect.value;
                    window.Game.applyQualitySetting();
                }
                // Save to cookies
                window.Game.saveSettingsToCookies();
                alert("Configurações salvas e aplicadas.");
                
                // Close modal
                const activeModal = document.querySelector('.modal-overlay');
                if (activeModal) activeModal.remove();
            });
        }
    }
};
