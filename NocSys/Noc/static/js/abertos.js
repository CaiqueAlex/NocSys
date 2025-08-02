// abertos.js

let cachedAbertos = [];
let currentUserAbertos;
let currentAbertosFilter = 'none';
let currentAbertosSearch = '';

async function loadAbertos(initialFilter = 'none') {
    const contentArea = document.getElementById('content-area');
    contentArea.classList.remove('content-fade-in');
    contentArea.classList.add('content-fade-out');
    
    await new Promise(resolve => setTimeout(resolve, 500));
    contentArea.innerHTML = `<h1>Chamados em Aberto</h1><p>Carregando...</p>`;
    contentArea.classList.remove('content-fade-out');
    contentArea.classList.add('content-fade-in');

    try {
        const res = await fetch('/api/whatsapp-slots/?finalizado=0');
        if (!res.ok) throw new Error('Erro ao buscar chamados em aberto');
        cachedAbertos = await res.json();
        if (!currentUserAbertos) {
            const userRes = await fetch('/api/user/stats/');
            if(userRes.ok) currentUserAbertos = (await userRes.json()).username;
        }
        renderAbertos(initialFilter);
    } catch (err) {
        contentArea.innerHTML = `<p style="color:red;">${err.message}</p>`;
        console.error(err);
    }
}

