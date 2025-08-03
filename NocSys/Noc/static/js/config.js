let chartInstances = []; // Alterado para um array para gerenciar múltiplos gráficos

// --- LÓGICA DE GRÁFICOS REFEITA ---

// Define cores padrão para os gráficos baseadas no tema atual
function setChartDefaults() {
    const style = getComputedStyle(document.body);
    Chart.defaults.color = style.getPropertyValue('--text-primary').trim();
    Chart.defaults.borderColor = style.getPropertyValue('--border-color').trim();
}

async function showSettingsModal() {
    const backdrop = document.getElementById('settings-backdrop');
    const settingsBox = document.getElementById('settings-box');
    if (!backdrop) return;
    
    const closeBtn = document.getElementById('settings-close-btn');
    const navLinks = document.querySelectorAll('.settings-nav-link');

    backdrop.classList.remove('hidden');
    
    const hide = () => backdrop.classList.add('hidden');
    closeBtn.onclick = hide;
    backdrop.onclick = (e) => { if(e.target === backdrop) hide(); };

    navLinks.forEach(link => {
        link.onclick = (e) => {
            e.preventDefault();
            navLinks.forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.settings-view').forEach(v => v.classList.add('hidden'));

            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            const targetView = document.getElementById(targetId);
            
            if (targetId === 'settings-view-graficos') {
                loadCharts();
            } else {
                if (targetId === 'settings-view-user') loadUserStats();
                else if (targetId === 'settings-view-clientes') loadClientManagement();
            }
            if(targetView) targetView.classList.remove('hidden');
        };
    });

    document.querySelector('.settings-nav-link.active').click();
}

async function loadUserStats() {
    try {
        const res = await fetch('/api/user/stats/');
        if (!res.ok) throw new Error('Falha ao carregar dados do usuário.');
        const data = await res.json();
        document.getElementById('settings-user-name').textContent = data.full_name || data.username;
        document.getElementById('settings-user-email').textContent = data.email || 'Não informado';
        document.getElementById('settings-user-username').textContent = data.username;
        document.getElementById('settings-user-joined').textContent = new Date(data.date_joined).toLocaleDateString('pt-BR');
        document.getElementById('settings-finalizados-count').textContent = data.finalizados_count;
        if (currentUser) {
            currentUser.is_admin = data.is_admin;
        } else {
            currentUser = { is_admin: data.is_admin };
        }
    } catch (error) {
        console.error('Erro:', error);
    }
}

