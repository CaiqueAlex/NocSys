// dashboard.js

async function loadDashboard() {
    const contentArea = document.getElementById('content-area');
    contentArea.classList.remove('content-fade-in');
    contentArea.classList.add('content-fade-out');

    // Aguarda a transição de fade-out
    await new Promise(resolve => setTimeout(resolve, 500));
    contentArea.innerHTML = `
        <h1>Dashboard</h1>
        <p>Carregando estatísticas...</p>
    `;
    contentArea.classList.remove('content-fade-out');
    contentArea.classList.add('content-fade-in');

    try {
        const response = await fetch('/api/dashboard/stats/');
        if (!response.ok) throw new Error(`Erro: ${response.statusText}`);
        const stats = await response.json();

        contentArea.innerHTML = `
            <div class="dashboard-content">
                <h1>Dashboard</h1>
                <div class="dashboard-grid">
                    <div class="dashboard-card card-abertos" onclick="loadAbertos()">
                        <div class="card-number">${stats.total_abertos}</div>
                        <div class="card-title">Chamados em Aberto</div>
                    </div>
                    <div class="dashboard-card card-finalizados" onclick="loadChamadosFinalizados()">
                        <div class="card-number">${stats.total_finalizados}</div>
                        <div class="card-title">Chamados Finalizados</div>
                    </div>
                    <div class="dashboard-card card-sem-atribuicao" onclick="loadAbertos('unassigned')">
                        <div class="card-number">${stats.abertos_sem_atribuicao || 0}</div>
                        <div class="card-title">Abertos (Sem Atribuição)</div>
                    </div>
                    <div class="dashboard-card card-atrasados" onclick="loadAbertos('status_atrasado')">
                        <div class="card-number">${stats.atrasados}</div>
                        <div class="card-title">Chamados Atrasados</div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error("Erro ao carregar o dashboard:", error);
        contentArea.innerHTML = `<h1>Dashboard</h1><p style="color: var(--danger-color);">Não foi possível carregar as estatísticas.</p>`;
    }
}