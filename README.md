# 🏛️ CâmaraGestão

Sistema moderno e simplificado para gestão de ativos de TI e chamados de suporte (Helpdesk), desenvolvido especificamente para atender às necessidades da Câmara Municipal.

![Status do Projeto](https://img.shields.io/badge/Status-Em_Desenvolvimento-blue)
![Tech Stack](https://img.shields.io/badge/Stack-Go_Ext_+_React-cyan)

## 🚀 Funcionalidades

### 🖥️ Gestão de Ativos (Inventário)
- Cadastro completo de equipamentos (Hostname, IP, Tipo, SO, etc).
- Histórico de movimentações e alterações.
- Vinculação de ativos a usuários e setores.
- Importação em massa via CSV.

### 🎫 Helpdesk (Chamados)
- Abertura de chamados por usuários ou técnicos.
- **Fluxo de Trabalho ITIL Simplificado:** Novo -> Em Atendimento -> Resolvido -> Fechado.
- **SLA Dinâmico:** Monitoramento automático de prazos por categoria de serviço.
- **Matriz de Escalonamento:** Redirecionamento automático para supervisores em caso de atraso.
- chat/timeline interno para registrar soluções e interagir com o usuário.
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
- **Configuração Global:** Gestão de SLA, Categorias e Responsáveis.
- **Backup Automático:** Rotina noturna de backup com retenção, protegendo o banco SQLite.
- **Performance:** Banco otimizado com modo WAL (Write-Ahead Logging) para alta concorrência.
- **Auditoria:** Logs detalhados de todas as ações críticas (`/audit`).
- **Backup Manual:** Endpoint para download/restore (em desenvolvimento).

## 🛠️ Tecnologias Utilizadas

### Backend
- **Linguagem:** Go (Golang) 1.21+
- **Framework Web:** Gin Gonic
- **Banco de Dados:** SQLite (com GORM) - Robusto, portátil e sem necessidade de servidor SQL dedicado.
- **Autenticação:** JWT (JSON Web Tokens).

### Frontend
- **Framework:** React 18 (Vite)
- **Estilização:** TailwindCSS (Design Moderno e Responsivo).
- **Ícones:** Lucide React.
- **Gráficos:** Recharts.

## 📦 Instalação e Execução Local

### Pré-requisitos
- [Go](https://go.dev/dl/) instalado.
- [Node.js](https://nodejs.org/) instalado.
- Git.

### Passos

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

## 🐳 Deploy (Docker / Proxmox)

Este projeto contém scripts para implantação rápida em containers Docker, ideal para ambientes de produção em Proxmox ou servidores Linux.

Veja o guia detalhado em: [INSTRUCOES_PROXMOX.md](INSTRUCOES_PROXMOX.md)

### Resumo do Deploy
```bash
# No servidor
git clone https://github.com/almeidasinop/camara-gestao.git
cd camara-gestao
chmod +x deploy.sh
./deploy.sh
```

## 🔒 Licença
Proprietário. Uso interno.
