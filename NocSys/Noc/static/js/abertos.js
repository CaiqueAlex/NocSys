// abertos.js
function escapeHtml(text) {
  return text ? text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]) : '';
}

function niceDate(dateStr) {
  if (!dateStr) return '';
  const dt = new Date(dateStr);
  const dtDate = dt.toLocaleDateString('pt-BR');
  const dtTime = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return `${dtTime} ${dtDate}`;
}

async function loadAbertos() {
  const content = document.getElementById('content-area');
  content.innerHTML = `
    <h1>Chamados em Aberto</h1>
    <p>Carregando...</p>
  `;

  try {
    const res = await fetch('/api/whatsapp-slots/?finalizado=0');
    if (!res.ok) throw new Error('Erro ao buscar chamados em aberto');
    const chamados = await res.json();

    let headerHtml = `
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 20px;">
        <h1>Chamados em Aberto</h1>
        <button id="btnRecarregarChamadosAbertos" title="Recarregar chamados" class="menu-toggle-btn" style="background: none; border: none; font-size: 24px; cursor: pointer; color: var(--accent-primary);">🔄</button>
      </div>
    `;

    if (chamados.length === 0) {
      content.innerHTML = `${headerHtml}<p>Nenhum chamado em aberto.</p>`;
      if(document.getElementById('btnRecarregarChamadosAbertos')) {
        document.getElementById('btnRecarregarChamadosAbertos').onclick = loadAbertos;
      }
      return;
    }

    const agrupado = {};
    chamados.forEach(c => {
      if (!c.codigo_chamado) return;
      const cod = c.codigo_chamado;
      if (!agrupado[cod]) agrupado[cod] = [];
      agrupado[cod].push(c);
    });

    const idsOrdenados = Object.keys(agrupado).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));

    let chamadosHtml = '<div style="display:flex;flex-direction:column;gap:12px;">';

    for (const codigo of idsOrdenados) {
      const slots = agrupado[codigo].sort((a,b) => new Date(a.criado_em) - new Date(b.criado_em));
      const primeiro = slots[0];
      const ultimo = slots[slots.length - 1];
      const aberto = primeiro.criado_em || '';
      const resumo = ultimo.resumo || '';
      const semSuporte = !ultimo.suporte;

      const alertaHtml = semSuporte 
        ? '<span class="chamado-alerta alert-gray" title="Chamado sem atribuição">❗</span>' 
        : '';

      chamadosHtml += `
        <div class="chamado" id="chamado-${escapeHtml(codigo)}">
          <div class="chamado-header" onclick="toggleAbertoDetalhes(this.parentNode)">
            <div class="chamado-info">
              <strong class="chamado-codigo">${alertaHtml}#${escapeHtml(codigo)}</strong>
              <span class="chamado-resumo" title="${escapeHtml(resumo)}">${escapeHtml(resumo)}</span>
              <div class="chamado-info-dates">
                <span>Aberto: ${niceDate(aberto)}</span>
              </div>
            </div>
            <div class="chamado-actions">
                <button class="botao-mostrar">Mostrar</button>
                <button class="botao-finalizar" title="Finalizar Chamado" onclick="event.stopPropagation(); finalizarChamado('${escapeHtml(codigo)}')">✔️</button>
                <button class="botao-editar" title="Editar Chamado" onclick="event.stopPropagation(); showEditModal('${escapeHtml(codigo)}')">✏️</button>
                <button class="botao-apagar" title="Apagar Chamado" onclick="event.stopPropagation(); apagarChamado('${escapeHtml(codigo)}')">🗑️</button>
            </div>
          </div>
          <div class="chamado-detalhes" data-codigo="${codigo}"></div>
        </div>
      `;
    }
    chamadosHtml += `</div>`;
    content.innerHTML = headerHtml + chamadosHtml;
    document.getElementById('btnRecarregarChamadosAbertos').onclick = loadAbertos;

  } catch (err) {
    content.innerHTML = `<p style="color:red;">${err.message}</p>`;
    console.error(err);
  }
}

async function toggleAbertoDetalhes(chamadoElement) {
  const detalhes = chamadoElement.querySelector('.chamado-detalhes');
  const btn = chamadoElement.querySelector('.botao-mostrar');

  if (detalhes.style.display === 'block') {
    detalhes.style.display = 'none';
    btn.innerText = 'Mostrar';
    detalhes.innerHTML = '';
    return;
  }

  btn.innerText = '...';
  detalhes.style.display = 'block'; 
  detalhes.innerHTML = '<p>Carregando detalhes...</p>';
  
  const codigo = detalhes.getAttribute('data-codigo');

  try {
    const res = await fetch(`/api/whatsapp-slots/?finalizado=0`);
    if (!res.ok) throw new Error('Erro ao buscar detalhes do chamado em aberto');
    let msgs = (await res.json()).filter(s => `${s.codigo_chamado}` === codigo);
    msgs.sort((a,b) => new Date(a.criado_em) - new Date(b.criado_em));

    let convo = `<div class="conversa-container">`;
    msgs.forEach(m => {
      const data = new Date(m.criado_em);
      const dataStr = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const isSuporte = m.username === '5514997642104@c.us';
      const nomeExibido = isSuporte ? 'Suporte' : (m.cliente || m.contact_name || 'Cliente');
      convo += `
        <div class="mensagem ${isSuporte ? 'suporte' : 'cliente'}">
            <div class="mensagem-header">
              <span>${escapeHtml(nomeExibido)}</span>
              <span>${dataStr}</span>
            </div>
            <div>${escapeHtml(m.text)}</div>
        </div>
      `;
    });
    convo += `</div>`;

    detalhes.innerHTML = convo;
    btn.innerText = 'Esconder';

  } catch (err) {
    detalhes.innerHTML = `<p style="color:red;">${err.message}</p>`;
    btn.innerText = 'Tentar Novamente';
    console.error(err);
  }
}