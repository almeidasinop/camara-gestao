Roadmap de Desenvolvimento: Sistema ITSM/ITAM em Go

Este documento descreve as tarefas necessárias para evoluir o sistema de "Backend Simples" para um clone funcional do GLPI.

🚀 Fase 1: Fundação (MVP)

O objetivo desta fase é ter uma API funcional onde se possa criar, ler, atualizar e apagar (CRUD) os dados principais.

[x] Configuração do Ambiente

[x] Inicializar módulo Go (go mod init).

[x] Configurar Gin (Web Framework) e GORM (ORM).

[x] Configurar SQLite para persistência de dados local.

[x] Módulo de Ativos (Assets/Inventory)

[x] Criar Modelo Asset (ID, Hostname, IP, Tipo, Status).

[x] Adicionar validação de campos (ex: IP válido, Hostname único).

[x] Criar Endpoint PUT /assets/:id para atualizar equipamentos.

[x] Criar Endpoint DELETE /assets/:id (Soft Delete - não apagar do banco, apenas marcar como inativo).

[x] Módulo de Service Desk (Tickets)

[x] Criar Modelo Ticket com relacionamento Foreign Key para Asset.

[x] Implementar lógica de alteração de status (Novo -> Em Progresso -> Fechado).

[x] Adicionar campo de "Comentários" ou "Follow-ups" no ticket.

🛠 Fase 2: Regras de Negócio e Conexões

Adicionar inteligência ao sistema para que não seja apenas um banco de dados glorificado.

[ ] Gestão de Inventário Avançada

[x] Implementar histórico de alterações (Log de quem mudou o quê no equipamento).

[ ] Adicionar gestão de "Componentes" (ex: adicionar RAM ou HD a um Computador).

[ ] Criar rotina de "Scan Simulado": Um endpoint que recebe um JSON de um agente e atualiza o ativo automaticamente.

[ ] SLA e Automação de Tickets

[x] Calcular automaticamente a data de vencimento (Due Date) baseada na prioridade.

[ ] Impedir o fecho de um ticket se não houver uma "Solução" descrita.

💻 Fase 3: Frontend e Consumo

Criar a interface visual para o utilizador final e técnicos.

[x] Desenvolvimento Frontend (React ou Vue)

[x] Criar Dashboard com contadores (Tickets Abertos, Ativos por Tipo).

[x] Criar Tabela de Ativos com filtros e busca.

[ ] Visualizar Histórico de Alterações de Ativos (Frontend).

[x] Criar Formulário de Abertura de Chamados.

[x] Integração

[x] Configurar CORS no Backend Go para aceitar requisições do Frontend.

[x] Implementar autenticação JWT (Login de técnicos).

📊 Fase 4: DevOps e Performance

Preparar a aplicação para o mundo real.

[ ] Banco de Dados

[ ] Migrar de SQLite para PostgreSQL via configuração de ambiente.

[ ] Dockerização

[ ] Criar Dockerfile multi-stage (Build em Go -> Imagem Alpine leve).

[ ] Criar docker-compose.yml para subir App + Banco.

[ ] Testes

[ ] Escrever testes unitários para os Handlers (go test).