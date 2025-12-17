# Arquitetura Técnica - CâmaraGestão

Este documento descreve a arquitetura de software, tecnologias e paradigmas de programação utilizados no desenvolvimento do sistema **CâmaraGestão**.

## 1. Visão Geral da Arquitetura
O sistema utiliza uma arquitetura **Client-Server moderna**, separando completamente o Frontend do Backend, comunicando-se via **API RESTful** (JSON).

- **Tipo:** Single Page Application (SPA).
- **Protocolo:** HTTP/1.1 (REST).
- **Formato de Dados:** JSON.
- **Autenticação:** JWT (Stateless) + LDAP (Opcional).

---

## 2. Backend (Servidor)
**Linguagem:** Go (Golang) v1.23+
**Framework:** Gin Gonic

### Paradigma: Orientação a Objetos (Adaptada) & Estrutural
O backend segue uma abordagem híbrida, utilizando a eficiência da programação estrutural do Go com conceitos sólidos de Orientação a Objetos para modelagem de dados.

*   **Modelagem de Objetos (Structs):**
    *   O sistema não utiliza "Classes" tradicionais, mas sim **Structs**, que definem a forma dos objetos (`User`, `Ticket`, `Asset`).
    *   Exemplo: A struct `Ticket` encapsula todas as propriedades de um chamado.

*   **Encapsulamento e Métodos:**
    *   Métodos são associados às Structs para manipular seu estado ou validar dados (ex: `func (u *User) BeforeSave()`).
    *   Isso garante que a lógica de negócio esteja próxima aos dados, um princípio chave da OO.

*   **ORM (Object-Relational Mapping):**
    *   Utilizamos a biblioteca **GORM**.
    *   Ela permite manipular o banco de dados tratando registros como **Objetos Go**, abstraindo o SQL puro.

### Estrutura do Código
*   **Models:** Definição das entidades (Banco de Dados).
*   **Handlers (Controllers):** Lógica de entrada/saída das rotas API.
*   **Middlewares:** Interceptadores para Autenticação, Logs e CORS.

---

## 3. Frontend (Interface)
**Framework:** React v18 (Vite)
**Linguagem:** JavaScript (ES6+)

### Paradigma: Programação Funcional & Reativa
Ao contrário do Backend, o Frontend afasta-se da Orientação a Objetos clássica em favor do paradigma Funcional, padrão da indústria moderna para React.

*   **Componentes Funcionais:**
    *   Toda a interface é construída através de **Funções Puras** e não Classes.
    *   Isso torna o código mais previsível, testável e leve.

*   **Hooks (Estado e Ciclo de Vida):**
    *   O gerenciamento de estado não é feito por `this.state` (OO), mas por Hooks como `useState` e `useEffect`.
    *   Exemplo: `const [tickets, setTickets] = useState([])` encapsula o estado local de forma funcional.

*   **Composição de Interface:**
    *   A UI é construída compondo pequenos componentes reutilizáveis (`SidebarItem`, `StatCard`) para formar páginas complexas (`TvDashboard`).

### Estilização
*   **TailwindCSS:** Abordagem *Utility-First*, permitindo estilização rápida diretamente no markup (JSX) sem arquivos CSS gigantescos e de difícil manutenção.

---

## 4. Banco de Dados
**SGBD:** SQLite (Modo WAL - Write-Ahead Logging)

*   **Persistência Relacional:** Dados fortemente tipados e relacionados com Chaves Estrangeiras (Foreign Keys).
*   **Portabilidade:** O banco é um arquivo único (`glpi_clone.db`), facilitando backups (basta copiar o arquivo) e migrações.

---

## 5. Infraestrutura e Deploy
**Containerização:** Docker

*   **Multi-Stage Build:** O `Dockerfile` compila tanto o Frontend (Node.js) quanto o Backend (Go) em estágios separados, gerando uma imagem final **Alpine Linux** extremamente leve (<30MB) e segura.
*   **Orquestração:** `docker-compose` gerencia o ciclo de vida da aplicação, volumes e reinicialização automática.
