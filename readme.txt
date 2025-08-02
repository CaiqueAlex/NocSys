Bibliotecas utilizadas

asgiref==3.9.1
Django==5.2.4
djangorestframework==3.16.0
psycopg2==2.9.10
sqlparse==0.5.3
tzdata==2025.2

Externas

Node.js
Python
PostgreSQL

Instalar e rodar wppconnect 

1. Clone o projeto oficial do WPPConnect Server

git clone https://github.com/wppconnect-team/wppconnect-server.git

2. Entre na pasta

cd wppconnect-server

3. Instale as dependências

npm install
npm install --save-dev @type/mocha
npm install --save-dev @type/
npx wppconnect
npm install @wppconnect-team/wppconnect

4. Inicie o Bot.js

node bot.js

Para rodar o django

1. ative o ambiente venv

.\venv\Scripts\Activate.ps1 (windows)
.\venv\bin\Activate.ps1 (linux)

2. rode as migrações

python manage.py makemigrations
python manage.py migrate

3. rode o servidor para acesso na rede

python manage.py runserver 0.0.0.0:80

Funcionalidades do Bot <---

Ao cadastrar um numero no site, após 5 minutos ele será adicionado no banco de dados e na API, fazendo assim a proxima mensagem dele mostrar a mensagem automatica de chamado.

Caso precise esclarecer duvida com um usuario cadastrado sem gravar chamados nem nada, use /// para pausar o bot e logo após /// para despausar, use com cautela !!!

se quiser gravar de forma manual, use o /s, e para finalizar o chamado Digite "Chamado Encerrado!", dessa exata maneira ou aguarde 15 minutos para o fechamento automatico do chamado.

Caso o usuario escolha a opção 2 "Outros" para esclarecer duvida, pausara o bot, use /. para despausa-lo.