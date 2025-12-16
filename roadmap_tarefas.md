# Roadmap de Melhorias - Versão 2.0

Este documento lista as melhorias planejadas para elevar o nível do sistema CâmaraGestão, focando em segurança, performance e facilidade de uso em ambiente corporativo.

## 🚀 Prioridade Alta (Imediato)

- [x] **1. Otimização de Banco de Dados (SQLite WAL)**
  - **Objetivo:** Evitar travamentos (database locked) em acessos simultâneos.
  - **Ação:** Ativar o modo *Write-Ahead Logging* na string de conexão do GORM.

- [x] **2. Rotina de Backup Automática**
  - **Objetivo:** Segurança dos dados sem depender de ação humana.
  - **Ação:** Criar uma *goroutine* no Backend que copia o arquivo `glpi_clone.db` para a pasta `backups/` diariamente (ex: 03:00 AM) e rotaciona arquivos antigos (manter últimos 7 dias).

## ✨ Funcionalidades (Versão 2.1)

- [x] **3. Etiquetas de Patrimônio com QR Code**
  - **Objetivo:** Acelerar o acesso à informação do ativo e abertura de chamados.
  - **Ação:**
    - Criar endpoint no Frontend que gera uma etiqueta imprimível para um ativo selecionado.
    - O QR Code deve levar para a URL: `/assets/{id}/view` ou `/tickets/new?asset_id={id}`.

- [ ] **4. Autenticação AD/LDAP (Active Directory)**
  - **Objetivo:** SSO (Single Sign-On) com a rede da Câmara.
  - **Status:** *Parcialmente Iniciado (Backend stub)*.
  - **Ação Restante:**
    - [ ] **Configuração (Frontend/Settings):** Criar campos no menu Configurações para inserir: `LDAP Host`, `LDAP Port`, `Base DN`, `Bind User` e `Bind Password`.
    - [ ] **Backend (Implementação Real):** Substituir a função mock `authenticateLDAP` no `main.go`. Implementar conexão real usando `go-ldap/ldap/v3`:
        1. Conectar via TCP/TLS.
        2. Realizar Bind com conta de serviço (se necessário) ou anônimo.
        3. Buscar DN do usuário pelo `sAMAccountName` ou `uid`.
        4. Tentar Bind com as credenciais do usuário.
        5. Se sucesso: Sincronizar dados (Nome, Email) via JIT (já esboçado).

## 🔮 Futuro (Concluídos em v2.2)

- [x] **Auditoria Completa (Logs)**: Implementado sistema de logs (`/audit`) e página de visualização.
- [x] **Dashboard TV**: Modo "quiosque" (`/tv`) implementado com rotação automática e KPIs em tempo real.