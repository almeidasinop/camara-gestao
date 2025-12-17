# 🏛️ CâmaraGestão

Sistema moderno e simplificado para gestão de ativos de TI e chamados de suporte (Helpdesk), desenvolvido especificamente para atender às necessidades da Câmara Municipal.

![Status do Projeto](https://img.shields.io/badge/Status-Produção-green)
![Tech Stack](https://img.shields.io/badge/Stack-Go_+_React-cyan)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

## 🚀 Funcionalidades

### 🖥️ Gestão de Ativos (Inventário)
- Cadastro completo de equipamentos (Hostname, IP, Tipo, SO, etc).
- Histórico de movimentações e alterações.
- Vinculação de ativos a usuários e setores.
- Importação em massa via CSV.
- **Geração de Etiquetas com QR Code** para identificação rápida.

### 🎫 Helpdesk (Chamados)
- Abertura de chamados por usuários ou técnicos.
- **Fluxo de Trabalho ITIL Simplificado:** Novo → Em Atendimento → Resolvido → Fechado.
- **SLA Dinâmico:** Monitoramento automático de prazos por categoria de serviço.
- **Matriz de Escalonamento:** Redirecionamento automático para supervisores em caso de atraso.
- Chat/timeline interno para registrar soluções e interagir com o usuário.
- Filtros avançados e separação de visibilidade (Técnicos só veem o que é relevante).

### 📊 Relatórios Inteligentes
- **Dashboard Executivo:** Métricas em tempo real (MTTR, Aderência ao SLA, Volume).
- **Modo TV (Kiosk):** Dashboard `/tv` escuro de alto contraste para exibição em monitores de departamento, com auto-refresh.
- **Tendências:** Gráficos de volume semanal e "Top Ofensores" por setor/categoria.
- **Feedback:** Monitoramento de satisfação (CSAT).

### 🏷️ Etiquetas Inteligentes
- Geração automática de Etiquetas Patrimoniais via sistema.
- QR Code integrado que redireciona para detalhes do ativo ou abertura rápida de chamado.
- Layout otimizado para impressoras térmicas.

### ⚙️ Administração & Segurança
- **Controle de Acesso:** RBAC (Role-Based Access Control) para Admin, Tech e User.
- **Autenticação JWT:** Login seguro com tokens de sessão.
- **Logout Funcional:** Botão de sair com limpeza completa de sessão.
- **Edição de Perfil:** Usuários podem editar nome, avatar e senha.
- **Configuração Global:** Gestão de SLA, Categorias e Responsáveis.
- **Backup Automático:** Rotina diária de backup com retenção de 7 dias, protegendo o banco SQLite.
- **Performance:** Banco otimizado com modo WAL (Write-Ahead Logging) para alta concorrência.
- **Auditoria:** Logs detalhados de todas as ações críticas (`/audit`).
- **Atualização via Web:** Botão no painel admin para atualizar o sistema remotamente.

### 🔧 Endpoints de Diagnóstico
- **`/api/v1/debug/users`**: Lista todos os usuários (para troubleshooting).
- **`/api/v1/setup/init`**: Cria usuário admin inicial se o banco estiver vazio.

## 🛠️ Tecnologias Utilizadas

### Backend
- **Linguagem:** Go (Golang) 1.23+
- **Framework Web:** Gin Gonic
- **Banco de Dados:** SQLite com `glebarez/sqlite` (Pure Go, sem CGO) - Robusto, portátil e sem necessidade de servidor SQL dedicado.
- **Autenticação:** JWT (JSON Web Tokens).
- **ORM:** GORM.

### Frontend
- **Framework:** React 18 (Vite)
- **Estilização:** TailwindCSS (Design Moderno e Responsivo).
- **Ícones:** Lucide React.
- **Gráficos:** Recharts.

## 📦 Instalação e Execução

### 🐳 Opção 1: Docker (Recomendado)

#### Pré-requisitos
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) instalado.
- Git.

#### Passos

1. **Clone o repositório**
   ```bash
   git clone https://github.com/almeidasinop/camara-gestao.git
   cd camara-gestao
   ```

2. **Execute o script de inicialização**
   ```powershell
   # Windows (PowerShell)
   .\run_docker.ps1
   ```
   
   Ou manualmente:
   ```bash
   # Linux/Mac
   docker compose up -d --build
   ```

3. **Acesse o sistema**
   - Abra `http://localhost:8080` no navegador
   - **Login padrão:** `admin` / `123456`

#### Atualização do Sistema
```powershell
# Windows
.\update.sh

# Ou via painel admin (botão "Atualizar Agora" em Configurações)
```

### 💻 Opção 2: Desenvolvimento Local

#### Pré-requisitos
- [Go 1.23+](https://go.dev/dl/) instalado.
- [Node.js 18+](https://nodejs.org/) instalado.
- Git.

#### Passos

1. **Clone o repositório**
   ```bash
   git clone https://github.com/almeidasinop/camara-gestao.git
   cd camara-gestao
   ```

2. **Backend (API)**
   ```bash
   # Instale as dependências
   go mod download

   # Inicie o servidor (padrão porta 8080)
   go run main.go
   ```

3. **Frontend (Interface)**
   Em outro terminal:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   Acesse `http://localhost:5173` no navegador.

### 🚀 Opção 3: Deploy Super Rápido (Imagem Pronta)

Ideal para produção, sem necessidade de compilar código.

1. **Baixe apenas o arquivo de composição:**
   ```bash
   curl -O https://raw.githubusercontent.com/almeidasinop/camara-gestao/master/docker-compose.prod.yml
   mv docker-compose.prod.yml docker-compose.yml
   ```

2. **Suba o serviço:**
   ```bash
   docker compose up -d
   ```

## 🔐 Credenciais Padrão

Após a primeira instalação, o sistema cria automaticamente:

| Usuário | Senha | Role |
|---------|-------|------|
| admin | 123456 | Admin |
| mauro | 123456 | Tech |
| andre | 123456 | Tech |
| carlos | 123456 | Tech |

**⚠️ IMPORTANTE:** Altere as senhas padrão após o primeiro acesso!

## 🚀 Deploy em Produção (Proxmox/Linux)

Este projeto contém scripts para implantação rápida em containers Docker, ideal para ambientes de produção em Proxmox ou servidores Linux.

Veja o guia detalhado em: [INSTRUCOES_PROXMOX.md](INSTRUCOES_PROXMOX.md)

### Resumo do Deploy
```bash
# No servidor
git clone https://github.com/almeidasinop/camara-gestao.git
cd camara-gestao
chmod +x deploy.sh update.sh monitor_update.sh
./deploy.sh

# Para atualizações futuras
./update.sh

# Ou configure o monitor automático
nohup ./monitor_update.sh &
```

## 📁 Estrutura de Dados

Os dados são persistidos em:
- **Desenvolvimento:** `./glpi_clone.db` (raiz do projeto)
- **Docker:** `./data/glpi_clone.db` (volume persistente)
- **Backups:** `./data/backups/` (retenção de 7 dias)

## 🔧 Variáveis de Ambiente

| Variável | Padrão | Descrição |
|----------|--------|-----------|
| `PORT` | 8080 | Porta do servidor backend |
| `DB_PATH` | glpi_clone.db | Caminho do banco SQLite |
| `BACKUP_DIR` | backups | Diretório de backups |

## 🆘 Troubleshooting

### Problema: Login não funciona
**Solução:** Limpe o localStorage do navegador:
```javascript
// Console do navegador (F12)
localStorage.clear();
location.reload();
```

### Problema: Configurações vazias
**Solução:** Faça logout e login novamente para recarregar os dados do usuário.

### Problema: Banco vazio após instalação
**Solução:** Use o endpoint de setup:
```bash
curl -X POST http://localhost:8080/api/v1/setup/init
```

## 📝 Changelog

### v1.2.7 (2025-12-17)
- 🔒 **Fix Crítico de Segurança:** Proteção contra falhas de autenticação no Middleware de permissões que causavam erro 500 para técnicos.

### v1.2.6 (2025-12-17)
- 🐛 **Correção de Erro 500:** Resolvido problema crítico que impedia Técnicos e Supervisores de visualizar e criar chamados devido a erro interno de conversão de ID.

### v1.2.5 (2025-12-17)
- 🐛 **Correção de Crash:** Resolvido erro que deixava a tela de configurações em branco.

### v1.2.4 (2025-12-17)
- 🎨 **Novo Design Dashboard TV:** Interface completamente redesenhada com estilo NOC Profissional, fontes otimizadas, animações de fundo e melhor uso do espaço.

### v1.2.3 (2025-12-17)
- 🐛 **Correção Crítica:** Ajuste na URL da API para suportar conexões em qualquer porta (resolve erro 80/8080).

### v1.2.2 (2025-12-17)
- 🐛 **Correção de Ícone:** Resolvido problema de carregamento do Favicon no Docker.
- 📚 **Documentação Técnica:** Adicionado documento de arquitetura do sistema (`ARQUITETURA_TECNICA.md`).

### v1.2.1 (2025-12-17)
- 👥 **Novo Perfil Supervisor:** Usuário com permissões expandidas para visualizar Dashboards, Relatórios e configurar Avisos, mas sem acesso administrativo total.
- 📢 **Avisos do Sistema Dinâmicos:** Administradores e Supervisores podem configurar mensagens de texto que aparecem em destaque na TV Corporativa e Dashboard.

### v1.2.0 (2025-12-17)
- 🔒 **Integração Active Directory (LDAP):** Autenticação corporativa com suporte a configuração via painel administrativo.
- ✨ **Painel de Configurações:** Nova seção para configurar Host, Porta e Domínio do AD/LDAP sem reiniciar o servidor.

### v1.1.2 (2025-12-17)
- ✨ **Automação de Versão:** A versão exibida no rodapé (v1.x.x) agora é lida automaticamente do `package.json`.

### v1.1.1 (2025-12-16)
- 🐛 **Hotfix Crítico:** Corrigido bloqueio de CORS que impedia login em IPs diferentes de localhost. Agora a API aceita requisições de qualquer origem na rede, mantendo suporte a credenciais.

### v1.1.0 (2025-12-16)
- ✅ Adicionado botão de Logout funcional
- ✅ Corrigido salvamento de dados do usuário no localStorage
- ✅ Corrigido carregamento de configurações para Admin
- ✅ Adicionado endpoint `/api/v1/debug/users` para diagnóstico
- ✅ Adicionado endpoint `/api/v1/setup/init` para setup inicial
- ✅ Corrigida edição de perfil do usuário
- ✅ Melhorado suporte a Docker com build otimizado
- ✅ Adicionados scripts `run_docker.ps1` e `update.sh`
- ✅ Implementado sistema de atualização via painel web

### v1.0.0 (2025-12-15)
- 🎉 Lançamento inicial com todas as funcionalidades core

## 🔒 Licença
Proprietário. Uso interno da Câmara Municipal.

## 👥 Suporte
Para dúvidas ou problemas, entre em contato com a equipe de TI.
