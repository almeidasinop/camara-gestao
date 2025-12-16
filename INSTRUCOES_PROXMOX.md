# Guia de Deploy no Proxmox (LXC + Docker)

Este guia ajuda a configurar o sistema **CâmaraGestão** em um container LXC no Proxmox para máxima performance e facilidade de manutenção.

## 1. Criar o Container (LXC)
No seu Proxmox:
1. Clique em **Create CT**.
2. **Template**: Escolha `ubuntu-22.04` ou `debian-12`.
3. **Discos/CPU/RAM**: Configure conforme necessidade (ex: 2 Cores, 2GB RAM, 8GB Disco já é suficiente).
4. **Network**: Defina um IP estático (ex: 192.168.1.50).
5. **Options (Importante!)**: Após criar, vá na aba **Options** > **Features** e marque:
   - [x] **Nesting** (Permite Docker rodar dentro do container).
   - [x] **keyctl**.

## 2. Instalar Docker e Git
Inicie o container, acesse o **Console** e rode:

```bash
# Atualizar sistema
apt update && apt upgrade -y

# Instalar dependências básicas
apt install -y git curl

# Instalar Docker (script oficial)
curl -fsSL https://get.docker.com | sh
```

## 3. Instalar a Aplicação
```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/camara_gestao.git
cd camara_gestao

# Dê permissão ao script de deploy
chmod +x deploy.sh

# Inicie o sistema
./deploy.sh
```

## 4. Acessando o Sistema
Abra no navegador: `http://192.168.1.50` (ou o IP que você definiu).
O sistema roda na porta 80 por padrão via Docker.

## 5. Manutenção e Atualizações
Quando você fizer alterações no código (no seu PC) e subir para o GitHub (`git push`), para atualizar o servidor Proxmox:

1. Acesse o servidor (SSH ou Console).
2. Entre na pasta: `cd camara_gestao`
3. Rode o script:
   ```bash
   ./deploy.sh
   ```

Isso vai baixar as mudanças, reconstruir o container e reiniciar tudo em segundos, sem perder os dados do banco de dados (que ficam na pasta `data`).

## 6. Backup
Para fazer backup, basta copiar a pasta `camara_gestao/data` que contém o arquivo `glpi_clone.db`.
No Proxmox, você também pode usar o recurso de Backup nativo do LXC para salvar o container inteiro.