async function loadClientManagement() {
    const tableBody = document.getElementById('client-table-body');
    tableBody.innerHTML = '<tr><td colspan="4">Carregando...</td></tr>';
    try {
        const res = await fetch('/api/clientes/');
        if (!res.ok) throw new Error('Falha ao buscar clientes.');
        const clientes = await res.json();
        tableBody.innerHTML = '';
        if (clientes.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="4">Nenhum cliente cadastrado.</td></tr>';
        } else {
            clientes.forEach(c => {
                const row = document.createElement('tr');
                row.id = `client-row-${c.id}`;
                row.innerHTML = `
                    <td>${c.nome}</td> <td>${c.numero}</td> <td>${c.setor || 'N/A'}</td>
                    <td class="client-actions">
                        <button class="btn-client-edit" data-id="${c.id}" title="Editar">✏️</button>
                        <button class="btn-client-delete" data-id="${c.id}" title="Apagar">🗑️</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });
        }
        document.querySelectorAll('.btn-client-edit').forEach(btn => btn.onclick = () => handleEditClient(btn.dataset.id));
        document.querySelectorAll('.btn-client-delete').forEach(btn => btn.onclick = () => handleDeleteClient(btn.dataset.id));
    } catch (error) {
        tableBody.innerHTML = `<tr><td colspan="4" style="color:red;">${error.message}</td></tr>`;
    }
    document.getElementById('add-client-btn').onclick = () => handleAddClient();
}

async function loadCharts() {
    const chartsContainer = document.getElementById('charts-container');
    chartsContainer.innerHTML = '<p>Carregando estatísticas...</p>';
    try {
        const res = await fetch('/api/graficos/status_chamados/');
        if (!res.ok) throw new Error('Falha ao carregar dados dos gráficos.');
        const chartData = await res.json();
        
        if (chartData.type === 'admin') {
            renderAdminDataTable(chartData.data);
        } else {
            renderUserDataSummary(chartData.data);
        }
    } catch (error) {
        chartsContainer.innerHTML = `<p style="color:var(--danger-color);">${error.message}</p>`;
    }
}

function showChartsFullscreen(data, type) {
    const backdrop = document.getElementById('charts-fullscreen-backdrop');
    const content = document.getElementById('charts-fullscreen-content');
    const closeBtn = document.getElementById('charts-fullscreen-close-btn');

    content.innerHTML = ''; // Limpa conteúdo anterior
    chartInstances.forEach(chart => chart.destroy());
    chartInstances = [];

    if (type === 'admin') {
        renderAdminChartsInModal(data, content);
    } else {
        renderStatusChartInModal(data, content);
    }

    const hide = () => backdrop.classList.add('hidden');
    closeBtn.onclick = hide;
    backdrop.onclick = e => { if (e.target === backdrop) hide(); };
    
    backdrop.classList.remove('hidden');
}

function renderAdminDataTable(data) {
    const container = document.getElementById('charts-container');
    if (data.length === 0) {
        container.innerHTML = '<p>Nenhuma estatística de usuário para exibir.</p>';
        return;
    }

    let tableHTML = `
        <div class="stats-header">
            <h3>Resumo por Usuário</h3>
            <button id="show-admin-charts-btn" class="btn-show-charts">Ver Gráficos ⛶</button>
        </div>
        <div class="client-table-container">
            <table class="admin-stats-table">
                <thead>
                    <tr>
                        <th>Usuário</th>
                        <th>Finalizados</th>
                        <th>Atribuídos</th>
                        <th>Atrasados</th>
                    </tr>
                </thead>
                <tbody>
    `;
    data.forEach(user => {
        tableHTML += `
            <tr>
                <td>${escapeHtml(user.username)}</td>
                <td>${user.finalizados}</td>
                <td>${user.atribuidos}</td>
                <td>${user.atrasados}</td>
            </tr>
        `;
    });
    tableHTML += '</tbody></table></div>';
    container.innerHTML = tableHTML;
    document.getElementById('show-admin-charts-btn').onclick = () => showChartsFullscreen(data, 'admin');
}

function renderUserDataSummary(data) {
    const container = document.getElementById('charts-container');
    let summaryHTML = `
        <div class="stats-header">
            <h3>Resumo Geral</h3>
            <button id="show-user-chart-btn" class="btn-show-charts">Ver Gráfico ⛶</button>
        </div>
        <div class="user-stats-summary">
    `;
    data.labels.forEach((label, index) => {
        summaryHTML += `
            <div class="summary-item">
                <span class="summary-label">${label}:</span>
                <span class="summary-value">${data.counts[index]}</span>
            </div>
        `;
    });
    summaryHTML += `</div>`;
    container.innerHTML = summaryHTML;
    document.getElementById('show-user-chart-btn').onclick = () => showChartsFullscreen(data, 'user');
}

function renderAdminChartsInModal(data, container) {
    setChartDefaults();
    const labels = data.map(d => d.username);
    const chartConfigs = [
        { title: 'Chamados Finalizados', data: data.map(d => d.finalizados), color: getComputedStyle(document.body).getPropertyValue('--success-color').trim() },
        { title: 'Chamados Atribuídos (Abertos)', data: data.map(d => d.atribuidos), color: getComputedStyle(document.body).getPropertyValue('--accent-tertiary').trim() },
        { title: 'Chamados Atrasados', data: data.map(d => d.atrasados), color: getComputedStyle(document.body).getPropertyValue('--danger-color').trim() }
    ];

    chartConfigs.forEach((config, index) => {
        const chartWrapper = document.createElement('div');
        chartWrapper.className = 'chart-box-admin';
        chartWrapper.innerHTML = `<h3>${config.title}</h3><canvas id="modal-admin-chart-${index}"></canvas>`;
        container.appendChild(chartWrapper);
        const ctx = document.getElementById(`modal-admin-chart-${index}`).getContext('2d');
        const newChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: config.title, data: config.data,
                    backgroundColor: config.color, borderColor: config.color, borderWidth: 1
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { stepSize: 1, color: Chart.defaults.color } }, x: { ticks: { color: Chart.defaults.color } } }
            }
        });
        chartInstances.push(newChart);
    });
}

function renderStatusChartInModal(data, container) {
    setChartDefaults();
    container.innerHTML = `
        <div id="status-chart-container-modal" class="chart-box">
            <canvas id="modal-pie-chart"></canvas>
        </div>
        <div id="status-chart-legend-modal" class="chart-legend"></div>
    `;
    const ctx = document.getElementById('modal-pie-chart').getContext('2d');
    const style = getComputedStyle(document.body);
    const newChart = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.counts,
                backgroundColor: [
                    style.getPropertyValue('--success-color').trim(), 
                    style.getPropertyValue('--accent-tertiary').trim(), 
                    style.getPropertyValue('--danger-color').trim()
                ],
                borderColor: style.getPropertyValue('--bg-tertiary').trim(), borderWidth: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
    chartInstances.push(newChart);

    const legendContainer = document.getElementById('status-chart-legend-modal');
    legendContainer.innerHTML = '';
    data.labels.forEach((label, index) => {
        legendContainer.innerHTML += `
            <div class="legend-item">
                <span class="legend-color-box" style="background-color: ${newChart.data.datasets[0].backgroundColor[index]};"></span>
                <span class="legend-label">${label}: <strong>${data.counts[index]}</strong></span>
            </div>`;
    });
}

// --- Funções CRUD para Clientes (sem alterações) ---
function showClientModal(client = null) {
    const modal = document.getElementById('cliente-modal-backdrop');
    const form = document.getElementById('cliente-form');
    const title = document.getElementById('cliente-modal-title');
    const closeBtn = document.getElementById('cliente-modal-close-btn');

    form.reset();
    form.elements.id.value = '';

    if (client) {
        title.textContent = 'Editar Cliente';
        form.elements.id.value = client.id;
        form.elements.nome.value = client.nome;
        form.elements.numero.value = client.numero;
        form.elements.setor.value = client.setor || '';
    } else {
        title.textContent = 'Adicionar Novo Cliente';
    }

    modal.classList.remove('hidden');
    
    const hide = () => modal.classList.add('hidden');
    closeBtn.onclick = hide;
    modal.onclick = (e) => { if(e.target === modal) hide(); };
    form.onsubmit = handleSaveClient;
}

function handleAddClient() {
    showClientModal();
}

async function handleEditClient(id) {
    try {
        const res = await fetch(`/api/clientes/${id}/`);
        if (!res.ok) throw new Error('Cliente não encontrado.');
        const clientData = await res.json();
        showClientModal(clientData);
    } catch(err) {
        alert(err.message);
    }
}

async function handleSaveClient(event) {
    event.preventDefault();
    const form = event.target;
    const saveBtn = document.getElementById('cliente-form-save-btn');
    const clientId = form.elements.id.value;
    const isEditing = !!clientId;

    const data = {
        nome: form.elements.nome.value,
        numero: form.elements.numero.value,
        setor: form.elements.setor.value,
    };

    const url = isEditing ? `/api/clientes/${clientId}/` : '/api/clientes/';
    const method = isEditing ? 'PUT' : 'POST';

    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(data)
        });

        if (!res.ok) {
            const errorData = await res.json();
            throw new Error(JSON.stringify(errorData));
        }
        
        document.getElementById('cliente-modal-backdrop').classList.add('hidden');
        loadClientManagement(); 
        
    } catch (err) {
        alert(`Erro ao salvar cliente: ${err.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = 'Salvar';
    }
}

async function handleDeleteClient(id) {
    if (!confirm('Tem certeza que deseja apagar este cliente? Esta ação não pode ser desfeita.')) {
        return;
    }

    try {
        const res = await fetch(`/api/clientes/${id}/`, {
            method: 'DELETE',
            headers: { 'X-CSRFToken': getCsrfToken() }
        });

        if (!res.ok) {
            throw new Error('Falha ao apagar o cliente.');
        }

        const row = document.getElementById(`client-row-${id}`);
        if(row) row.remove();

    } catch (err) {
        alert(err.message);
    }
}