# 📘 Manual de Implementação: CâmaraGestão no Proxmox (Docker)

Este documento descreve detalhadamente o processo de instalação e configuração do sistema **CâmaraGestão** utilizando a tecnologia Docker dentro de um container LXC no Proxmox.

---

## ✅ Pré-requisitos
- Servidor Proxmox VE ativo.
- Acesso à Internet no servidor.
- Domínio básico de terminal (Linux).

---

## 🚀 Passo 1: Criar o Container (LXC) no Proxmox

Para garantir o melhor desempenho com o menor consumo de recursos, utilizaremos um container LXC.

1. Acesse seu **Proxmox Web Interface**.
2. Clique no botão **Create CT** (Canto superior direito).
3. **General**:
   - Hostname: `camara-gestao`
   - Password: Defina uma senha forte para o root.
   - Uncheck "Unprivileged container" (Opcional, mas facilita permissões de disco se for usar montar storages externos. Para este guia, pode deixar marcado "Unprivileged" se ativar as Features abaixo).
4. **Template**:
   - Escolha o template `debian-12-standard` ou `ubuntu-22.04-standard`.
5. **Disks**:
   - Storage: `local-lvm` (ou onde preferir).
   - Disk Size: **10GB** (Suficiente para o sistema e banco de dados por muito tempo).
6. **CPU**:
   - Cores: **2**.
7. **Memory**:
   - Memory: **2048 MB** (2GB).
   - Swap: **512 MB**.
8. **Network**:
   - Bridge: `vmbr0`.
   - IPv4: **Static** (Ex: `192.168.1.50/24`).
   - Gateway: IP do seu roteador (Ex: `192.168.1.1`).
9. **Finalizar**: Confirme e crie. **NÃO DÊ START AINDA.**

### ⚠️ Configuração Crítica (Docker no LXC)
Para o Docker funcionar dentro do LXC, você precisa ativar permissões específicas:

1. Clique no container criado na lista à esquerda.
2. Vá em **Options** > **Features**.
3. Clique em **Edit** e marque as caixas:
   - [x] **Nesting**
   - [x] **keyctl**
4. Clique em **OK**.
5. Agora sim, clique em **Start** e abra o **Console**.

---

## 🛠️ Passo 2: Preparar o Ambiente

No console do container, execute os comandos abaixo sequencialmente para atualizar o sistema e instalar o Docker.

```bash
# 1. Atualizar repositórios e pacotes
apt update && apt upgrade -y

# 2. Instalar Git e Curl
apt install -y git curl

# 3. Instalar Docker (Script Oficial Automatizado)
curl -fsSL https://get.docker.com | sh
```

Verifique se instalou corretamente:
```bash
docker --version
docker compose version
```

---

## 📦 Passo 3: Deploy da Aplicação

Faremos o download do código fonte e iniciaremos o serviço.

```bash
# 1. Entrar na pasta home (ou onde preferir instalar)
cd /root

# 2. Clonar o repositório
git clone https://github.com/almeidasinop/camara-gestao.git

# 3. Entrar na pasta do projeto
cd camara-gestao

# 4. Iniciar o serviço com Docker Compose (Constrói e roda em segundo plano)
docker compose up -d --build
```

> **Nota:** Esse processo pode levar alguns minutos na primeira vez, pois ele baixará as imagens base e compilará o Front e Backend.

### Verificando se está rodando
Execute:
```bash
docker ps
```
Você deve ver um container chamado `camara_gestao` com status **Up** e portas `0.0.0.0:80->8080/tcp`.

---

## 🌐 Passo 4: Acessando o Sistema

Abra seu navegador e digite o IP que você configurou no Passo 1.
Exemplo: **http://192.168.1.50**

Se tudo deu certo, você verá a tela de Login do CâmaraGestão.

---

## 🔑 Credenciais Padrão (Pré-Cadastradas)

O sistema já vem com usuários iniciais para facilitar o teste e implantação.
**A senha padrão para TODOS é:** `123456`

### 🛡️ Administrador (Acesso Total)
- **Usuário:** `admin`
- **Senha:** `123456`

### 🔧 Técnicos (Acesso a Chamados e Dashboard Técnico)
- **Usuário:** `mauro` (Mauro - Redes)
- **Usuário:** `andre` (André - Hardware)
- **Usuário:** `carlos` (Carlos - Softwares)
- **Senha:** `123456`

### 👁️ Supervisor (Visualização de Relatórios)
- **Usuário:** `supervisor`
- **Senha:** `123456`

> **IMPORTANTE:** Assim que logar, vá em Configurações > Usuários e altere as senhas!

---

## 💾 Persistência de Dados (Backups e Segurança)

O sistema foi configurado para salvar todos os dados importantes fora do container, na pasta local do servidor.

- **Local dos Dados:** `/root/camara-gestao/data`
- **Arquivo de Banco:** `glpi_clone.db`

### Como fazer Backup Manual
Basta copiar o arquivo `glpi_clone.db` para outro local (Google Drive, outro servidor, etc).
Exemplo via SCP (do seu PC para o servidor):
`scp root@192.168.1.50:/root/camara-gestao/data/glpi_clone.db ./backup_local.db`

---

## 🔄 Manutenção e Atualização

Quando houver uma nova versão do software lançada no GitHub, siga estes passos para atualizar seu servidor Proxmox:

```bash
# 1. Acesse a pasta do projeto
cd /root/camara-gestao

# 2. Baixe as atualizações
git pull

# 3. Recrie o container (Isso não apaga o banco de dados!)
docker compose up -d --build
```

O sistema será atualizado e reiniciado automaticamente na nova versão, mantendo todos os seus chamados e usuários.

---

## ❓ Solução de Problemas Comuns

**1. Erro "failed to create task for container: failed to create shim task: OCI runtime create failed"**
- **Causa:** Você esqueceu de ativar o **Nesting** nas opções do LXC.
- **Solução:** Desligue o container, vá em Options > Features, marque Nesting e Keyctl, ligue novamente.

**2. O site não abre**
- Verifique se o firewall do Proxmox não está bloqueando a porta 80.
- Rode `docker logs camara_gestao` para ver se houve erro na incialização da aplicação.
