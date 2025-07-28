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
    <h2 style="display: flex; align-items: center; justify-content: space-between;">
      <span>Chamados em Aberto</span>
      <button id="btnRecarregarChamadosAbertos"
        title="Recarregar chamados"
        style="font-size: 18px; cursor: pointer; background: transparent; border: none; color: #38bdf8;">
          🔄
      </button>
    </h2>
    <p>Carregando...</p>
  `;

  try {
    const res = await fetch('/api/whatsapp-slots/?finalizado=0');
    if (!res.ok) throw new Error('Erro ao buscar chamados em aberto');
    const chamados = await res.json();

    if (chamados.length === 0) {
      content.innerHTML = '<h2>Chamados em Aberto</h2><p>Nenhum chamado em aberto.</p>';
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

    let html = `
    <h2 style="display:flex;align-items:center;justify-content:space-between;">
      <span>Chamados em Aberto</span>
      <button id="btnRecarregarChamadosAbertos" title="Recarregar" style="background:none;border:none;color:#38bdf8;font-size:22px;cursor:pointer;">🔄</button>
    </h2>
    <div style="display:flex;flex-direction:column;gap:22px;margin-top:20px;">`;

    for (const codigo of idsOrdenados) {
      const slots = agrupado[codigo].sort((a,b) => new Date(a.criado_em) - new Date(b.criado_em));
      const primeiro = slots[0];
      const contato  = primeiro.contact_name || (primeiro.conversation_key && primeiro.conversation_key.split('|')[0]) || '';
      const aberto = primeiro.criado_em || '';

      html += `
        <div class="chamado" style="
          background: #151a23;
          border-left: 4px solid #facc15;
          border-radius: 10px;
          box-shadow: 0 4px 16px rgba(0,0,0,0.25);
          margin:0 auto; padding:22px 20px 12px 16px;
          max-width:680px;
          position:relative;
        ">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div>
              <strong style="font-size:1.1em;color:#fff;">
                #${escapeHtml(codigo)} 
                &bull; ${escapeHtml(contato)}
              </strong>
              <div style="font-size:0.88em;color:#d1fae5;opacity:.84;margin-top:2px;">
                Aberto: <span>${niceDate(aberto)}</span>
                <span style="color:#eab308;"> | Status: Em Aberto</span>
              </div>
            </div>
            <button
              onclick="toggleAbertoDetalhes(this)"
              style="background: #eab308; color: #232937; border:none; font-weight:600; border-radius:5px; font-size:15px; padding:7px 16px;transition:background 0.25s; box-shadow:0 1px 6px #15213e;cursor:pointer">
                Mostrar
            </button>
          </div>
          <div class="chamado-detalhes" data-codigo="${codigo}" style="display:none;margin-top:16px;"></div>
        </div>
      `;
    }
    html += `</div>`;

    content.innerHTML = html;

    const btnRec = document.getElementById('btnRecarregarChamadosAbertos');
    if (btnRec) btnRec.onclick = loadAbertos;

  } catch (err) {
    content.innerHTML = `<p style="color:red;">${err.message}</p>`;
    console.error(err);
  }
}

async function toggleAbertoDetalhes(btn) {
  const box = btn.closest('.chamado');
  const detalhes = box.querySelector('.chamado-detalhes');

  if (detalhes.style.display === 'block') {
    detalhes.style.display = 'none';
    btn.innerText = 'Mostrar';
    detalhes.innerHTML = '';
    return;
  }

  btn.innerText = 'Carregando...';

  const codigo = detalhes.getAttribute('data-codigo');

  try {
    const res = await fetch(`/api/whatsapp-slots/?finalizado=0`);
    if (!res.ok) throw new Error('Erro ao buscar detalhes do chamado em aberto');
    let msgs = (await res.json()).filter(s => `${s.codigo_chamado}` === codigo);
    msgs.sort((a,b) => new Date(a.criado_em) - new Date(b.criado_em));

    let convo = `<div style="max-height:350px;overflow-y:auto;border:1px solid #374151;padding:14px 8px;border-radius:10px;display:flex;flex-direction:column;gap:10px;background:#1f2737;">`;
    msgs.forEach(m => {
      const data = new Date(m.criado_em);
      const dataStr = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const isSuporte = m.username === '5514997642104@c.us';
      const align = isSuporte ? 'flex-end' : 'flex-start';
      const bg = isSuporte ? '#2563eb' : '#374151';
      const nomeExibido = isSuporte ? 'Suporte' : (m.contact_name || 'Cliente');
      convo += `
        <div style="display:flex;justify-content:${align};">
          <div style="
            background:${bg};
            color:#fff;
            padding:10px 14px;
            border-radius: 16px;
            max-width: 72%;
            min-width:90px;
            white-space:pre-wrap;
            font-size:1.03em;
            box-shadow: 0 1px 2px rgba(0,0,0,0.16);
            position: relative;
            display: flex;
            flex-direction: column;">
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:4px;user-select:none;">
              <span>${escapeHtml(nomeExibido)}</span>
              <span style="opacity:.75;">${dataStr}</span>
            </div>
            <div>${escapeHtml(m.text)}</div>
          </div>
        </div>
      `;
    });
    convo += `</div>`;

    const ultimo = msgs[msgs.length - 1] || {};
    convo += `
      <div style="margin-top:13px; padding:18px 12px 12px 16px; border-radius:8px; background:#22283b; color:#f8fafc; box-shadow:0 2px 12px #10101040;">
        <h3 style="font-size: 1.13em; color:#facc15; font-weight:700; margin-bottom:13px; letter-spacing:.5px;">
          Detalhes do Suporte (atendimento)
        </h3>
        <div style="display:grid;grid-template-columns:160px 1fr;gap:7px 14px;align-items:center;">
          <span style="color:#bcdffa;font-weight:500;">Nome do Suporte:</span>
          <input readonly value="${escapeHtml(ultimo.suporte || '')}" style="background:#151a23;color:#f8fafc;border:none;border-radius:5px;padding:6px 10px;" />

          <span style="color:#bcdffa;font-weight:500;">Nome do Cliente:</span>
          <input readonly value="${escapeHtml(ultimo.cliente || '')}" style="background:#151a23;color:#f8fafc;border:none;border-radius:5px;padding:6px 10px;" />

          <span style="color:#bcdffa;font-weight:500;">Problema:</span>
          <textarea readonly rows="2" style="background:#151a23;color:#f8fafc;border:none;border-radius:5px;padding:6px 10px;">${escapeHtml(ultimo.problema || '')}</textarea>

          <span style="color:#bcdffa;font-weight:500;">Indicador:</span>
          <input readonly value="${escapeHtml(ultimo.indicador || '')}" style="background:#151a23;color:#f8fafc;border:none;border-radius:5px;padding:6px 10px;" />

          <span style="color:#bcdffa;font-weight:500;">Tempo de Solução:</span>
          <input readonly value="${escapeHtml(ultimo.tempo_solucao || '')}" style="background:#151a23;color:#f8fafc;border:none;border-radius:5px;padding:6px 10px;" />
        </div>
        <div style="margin-top:12px;font-size:.98em;color:#eab308;">Chamado em aberto - somente leitura</div>
      </div>
    `;

    detalhes.innerHTML = convo;
    detalhes.style.display = 'block';
    btn.innerText = 'Esconder';

  } catch (err) {
    detalhes.innerHTML = `<p style="color:red;">${err.message}</p>`;
    detalhes.style.display = 'block';
    btn.innerText = 'Mostrar';
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', loadAbertos);