function renderAbertos(filter = 'none', searchTerm = '') {
    currentAbertosFilter = filter;
    currentAbertosSearch = searchTerm;
    const content = document.getElementById('content-area');

    const headerHtml = `
        <div class="page-header">
            <h1>Chamados em Aberto</h1>
            <div class="page-header-actions">
                <div class="search-container">
                    <input type="search" id="inputBuscaAbertos" placeholder="Buscar por código..." value="${escapeHtml(searchTerm)}">
                    <button id="btnBuscaAbertos" title="Buscar">🔍</button>
                </div>
                <div class="filter-container">
                    <button id="btnFiltroAbertos" title="Filtrar chamados" class="menu-toggle-btn">🎚️</button>
                    <div id="filterPopupAbertos" class="filter-popup">
                        <ul class="filter-options-list">
                            <li class="filter-option ${filter === 'none' ? 'active' : ''}" data-filter="none">Limpar Filtro</li>
                            <li class="filter-option ${filter === 'unassigned' ? 'active' : ''}" data-filter="unassigned">Sem atribuição</li>
                            <li class="filter-option ${filter === 'assigned_to_me' ? 'active' : ''}" data-filter="assigned_to_me">Atribuídos a mim</li>
                            <li class="filter-option ${filter === 'incident' ? 'active' : ''}" data-filter="incident">Apenas Incidentes</li>
                            <li class="filter-option ${filter === 'request' ? 'active' : ''}" data-filter="request">Apenas Requisições</li>
                            <li class="filter-separator" style="margin: 4px 0; height: 1px; background-color: var(--bg-quaternary);"></li>
                            <li class="filter-option ${filter === 'status_ok' ? 'active' : ''}" data-filter="status_ok">Status: Ok</li>
                            <li class="filter-option ${filter === 'status_atencao' ? 'active' : ''}" data-filter="status_atencao">Status: Atenção</li>
                            <li class="filter-option ${filter === 'status_atrasado' ? 'active' : ''}" data-filter="status_atrasado">Status: Atrasado</li>
                        </ul>
                    </div>
                </div>
                <button id="btnRecarregarChamadosAbertos" title="Recarregar chamados" class="menu-toggle-btn">🔄</button>
            </div>
        </div>
    `;

    // A API agora retorna todos os slots, então o agrupamento é feito aqui no frontend
    const chamadosPorCodigo = {};
    cachedAbertos.forEach(slot => {
        if (!chamadosPorCodigo[slot.codigo_chamado]) {
            chamadosPorCodigo[slot.codigo_chamado] = [];
        }
        chamadosPorCodigo[slot.codigo_chamado].push(slot);
    });

    let chamadosParaRender = Object.values(chamadosPorCodigo).map(slots => slots[0]); // Pega o primeiro slot como representante

    if (filter !== 'none') {
        switch (filter) {
            case 'unassigned':
                chamadosParaRender = chamadosParaRender.filter(slot => !slot.suporte);
                break;
            case 'assigned_to_me':
                chamadosParaRender = chamadosParaRender.filter(slot => slot.suporte === currentUserAbertos);
                break;
            case 'incident':
                chamadosParaRender = chamadosParaRender.filter(slot => slot.indicador === 'Incidente');
                break;
            case 'request':
                chamadosParaRender = chamadosParaRender.filter(slot => slot.indicador === 'Requisição');
                break;
            case 'status_ok':
                chamadosParaRender = chamadosParaRender.filter(slot => slot.atraso_status === 'Ok!');
                break;
            case 'status_atencao':
                chamadosParaRender = chamadosParaRender.filter(slot => slot.atraso_status === 'Atenção!');
                break;
            case 'status_atrasado':
                chamadosParaRender = chamadosParaRender.filter(slot => slot.atraso_status === 'Atrasado!');
                break;
        }
    }

    if (searchTerm.trim()) {
        chamadosParaRender = chamadosParaRender.filter(slot => slot.codigo_chamado.includes(searchTerm.trim()));
    }

    chamadosParaRender.sort((a, b) => parseInt(a.codigo_chamado) - parseInt(b.codigo_chamado));

    let chamadosHtml = '';
    if (chamadosParaRender.length === 0) {
        chamadosHtml = '<p>Nenhum chamado corresponde aos filtros selecionados.</p>';
    } else {
        chamadosHtml += '<div id="lista-chamados-abertos" style="display:flex;flex-direction:column;gap:12px;">';
        chamadosParaRender.forEach(slot => {
            const alertaHtml = !slot.suporte ? '<span class="chamado-alerta alert-gray" title="Chamado sem atribuição">❗</span>' : '';
            const statusClass = (slot.atraso_status || '').toLowerCase().replace('!', '').replace('ç', 'c').replace('ã', 'a');
            const atrasoHtml = slot.atraso_status ? `<span class="atraso-status ${statusClass}">${slot.atraso_status}</span>` : '';

            chamadosHtml += `
                <div class="chamado" id="chamado-${escapeHtml(slot.codigo_chamado)}">
                    <div class="chamado-header" onclick="toggleAbertoDetalhes(this.parentNode)">
                        <div class="chamado-info">
                            <strong class="chamado-codigo">${alertaHtml}#${escapeHtml(slot.codigo_chamado)}</strong>
                            <span class="chamado-resumo" title="${escapeHtml(slot.resumo || slot.problema || '')}">${escapeHtml(slot.resumo || slot.problema || '')}</span>
                            <div class="chamado-info-dates">
                                <span>Aberto: ${niceDate(slot.criado_em)}</span>
                                ${atrasoHtml}
                            </div>
                        </div>
                        <div class="chamado-actions">
                            <button class="botao-mostrar">Mostrar</button>
                            <button class="botao-finalizar" title="Finalizar Chamado" onclick="event.stopPropagation(); finalizarChamado('${escapeHtml(slot.codigo_chamado)}')">✔️</button>
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
    addHeaderEventListenersAbertos();
}

function addHeaderEventListenersAbertos() {
    document.getElementById('btnRecarregarChamadosAbertos').onclick = () => loadAbertos(currentAbertosFilter);
    const filterBtn = document.getElementById('btnFiltroAbertos');
    const filterPopup = document.getElementById('filterPopupAbertos');
    const searchInput = document.getElementById('inputBuscaAbertos');
    const searchBtn = document.getElementById('btnBuscaAbertos');

    filterBtn.addEventListener('click', (event) => {
        event.stopPropagation();
        filterPopup.classList.toggle('show');
    });

    document.querySelectorAll('#filterPopupAbertos .filter-option').forEach(option => {
        option.addEventListener('click', function() {
            renderAbertos(this.dataset.filter, currentAbertosSearch);
            filterPopup.classList.remove('show');
        });
    });

    searchBtn.addEventListener('click', () => {
        renderAbertos(currentAbertosFilter, searchInput.value);
    });

    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            renderAbertos(currentAbertosFilter, searchInput.value);
        }
    });

    document.addEventListener('click', (event) => {
        if (filterPopup.classList.contains('show') && !filterBtn.contains(event.target) && !filterPopup.contains(event.target)) {
            filterPopup.classList.remove('show');
        }
    });
}

async function toggleAbertoDetalhes(chamadoElement) {
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
        let msgs = cachedAbertos.filter(s => `${s.codigo_chamado}` === codigo);
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
        convo += `</div></div>`; // Fecha conversa-container e conversa-wrapper

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