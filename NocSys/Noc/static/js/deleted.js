// deleted.js

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

async function loadDeleted() {
  const content = document.getElementById('content-area');
  content.innerHTML = '<h2>Chamados Apagados (Deletados)</h2><p>Carregando...</p>';

  try {
    const res = await fetch('/api/whatsapp-slots/?finalizado=1&apagado=1');
    if (!res.ok) throw new Error('Erro ao buscar chamados apagados');
    const chamados = await res.json();

    if (chamados.length === 0) {
      content.innerHTML = '<h2>Chamados Apagados (Deletados)</h2><p>Nenhum chamado apagado encontrado.</p>';
      return;
    }

    // Agrupa por conversation_key (múltiplos por contato)
    const agrupado = {};
    chamados.forEach(c => {
      const key = c.conversation_key;
      if (!agrupado[key]) agrupado[key] = [];
      agrupado[key].push(c);
    });

    let html = '<h2>Chamados Apagados (Deletados)</h2>';
    for (const key in agrupado) {
      const primeiro = agrupado[key][0];
      const contato = primeiro.contact_name || key;
      html += `
        <div class="contato-box" data-conversation-key="${key}" style="margin-bottom:20px;">
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <strong>${contato} (${key})</strong> <!-- Mostra conversation_key para diferenciar -->
            <button onclick="toggleDeletedDetalhes(this)" style="cursor:pointer; background:none; border:none; font-size: 16px;">
              Mostrar chamado
            </button>
          </div>
          <div class="chamado-detalhes" style="display:none; margin-top:10px;"></div>
        </div>
      `;
    }
    content.innerHTML = html;

  } catch (err) {
    content.innerHTML = `<p style="color:red;">${err.message}</p>`;
    console.error(err);
  }
}

async function toggleDeletedDetalhes(btn) {
  const box = btn.closest('.contato-box');
  const detalhes = box.querySelector('.chamado-detalhes');

  if (detalhes.style.display === 'block') {
    detalhes.style.display = 'none';
    btn.innerText = 'Mostrar chamado';
    detalhes.innerHTML = '';
    return;
  }

  btn.innerText = 'Carregando...';
  const key = box.getAttribute('data-conversation-key');

  try {
    const res = await fetch(`/api/whatsapp-slots/?conversation_key=${encodeURIComponent(key)}&finalizado=1&apagado=1`);
    if (!res.ok) throw new Error('Erro ao buscar detalhes do chamado apagado');
    let msgs = await res.json();
    msgs.sort((a,b) => new Date(a.criado_em) - new Date(b.criado_em));

    let convo = `<div style="max-height:400px; overflow-y:auto; border:1px solid #374151; padding:10px; border-radius:8px; display:flex; flex-direction:column; gap:10px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">`;

    msgs.forEach(m => {
      const data = new Date(m.criado_em);
      const dataStr = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const isSuporte = m.username === '5514997642104@c.us';
      const align = isSuporte ? 'flex-end' : 'flex-start';
      const bg = isSuporte ? '#2563eb' : '#374151';
      const nomeExibido = isSuporte ? 'Suporte' : (m.contact_name || 'Cliente');

      convo += `
        <div style="display:flex; justify-content:${align};">
          <div style="
            background:${bg};
            color:#fff;
            padding:8px 12px;
            border-radius: 15px;
            max-width: 70%;
            white-space: pre-wrap;
            box-shadow: 0 1px 1.5px rgba(0,0,0,0.2);
            position: relative;
            display: flex;
            flex-direction: column;
          ">
            <div style="display:flex; justify-content: space-between; font-size: 12px; font-weight: 600; margin-bottom: 6px; user-select:none;">
              <span>${escapeHtml(nomeExibido)}</span>
              <span style="opacity: 0.7;">${dataStr}</span>
            </div>
            <div>${escapeHtml(m.text)}</div>
          </div>
        </div>
      `;
    });

    convo += `</div>`;

    // Formulário do último slot (somente leitura)
    const ultimo = msgs[msgs.length - 1];
    convo += `
      <div style="margin-top:15px; display:flex; flex-direction: column; gap: 8px;">
        <textarea rows="3" readonly style="width: 100%;">${ultimo.text}</textarea>
        <input readonly placeholder="Nome do Suporte" value="${ultimo.suporte || ''}" />
        <input readonly placeholder="Nome do Cliente" value="${ultimo.cliente || ''}" />
        <textarea readonly placeholder="Problema" style="width: 100%;">${ultimo.problema || ''}</textarea>
        <input readonly placeholder="Indicador" value="${ultimo.indicador || ''}" />
        <input readonly placeholder="Tempo de Solução" value="${ultimo.tempo_solucao || ''}" />
        <p style="color: gray;">Chamado deletado - somente leitura</p>
      </div>
    `;

    detalhes.innerHTML = convo;
    detalhes.style.display = 'block';
    btn.innerText = 'Esconder chamado';

  } catch (err) {
    detalhes.innerHTML = `<p style="color:red;">${err.message}</p>`;
    detalhes.style.display = 'block';
    btn.innerText = 'Mostrar chamado';
    console.error(err);
  }
}

document.addEventListener('DOMContentLoaded', loadDeleted);