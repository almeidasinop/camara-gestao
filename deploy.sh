#!/bin/bash
# Script de Atualização Automática
set -e

echo "🔄 Baixando atualizações do Git..."
git pull

echo "🐳 Reconstruindo e reiniciando a aplicação..."
docker compose up -d --build

echo "✅ App atualizado e rodando!"
docker compose ps
