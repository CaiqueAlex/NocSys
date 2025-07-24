// chamados.js

let chamadosInterval = null;

function confirmarAcao(mensagem) {
  return new Promise((resolve) => {
    let popupExistente = document.getElementById('popup-confirmacao');
    if (popupExistente) popupExistente.remove();

    const popup = document.createElement('div');
    popup.id = 'popup-confirmacao';
    popup.style = `
      position: fixed;
      top:0; left:0; right:0; bottom:0;
      background: rgba(0,0,0,0.6);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;

    const box = document.createElement('div');
    box.style = `
      background: #1e293b;
      padding: 20px 30px;
      border-radius: 10px;
      max-width: 350px;
      color: #f1f5f9;
      box-shadow: 0 0 15px #2563eb;
      text-align: center;
      font-family: 'Segoe UI', sans-serif;
    `;

    const msg = document.createElement('p');
    msg.textContent = mensagem;
    msg.style.marginBottom = '20px';

    const btnSim = document.createElement('button');
    btnSim.textContent = 'Sim';
    btnSim.style = `
      background: #2563eb;
      color: white;
      border: none;
      padding: 10px 20px;
      margin-right: 15px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    `;

    const btnNao = document.createElement('button');
    btnNao.textContent = 'Não';
    btnNao.style = `
      background: #ef4444;
      color: white;
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    `;

    btnSim.onclick = () => {
      popup.remove();
      resolve(true);
    };
    btnNao.onclick = () => {
      popup.remove();
      resolve(false);
    };

    box.append(msg, btnSim, btnNao);
    popup.appendChild(box);
    document.body.appendChild(popup);
  });
}

async function loadChamados() {
  const content = document.getElementById('content-area');
  const header = `
    <h2 style="display: flex; align-items: center; justify-content: space-between;">
      Chamados Agrupados por Contato
      <button id="btnRecarregarChamados" title="Recarregar chamados" 
        style="font-size: 18px; cursor: pointer; background: transparent; border: none;">🔄</button>
    </h2>
  `;
  content.innerHTML = header + '<p>Carregando chamados...</p>';

  try {
    // Busque APENAS os que não estão finalizados nem deletados
    const res = await fetch('/api/whatsapp-slots/?finalizado=0&deletado=false');
    if (!res.ok) throw new Error('Erro ao buscar chamados');
    const chamados = await res.json();

    if (chamados.length === 0) {
      content.innerHTML = header + '<p>Nenhum chamado encontrado.</p>';
      attachReloadEvent();
      return;
    }

    // Agrupa por conversation_key
    const agrupado = {};
    chamados.forEach(c => {
      const key = c.conversation_key;
      if (!agrupado[key]) agrupado[key] = [];
      agrupado[key].push(c);
    });

    let html = header;
    for (const key in agrupado) {
      const slots = agrupado[key];
      const primeiro = slots[0];
      const contato = primeiro.contact_name || key;
      html += `
        <div class="contato-box" style="margin-bottom:20px;position:relative;"
             data-conversation-key="${key}">
          <div class="chamado" style="display:flex;align-items:center;justify-content:space-between;">
            <strong>${contato}</strong>
            <div>
              <button class="botao-mostrar" onclick="toggleChamadoDetalhes(this)">Mostrar chamado</button>
              <button class="botao-apagar" onclick="apagarChamado(this)"
                style="background:none;border:none;font-size:20px;color:red;cursor:pointer;margin-left:10px;">
                ❌
              </button>
            </div>
          </div>
          <div class="chamado-detalhes" style="display:none;margin-top:10px;"></div>
        </div>
      `;
    }
    content.innerHTML = html;
    attachReloadEvent();

    if (chamadosInterval) clearInterval(chamadosInterval);

  } catch (err) {
    content.innerHTML = `<p style="color:red;">${err.message}</p>`;
    console.error(err);
  }
}

function attachReloadEvent() {
  const btn = document.getElementById('btnRecarregarChamados');
  if (btn) btn.onclick = () => loadChamados();
}

async function toggleChamadoDetalhes(btn) {
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
    // Só pega slots NÃO FINALIZADOS, para garantir
    const res = await fetch(`/api/whatsapp-slots/?conversation_key=${encodeURIComponent(key)}&finalizado=0&deletado=false`);
    if (!res.ok) throw new Error('Erro ao buscar detalhes');
    let msgs = await res.json();
    msgs.sort((a,b) => new Date(a.criado_em) - new Date(b.criado_em));

    let convo = `<div style="max-height:400px; overflow-y:auto; border:1px solid #374151; padding:10px; border-radius:8px; display:flex; flex-direction:column; gap:10px;">`;
    msgs.forEach(m => {
      const data = new Date(m.criado_em);
      const dataStr = data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      const isSuporte = m.username === '5514997642104@c.us';
      const align = isSuporte ? 'flex-end' : 'flex-start';
      const bg = isSuporte ? '#2563eb' : '#374151';
      const nomeExibido = isSuporte ? 'Suporte' : (m.contact_name || 'Cliente');
      convo += `
        <div style="display:flex; justify-content:${align};">
          <div style="background:${bg};color:#fff;padding:8px 12px;border-radius:15px;max-width:70%;white-space:pre-wrap;box-shadow:0 1px 1.5px rgba(0,0,0,0.2);">
            <div style="display:flex;justify-content:space-between;font-size:12px;font-weight:600;margin-bottom:6px;user-select:none;">
              <span>${escapeHtml(nomeExibido)}</span>
              <span style="opacity:0.7;">${dataStr}</span>
            </div>
            <div>${escapeHtml(m.text)}</div>
          </div>
        </div>
      `;
    });
    convo += `</div>`;

    // Formulário do último slot (editável)
    const ultimo = msgs[msgs.length - 1];
    convo += `
      <div style="margin-top:15px;display:flex;flex-direction:column;gap:8px;">
        <textarea rows="3" class="campo-text" style="width:100%;">${ultimo.text}</textarea>
        <input class="campo-suporte" placeholder="Nome do Suporte" value="${ultimo.suporte || ''}" />
        <input class="campo-cliente" placeholder="Nome do Cliente" value="${ultimo.cliente || ''}" />
        <textarea class="campo-problema" placeholder="Problema" style="width:100%;">${ultimo.problema || ''}</textarea>
        <input class="campo-indicador" placeholder="Indicador" value="${ultimo.indicador || ''}" />
        <input class="campo-tempo" placeholder="Tempo de Solução" value="${ultimo.tempo_solucao || ''}" />
        <div style="display:flex;gap:10px;">
          <button onclick="salvarChamado(this)" data-id="${ultimo.id}">💾 Salvar</button>
          <button onclick="finalizarAtendimento('${key}', this)">✅ Finalizar Atendimento</button>
        </div>
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

async function salvarChamado(botao) {
  const id = botao.getAttribute('data-id');
  const container = botao.parentElement.parentElement;
  const dados = {
    text: container.querySelector('.campo-text').value,
    suporte: container.querySelector('.campo-suporte').value,
    cliente: container.querySelector('.campo-cliente').value,
    problema: container.querySelector('.campo-problema').value,
    indicador: container.querySelector('.campo-indicador').value,
    tempo_solucao: container.querySelector('.campo-tempo').value
  };
  try {
    const res = await fetch(`/api/whatsapp-slots/${id}/`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados)
    });
    if (!res.ok) throw new Error('Erro ao salvar');
    botao.innerText = '✅ Salvo!';
    setTimeout(() => botao.innerText = '💾 Salvar', 2000);
  } catch (e) {
    console.error(e);
    botao.innerText = '❌ Erro!';
  }
}

async function finalizarAtendimento(key, btn) {
  btn.disabled = true;
  btn.innerText = 'Finalizando...';
  try {
    // Busca todos slots do conversation_key e finaliza todos!
    const res = await fetch(`/api/whatsapp-slots/?conversation_key=${encodeURIComponent(key)}&deletado=false`);
    if (!res.ok) throw new Error();
    const lista = await res.json();
    await Promise.all(lista.map(s =>
      fetch(`/api/whatsapp-slots/${s.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chamadofinalizado: true })
      })
    ));
    btn.innerText = '✅ Finalizado';
    setTimeout(loadChamados, 250); // Garante sumir RAPIDAMENTE ao finalizar
    // Opcional: também pode forçar recarregar Finalizados aqui se quiser: window.setTimeout(loadChamadosFinalizados,350)
  } catch {
    console.error('Erro ao finalizar');
    btn.innerText = '❌ Erro';
    btn.disabled = false;
  }
}

async function apagarChamado(btn) {
  const ok = await confirmarAcao('Tem certeza que deseja apagar este chamado? Esta ação é reversível pela equipe técnica.');
  if (!ok) return;

  const box = btn.closest('.contato-box');
  const key = box.getAttribute('data-conversation-key');
  try {
    const res = await fetch(`/api/whatsapp-slots/?conversation_key=${encodeURIComponent(key)}&deletado=false`);
    if (!res.ok) throw new Error();
    const lista = await res.json();
    await Promise.all(lista.map(s =>
      fetch(`/api/whatsapp-slots/${s.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ deletado: true })
      })
    ));
    box.remove();
    await loadChamados();
  } catch {
    alert('Erro ao apagar chamado.');
  }
}

function escapeHtml(text) {
  return text.replace(/[&<>"']/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]);
}

document.addEventListener('DOMContentLoaded', loadChamados);