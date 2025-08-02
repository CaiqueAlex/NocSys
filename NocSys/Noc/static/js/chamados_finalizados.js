// chamados_finalizados.js

let cachedFinalizados = [];
let currentUserFinalizados;
let currentFinalizadosFilter = 'none';
let currentFinalizadosSearch = '';

async function loadChamadosFinalizados() {
    const contentArea = document.getElementById('content-area');
    contentArea.classList.remove('content-fade-in');
    contentArea.classList.add('content-fade-out');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    contentArea.innerHTML = `<h1>Chamados Finalizados</h1><p>Carregando...</p>`;
    contentArea.classList.remove('content-fade-out');
    contentArea.classList.add('content-fade-in');

    try {
        const res = await fetch('/api/whatsapp-slots/?finalizado=1');
        if (!res.ok) throw new Error('Erro ao buscar chamados finalizados');
        cachedFinalizados = await res.json();
        
        if (!currentUserFinalizados) {
            const userRes = await fetch('/api/user/stats/');
            if (userRes.ok) {
                const userData = await userRes.json();
                currentUserFinalizados = userData.username;
            }
        }
        
        renderChamadosFinalizados('none');
    } catch (err) {
        contentArea.innerHTML = `<p style="color:red;">${err.message}</p>`;
        console.error(err);
    }
}

function renderChamadosFinalizados(filter = 'none', searchTerm = '') {
    currentFinalizadosFilter = filter;
    currentFinalizadosSearch = searchTerm;
    const content = document.getElementById('content-area');

    const headerHtml = `
        <div class="page-header">
            <h1>Chamados Finalizados</h1>
            <div class="page-header-actions">
                <div class="search-container">
                    <input type="search" id="inputBuscaFinalizados" placeholder="Buscar por código..." value="${escapeHtml(searchTerm)}">
                    <button id="btnBuscaFinalizados" title="Buscar">🔍</button>
                </div>
                <div class="filter-container">
                    <button id="btnFiltroFinalizados" title="Filtrar chamados" class="menu-toggle-btn">🎚️</button>
                    <div id="filterPopupFinalizados" class="filter-popup">
                        <ul class="filter-options-list">
                            <li class="filter-option ${filter === 'none' ? 'active' : ''}" data-filter="none">Limpar Filtro</li>
                            <li class="filter-option ${filter === 'unassigned' ? 'active' : ''}" data-filter="unassigned">Sem atribuição</li>
                            <li class="filter-option ${filter === 'assigned_to_me' ? 'active' : ''}" data-filter="assigned_to_me">Atribuídos a mim</li>
                            <li class="filter-option ${filter === 'incident' ? 'active' : ''}" data-filter="incident">Apenas Incidentes</li>
                            <li class="filter-option ${filter === 'request' ? 'active' : ''}" data-filter="request">Apenas Requisições</li>
                        </ul>
                    </div>
                </div>
                <button id="btnRecarregarChamadosFinalizados" title="Recarregar chamados" class="menu-toggle-btn">🔄</button>
            </div>
        </div>
    `;

    const chamadosPorCodigo = {};
    cachedFinalizados.forEach(slot => {
        if (!chamadosPorCodigo[slot.codigo_chamado]) {
            chamadosPorCodigo[slot.codigo_chamado] = [];
        }
        chamadosPorCodigo[slot.codigo_chamado].push(slot);
    });

    let chamadosParaRender = Object.values(chamadosPorCodigo).map(slots => slots[0]);

    switch (filter) {
        case 'unassigned':
            chamadosParaRender = chamadosParaRender.filter(slot => !slot.suporte);
            break;
        case 'assigned_to_me':
            chamadosParaRender = chamadosParaRender.filter(slot => slot.suporte === currentUserFinalizados);
            break;
        case 'incident':
            chamadosParaRender = chamadosParaRender.filter(slot => slot.indicador === 'Incidente');
            break;
        case 'request':
            chamadosParaRender = chamadosParaRender.filter(slot => slot.indicador === 'Requisição');
            break;
    }

    if (searchTerm.trim()) {
        chamadosParaRender = chamadosParaRender.filter(slot => slot.codigo_chamado.includes(searchTerm.trim()));
    }

    chamadosParaRender.sort((a, b) => parseInt(b.codigo_chamado) - parseInt(a.codigo_chamado));

    let chamadosHtml = '';
    if (chamadosParaRender.length === 0) {
        chamadosHtml = '<p>Nenhum chamado corresponde aos filtros selecionados.</p>';
    } else {
        chamadosHtml += '<div id="lista-chamados-finalizados" style="display:flex;flex-direction:column;gap:12px;">';
        chamadosParaRender.forEach(slot => {
            const alertaHtml = !slot.suporte ? '<span class="chamado-alerta alert-blue" title="Chamado sem atribuição">❗</span>' : '';
            
            chamadosHtml += `
                <div class="chamado" id="chamado-${escapeHtml(slot.codigo_chamado)}">
                    <div class="chamado-header" onclick="toggleFinalizadoDetalhes(this.parentNode)">
                        <div class="chamado-info">
                            <strong class="chamado-codigo">${alertaHtml}#${escapeHtml(slot.codigo_chamado)}</strong>
                            <span class="chamado-resumo" title="${escapeHtml(slot.resumo || slot.problema || '')}">${escapeHtml(slot.resumo || slot.problema || '')}</span>
                            <div class="chamado-info-dates">
                                <span>Aberto: ${niceDate(slot.criado_em)}</span>
                                <span>Encerrado: ${niceDate(slot.tempo_solucao ? new Date(new Date(slot.criado_em).getTime() + 1).toISOString() : slot.criado_em)}</span>
                            </div>
                        </div>
                        <div class="chamado-actions">
                            <button class="botao-mostrar">Mostrar</button>
                            <button class="botao-editar" title="Editar Chamado" onclick="event.stopPropagation(); showEditModal('${escapeHtml(slot.codigo_chamado)}')">✏️</button>
                            <button class="botao-apagar" title="Apagar Chamado" onclick="event.stopPropagation(); apagarChamado('${escapeHtml(slot.codigo_chamado)}')">🗑️</button>
                        </div>
                    </div>
                    <div class="chamado-detalhes" data-codigo="${slot.codigo_chamado}"></div>
                </div>
            `;
        });
        chamadosHtml += `</div>`;
    }

    content.innerHTML = headerHtml + chamadosHtml;
    addHeaderEventListenersFinalizados();
}

