let statusChartInstance = null;

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
                settingsBox.classList.add('chart-view-active');
                loadCharts();
            } else {
                settingsBox.classList.remove('chart-view-active');
                if (targetId === 'settings-view-user') loadUserStats();
                else if (targetId === 'settings-view-clientes') loadClientManagement();
            }
            if(targetView) targetView.classList.remove('hidden');
        };
    });

    // Carga inicial da primeira aba
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
    const legendContainer = document.getElementById('status-chart-legend');
    legendContainer.innerHTML = 'Carregando...';
    try {
        const res = await fetch('/api/graficos/status_chamados/');
        if (!res.ok) throw new Error('Falha ao carregar dados.');
        const chartData = await res.json();
        renderStatusChart(chartData);
    } catch (error) {
        legendContainer.innerHTML = `<p style="color:red;">${error.message}</p>`;
    }
}

function renderStatusChart(data) {
    const canvas = document.getElementById('status-pie-chart');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (statusChartInstance) statusChartInstance.destroy();

    statusChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: data.labels,
            datasets: [{
                data: data.counts,
                backgroundColor: ['#22c55e', '#facc15', '#ef4444'],
                borderColor: 'var(--bg-tertiary)',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false } }
        }
    });

    const legendContainer = document.getElementById('status-chart-legend');
    legendContainer.innerHTML = '';
    data.labels.forEach((label, index) => {
        legendContainer.innerHTML += `
            <div class="legend-item">
                <span class="legend-color-box" style="background-color: ${statusChartInstance.data.datasets[0].backgroundColor[index]};"></span>
                <span class="legend-label">${label}: <strong>${data.counts[index]}</strong></span>
            </div>`;
    });
}

// --- Funções CRUD para Clientes ---
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
        loadClientManagement(); // Recarrega a lista
        
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