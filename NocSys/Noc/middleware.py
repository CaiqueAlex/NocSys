from django.shortcuts import redirect
from django.urls import reverse, NoReverseMatch

class AdminGateMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        admin_path_prefix = '/webadmin/'
        login_gate_path = reverse('admin_login_gate')

        # Se a requisição for para a área do admin
        if request.path.startswith(admin_path_prefix):
            # Ignora a própria página de login do portão para evitar loops de redirecionamento
            if request.path == login_gate_path:
                return self.get_response(request)

            try:
                # Permite acesso à página de logout do admin para que a sessão seja limpa
                admin_logout_path = reverse('admin:logout')
                if request.path.startswith(admin_logout_path):
                    # Limpa nossa sessão customizada quando o usuário desloga do admin
                    if 'admin_gate_passed' in request.session:
                        del request.session['admin_gate_passed']
                    return self.get_response(request)
            except NoReverseMatch:
                # O namespace 'admin' pode não estar disponível se o usuário não estiver logado
                pass

            # Se o usuário não passou pelo portão, redireciona para a página de login
            if not request.session.get('admin_gate_passed'):
                # Adiciona o caminho que ele tentou acessar como parâmetro 'next'
                # para redirecioná-lo de volta após o login
                redirect_url = f"{login_gate_path}?next={request.path}"
                return redirect(redirect_url)

        return self.get_response(request)