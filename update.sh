#!/bin/bash
# Script de Atualização Segura (Update & Restart)
# Este script deve ser executado no servidor de produção (Linux/Proxmox)

set -e # Abortar se houver erro

echo "========================================="
echo "🔄 Iniciando atualização do CâmaraGestão..."
echo "========================================="

# 1. Puxar código mais recente do Git
echo "📥 1. Baixando alterações do repositório (git pull)..."
git pull origin master

# 2. Reconstruir e recriar container
# O flag --build força a recriação da imagem com o novo código
# O docker-compose down/up garante estado limpo, mas volumes persistentes em ./data
echo "🐳 2. Reconstruindo containers (sem perda de dados)..."
docker compose down
docker compose up -d --build --remove-orphans

# 3. Limpar imagens antigas para economizar espaço (Opcional, mas recomendado)
echo "🧹 3. Limpando imagens antigas..."
docker image prune -f

echo "========================================="
echo "✅ Atualização Concluída com Sucesso!"
echo "🚀 Servidor rodando na última versão."
echo "========================================="
docker compose ps
