async function loadDashboard() {
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = `
        <h1>Dashboard</h1>
        <p>Carregando estatísticas...</p>
    `;

    try {
        const response = await fetch('/api/dashboard/stats/');
        if (!response.ok) {
            throw new Error(`Erro ao buscar dados do dashboard: ${response.statusText}`);
        }
        const stats = await response.json();

        contentArea.innerHTML = `
            <h1>Dashboard</h1>
            <div class="dashboard-grid">
                <div class="dashboard-card card-yellow" onclick="loadAbertos()">
                    <div class="card-number">${stats.total_abertos}</div>
                    <div class="card-title">Chamados em Aberto</div>
                </div>
                <div class="dashboard-card card-green" onclick="loadChamadosFinalizados()">
                    <div class="card-number">${stats.total_finalizados}</div>
                    <div class="card-title">Chamados Finalizados</div>
                </div>
                <div class="dashboard-card card-gray" onclick="loadAbertos()">
                    <div class="card-number">${stats.abertos_sem_atribuicao}</div>
                    <div class="card-title">Abertos (Sem Atribuição)</div>
                </div>
                <div class="dashboard-card card-blue" onclick="loadChamadosFinalizados()">
                    <div class="card-number">${stats.finalizados_sem_atribuicao}</div>
                    <div class="card-title">Finalizados (Sem Atribuição)</div>
                </div>
                <div class="dashboard-card card-red">
                    <div class="card-number">${stats.atrasados}</div>
                    <div class="card-title">Chamados Atrasados</div>
                    <div class="card-wip">(WIP)</div>
                </div>
            </div>
        `;

    } catch (error) {
        console.error("Erro ao carregar o dashboard:", error);
        contentArea.innerHTML = `
            <h1>Dashboard</h1>
            <p style="color: var(--danger-color);">Não foi possível carregar as estatísticas. Tente novamente mais tarde.</p>
        `;
    }
}