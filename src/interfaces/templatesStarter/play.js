/**
 * Map Conquest - Play Template (Start Game Era Selection)
 */

window.GameTemplates = window.GameTemplates || {};

window.GameTemplates.play = {
    render: () => {
        const eras = [
            {
                id: 'medieval',
                name: 'Idade Média',
                year: '1066 d.C.',
                icon: '🏰',
                desc: 'A era dos senhores feudais, cruzadas e castelos de pedra. Lute pelo trono e unifique a Europa Ocidental fragmentada.'
            },
            {
                id: 'napoleonic',
                name: 'Era Napoleônica',
                year: '1800 d.C.',
                icon: '⚔️',
                desc: 'Napoleão Bonaparte remodela a Europa. O Império Francês avança por todo o continente enquanto as grandes potências se unem para resistir.'
            },
            {
                id: 'worldwars',
                name: 'Guerras Mundiais',
                year: '1914 d.C.',
                icon: '💣',
                desc: 'Alianças geopolíticas complexas, trincheiras e tecnologia industrial. Decida o futuro das nações no maior conflito global.'
            },
            {
                id: 'modern',
                name: 'Era Atual',
                year: 'Século XXI',
                icon: '📡',
                desc: 'O cenário geopolítico global moderno. Gerencie influências econômicas, ciber-diplomacia e o equilíbrio das superpotências.'
            }
        ];

        let html = `
            <div class="template-header">
                <h2>Iniciar Nova Campanha</h2>
                <p>Selecione o ponto de partida histórico para a sua conquista:</p>
            </div>
            <div class="eras-list">
        `;

        eras.forEach(era => {
            html += `
                <div class="era-card" data-era-id="${era.id}" data-era-name="${era.name}" data-era-year="${era.year}">
                    <div class="era-card-header">
                        <span class="era-icon">${era.icon}</span>
                        <div class="era-meta">
                            <h3>${era.name}</h3>
                            <span class="era-year">${era.year}</span>
                        </div>
                    </div>
                    <p class="era-desc">${era.desc}</p>
                    <button class="btn-menu btn-start-era">
                        ⚔️ Conquistar nesta Era
                    </button>
                </div>
            `;
        });

        html += `
            </div>
        `;
        return html;
    },

    bind: (container) => {
        const startButtons = container.querySelectorAll('.btn-start-era');
        startButtons.forEach(btn => {
            btn.addEventListener('mouseenter', () => {
                if (window.Game) window.Game.playHoverSound();
            });

            btn.addEventListener('click', (e) => {
                if (window.Game) window.Game.playClickSound();
                
                const card = e.target.closest('.era-card');
                const eraId = card.dataset.eraId;
                const eraName = card.dataset.eraName;
                const eraYear = card.dataset.eraYear;

                // Call save game creation helper to start a campaign
                handleStartNewGame(eraId, eraName, eraYear);
            });
        });
    }
};

/**
 * Creates a new save state file in the local folder and metadata in cookies
 */
async function handleStartNewGame(eraId, eraName, eraYear) {
    const saveName = prompt("Insira o nome da sua campanha:", `Império - ${eraName}`);
    if (!saveName) return;

    const saveId = Date.now();
    const saveMetadata = {
        id: saveId,
        name: saveName,
        eraId: eraId,
        eraName: eraName,
        eraYear: eraYear,
        date: new Date().toLocaleDateString('pt-BR') + ' ' + new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    const detailedGameState = {
        metadata: saveMetadata,
        playerFaction: 'Generico',
        difficulty: 'media',
        turn: 1,
        territories: {
            owned: ['Capital'],
            influence: 100,
            gold: 500,
            troops: 150
        }
    };

    // Save detailed state locally if folder authorized (non-blocking)
    if (window.Game.state.saveDirectoryHandle) {
        window.Game.writeSaveFile(`save_${saveId}.json`, JSON.stringify(detailedGameState, null, 4))
            .then(() => console.log('Progresso salvo na pasta local.'))
            .catch(err => {
                console.warn('Erro ao salvar na pasta local, usando LocalStorage fallback:', err);
                localStorage.setItem(`mc_save_${saveId}`, JSON.stringify(detailedGameState));
            });
    } else {
        console.warn('Nenhuma pasta local autorizada. Progresso salvo em LocalStorage.');
        localStorage.setItem(`mc_save_${saveId}`, JSON.stringify(detailedGameState));
    }

    // Save metadata in cookies
    let saves = window.Game.getCookie('mc_saves') || [];
    saves.push(saveMetadata);
    window.Game.setCookie('mc_saves', saves);

    // Close modal
    const activeModal = document.querySelector('.modal-overlay');
    if (activeModal) activeModal.remove();

    // Transition to Faction Board Map Layer
    window.Game.switchInterface('map-board');
    window.MapBoard.startCampaign(detailedGameState);
}