function addHeaderEventListenersFinalizados() {
    document.getElementById('btnRecarregarChamadosFinalizados').onclick = loadChamadosFinalizados;
    
    const filterBtn = document.getElementById('btnFiltroFinalizados');
    const filterPopup = document.getElementById('filterPopupFinalizados');
    const searchInput = document.getElementById('inputBuscaFinalizados');
    const searchBtn = document.getElementById('btnBuscaFinalizados');
    
    filterBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        filterPopup.classList.toggle('show');
    });

    document.querySelectorAll('#filterPopupFinalizados .filter-option').forEach(option => {
        option.addEventListener('click', function() {
            renderChamadosFinalizados(this.dataset.filter, currentFinalizadosSearch);
            filterPopup.classList.remove('show');
        });
    });

    searchBtn.addEventListener('click', () => {
        renderChamadosFinalizados(currentFinalizadosFilter, searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            renderChamadosFinalizados(currentFinalizadosFilter, searchInput.value);
        }
    });

    document.addEventListener('click', (event) => {
        if (filterPopup.classList.contains('show') && !filterBtn.contains(event.target) && !filterPopup.contains(event.target)) {
            filterPopup.classList.remove('show');
        }
    });
}

async function toggleFinalizadoDetalhes(chamadoElement) {
    const detalhes = chamadoElement.querySelector('.chamado-detalhes');
    const btn = chamadoElement.querySelector('.botao-mostrar');

    if (detalhes.style.display === 'block') {
        detalhes.classList.remove('content-fade-in');
        detalhes.classList.add('content-fade-out');
        btn.innerText = 'Mostrar';
        setTimeout(() => {
            detalhes.style.display = 'none';
            detalhes.innerHTML = '';
        }, 500);
        return;
    }

    btn.innerText = '...';
    detalhes.style.display = 'block';
    detalhes.classList.remove('content-fade-out');
    detalhes.classList.add('content-fade-in');
    detalhes.innerHTML = '<p>Carregando detalhes...</p>';
    
    const codigo = detalhes.getAttribute('data-codigo');

    try {
        let msgs = cachedFinalizados.filter(s => `${s.codigo_chamado}` === codigo);
        msgs.sort((a, b) => new Date(a.criado_em) - new Date(b.criado_em));

        let convo = `<div class="conversa-wrapper">
                        <button class="btn-fullscreen" title="Ver em tela cheia">⛶</button>
                        <div class="conversa-container">`;
        msgs.forEach(m => {
            const isSuporte = m.username === '5514997642104@c.us';
            const nomeExibido = isSuporte ? 'Suporte' : (m.cliente || m.contact_name || 'Cliente');
            
            const messageContent = renderMessageContent(m);

            convo += `
                <div class="mensagem ${isSuporte ? 'suporte' : 'cliente'}">
                    <div class="mensagem-header">
                        <span>${escapeHtml(nomeExibido)}</span>
                        <span>${niceDate(m.criado_em)}</span>
                    </div>
                    ${messageContent}
                </div>
            `;
        });
        convo += `</div></div>`;

        const ultimo = msgs[msgs.length - 1] || {};
        convo += `
            <div class="detalhes-suporte-container">
                <h3>Detalhes do Suporte</h3>
                <div class="detalhes-grid">
                    <span>Suporte:</span> <input readonly value="${escapeHtml(ultimo.suporte || 'N/A')}" />
                    <span>Cliente:</span> <input readonly value="${escapeHtml(ultimo.cliente || 'N/A')}" />
                    <span>Setor:</span> <input readonly value="${escapeHtml(ultimo.setor || 'N/A')}" />
                    <span>Resumo:</span> <input readonly value="${escapeHtml(ultimo.resumo || 'N/A')}" />
                    <span>Problema:</span> <textarea readonly rows="2">${escapeHtml(ultimo.problema || 'N/A')}</textarea>
                    <span>Solução:</span> <textarea readonly rows="2">${escapeHtml(ultimo.solucao || 'N/A')}</textarea>
                    <span>Indicador:</span> <input readonly value="${escapeHtml(ultimo.indicador || 'N/A')}" />
                    <span>Tempo Solução:</span> <input readonly value="${escapeHtml(ultimo.tempo_solucao || 'N/A')}" />
                </div>
            </div>
        `;

        detalhes.innerHTML = convo;
        btn.innerText = 'Esconder';

    } catch (err) {
        detalhes.innerHTML = `<p style="color:red;">${err.message}</p>`;
        btn.innerText = 'Tentar Novamente';
        console.error(err);
    }
}