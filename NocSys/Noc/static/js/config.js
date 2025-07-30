// config.js

async function showSettingsModal() {
    const backdrop = document.getElementById('settings-backdrop');
    if (!backdrop) return;
    
    const closeBtn = document.getElementById('settings-close-btn');
    const navLinks = document.querySelectorAll('.settings-nav-link');
    const contentContainer = backdrop.querySelector('.settings-container');

    // Mostra o modal e o backdrop
    backdrop.classList.remove('hidden');
    contentContainer.classList.remove('fade-in'); // Garante que a animação possa rodar de novo
    void contentContainer.offsetWidth; // Força o reflow para reiniciar a animação
    contentContainer.classList.add('fade-in');


    // Função para esconder o modal
    const hide = () => {
        backdrop.classList.add('hidden');
        // Limpa os event listeners para evitar duplicação
        closeBtn.removeEventListener('click', hide);
        backdrop.removeEventListener('click', backdropClickHandler);
    };
    
    const backdropClickHandler = (e) => {
        if (e.target === backdrop) {
            hide();
        }
    };
    
    closeBtn.addEventListener('click', hide, { once: true });
    backdrop.addEventListener('click', backdropClickHandler, { once: true });

    // Lógica de navegação interna do modal
    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();

            // Remove a classe 'active' de todos os links
            navLinks.forEach(l => l.classList.remove('active'));
            // Esconde todas as views
            document.querySelectorAll('.settings-view').forEach(v => v.classList.add('hidden'));

            // Adiciona a classe 'active' ao link clicado e mostra a view correspondente
            link.classList.add('active');
            const targetId = link.getAttribute('data-target');
            const targetView = document.getElementById(targetId);
            if(targetView) {
                targetView.classList.remove('hidden');
            }
        });
    });

    // Busca e preenche os dados do usuário na aba "Usuário"
    const userViewLink = document.querySelector('.settings-nav-link[data-target="settings-view-user"]');
    if (userViewLink && userViewLink.classList.contains('active')) {
        try {
            const response = await fetch('/api/user/stats/');
            if (!response.ok) {
                throw new Error('Não foi possível carregar os dados do usuário.');
            }
            const data = await response.json();

            // Formata data
            const dateJoined = new Date(data.date_joined);
            const formattedDate = dateJoined.toLocaleDateString('pt-BR', {
                day: '2-digit',
                month: 'long',
                year: 'numeric'
            });

            // Preenche os campos
            document.getElementById('settings-user-name').textContent = data.full_name || data.username;
            document.getElementById('settings-user-email').textContent = data.email || 'Não informado';
            document.getElementById('settings-user-username').textContent = data.username;
            document.getElementById('settings-user-joined').textContent = formattedDate;
            document.getElementById('settings-finalizados-count').textContent = data.finalizados_count;

        } catch (error) {
            console.error('Erro ao buscar estatísticas do usuário:', error);
            document.getElementById('settings-user-name').textContent = 'Erro ao carregar';
            document.getElementById('settings-user-email').textContent = 'Erro ao carregar';
        }
    }
}