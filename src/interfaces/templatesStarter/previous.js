/**
 * Map Conquest - Previous Games Template (Saved Games Listing & Sync)
 */

window.GameTemplates = window.GameTemplates || {};

window.GameTemplates.previous = {
    render: () => {
        // Read metadata lists from cookies
        const saves = window.Game.getCookie('mc_saves') || [];
        const isAuthorized = window.Game.state.saveDirectoryAuthorized;

        let html = `
            <div class="template-header">
                <h2>Jogos Salvos</h2>
                <p>Gerencie e carregue seu progresso de campanhas anteriores.</p>
            </div>
            
            <div class="sync-banner">
                <div class="sync-status">
                    <span>Pasta Local:</span> 
                    <strong class="${isAuthorized ? 'status-active' : 'status-inactive'}">
                        ${isAuthorized ? '✓ Autorizada' : '✗ Não Conectada'}
                    </strong>
                </div>
                <button id="btn-sync-folder" class="btn-menu btn-sync">
                    🔄 Sincronizar Arquivos da Pasta
                </button>
            </div>
        `;

        if (saves.length === 0) {
            html += `
                <div class="empty-state">
                    <p>Nenhuma campanha salva encontrada em seu navegador.</p>
                    <p class="sub-text">Inicie uma nova campanha no botão "Play" ou conecte/sincronize sua pasta local para importar arquivos de progresso.</p>
                </div>
            `;
        } else {
            html += `<div class="saves-list">`;
            saves.forEach(save => {
                html += `
                    <div class="save-item" data-save-id="${save.id}">
                        <div class="save-info">
                            <span class="save-icon">⚔️</span>
                            <div class="save-details">
                                <h3>${save.name}</h3>
                                <span class="save-meta">${save.eraName} (${save.eraYear}) &bull; ${save.date}</span>
                            </div>
                        </div>
                        <div class="save-actions">
                            <button class="btn-menu btn-load-save">Carregar</button>
                            <button class="btn-menu btn-delete-save btn-danger">Excluir</button>
                        </div>
                    </div>
                `;
            });
            html += `</div>`;
        }

        return html;
    },

    bind: (container) => {
        const syncBtn = container.querySelector('#btn-sync-folder');
        if (syncBtn) {
            syncBtn.addEventListener('mouseenter', () => window.Game.playHoverSound());
            syncBtn.addEventListener('click', async () => {
                window.Game.playClickSound();
                await handleSyncLocalFolder(container);
            });
        }

        const loadButtons = container.querySelectorAll('.btn-load-save');
        loadButtons.forEach(btn => {
            btn.addEventListener('mouseenter', () => window.Game.playHoverSound());
            btn.addEventListener('click', async (e) => {
                window.Game.playClickSound();
                const item = e.target.closest('.save-item');
                const saveId = item.dataset.saveId;
                await handleLoadGame(saveId);
            });
        });

        const deleteButtons = container.querySelectorAll('.btn-delete-save');
        deleteButtons.forEach(btn => {
            btn.addEventListener('mouseenter', () => window.Game.playHoverSound());
            btn.addEventListener('click', async (e) => {
                window.Game.playClickSound();
                const item = e.target.closest('.save-item');
                const saveId = item.dataset.saveId;
                handleDeleteGame(saveId, container);
            });
        });
    }
};

/**
 * Syncs the local browser save list with actual JSON files inside the authorized folder picker
 */
async function handleSyncLocalFolder(container) {
    if (!window.Game.state.saveDirectoryHandle) {
        // Prompt selection
        const confirmPick = confirm("Para sincronizar campanhas locais, selecione uma pasta no seu dispositivo. Deseja escolher uma pasta agora?");
        if (!confirmPick) return;
        try {
            await window.Game.selectSaveDirectory();
        } catch (err) {
            alert(`Falha ao autorizar diretório: ${err.message}`);
            return;
        }
    }

    try {
        const fileNames = await window.Game.listSaveFiles();
        const importedSaves = [];

        for (const name of fileNames) {
            try {
                const text = await window.Game.readSaveFile(name);
                const gameState = JSON.parse(text);
                if (gameState && gameState.metadata) {
                    importedSaves.push(gameState.metadata);
                }
            } catch (err) {
                console.warn(`Erro ao ler arquivo ${name}:`, err);
            }
        }

        if (importedSaves.length === 0) {
            alert("Nenhum arquivo de progresso (.json válido) encontrado na pasta selecionada.");
            return;
        }

        // Update cookie metadata, merging or replacing
        let saves = window.Game.getCookie('mc_saves') || [];
        
        // Merge without duplicates (using ID as primary key)
        const savesMap = new Map();
        saves.forEach(s => savesMap.set(s.id, s));
        importedSaves.forEach(s => savesMap.set(s.id, s));
        
        const mergedSaves = Array.from(savesMap.values());
        window.Game.setCookie('mc_saves', mergedSaves);

        alert(`Sincronização concluída! ${importedSaves.length} campanhas sincronizadas com a pasta local.`);
        
        // Reload modal contents
        const modalBody = container.closest('.modal-body');
        if (modalBody) {
            modalBody.innerHTML = window.GameTemplates.previous.render();
            window.GameTemplates.previous.bind(modalBody);
        }
    } catch (err) {
        console.error(err);
        alert(`Erro durante a sincronização: ${err.message}`);
    }
}

/**
 * Loads detailed game data from the file system directory or from cookie fallback
 */
async function handleLoadGame(saveId) {
    let gameState = null;

    if (window.Game.state.saveDirectoryHandle) {
        try {
            const fileContent = await window.Game.readSaveFile(`save_${saveId}.json`);
            gameState = JSON.parse(fileContent);
        } catch (err) {
            console.warn("Falha ao carregar do arquivo físico, tentando LocalStorage:", err);
            const localData = localStorage.getItem(`mc_save_${saveId}`);
            if (localData) {
                gameState = JSON.parse(localData);
            }
        }
    } else {
        const localData = localStorage.getItem(`mc_save_${saveId}`);
        if (localData) {
            gameState = JSON.parse(localData);
        }
    }

    if (!gameState) {
        // Fallback: load meta information from cookies
        const saves = window.Game.getCookie('mc_saves') || [];
        const meta = saves.find(s => String(s.id) === String(saveId));
        if (meta) {
            gameState = { metadata: meta, fallback: true };
        }
    }

    if (gameState) {
        if (gameState.fallback) {
            gameState.turn = 1;
            gameState.territories = {
                gold: 500
            };
        }
        
        // Close modal
        const activeModal = document.querySelector('.modal-overlay');
        if (activeModal) activeModal.remove();

        // Switch to Faction Board Map Layer
        window.Game.switchInterface('map-board');
        window.MapBoard.startCampaign(gameState);
    } else {
        alert("Erro: Não foi possível ler os dados dessa campanha.");
    }
}

/**
 * Deletes a game save from browser cookies and LocalStorage
 */
function handleDeleteGame(saveId, container) {
    if (!confirm("Tem certeza que deseja excluir esta campanha da lista?")) return;

    let saves = window.Game.getCookie('mc_saves') || [];
    saves = saves.filter(s => String(s.id) !== String(saveId));
    window.Game.setCookie('mc_saves', saves);
    
    // Also remove from LocalStorage
    localStorage.removeItem(`mc_save_${saveId}`);

    alert("Campanha removida.");
    
    // Reload modal contents
    const modalBody = container.closest('.modal-body');
    if (modalBody) {
        modalBody.innerHTML = window.GameTemplates.previous.render();
        window.GameTemplates.previous.bind(modalBody);
    }
}
