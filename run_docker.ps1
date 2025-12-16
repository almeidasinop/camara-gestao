# Script para rodar a aplicação via Docker no Windows (Estratégia Cross-Compile)

Write-Host "🔨 Compilando Backend para Linux..." -ForegroundColor Cyan
$env:CGO_ENABLED = "0"
$env:GOOS = "linux"
$env:GOARCH = "amd64"
go build -o server_linux main.go

if ($LASTEXITCODE -ne 0) {
    Write-Error "Falha na compilação do Go!"
    exit 1
}

Write-Host "🐳 Parando containers antigos..." -ForegroundColor Cyan
docker compose down

Write-Host "🏗️  Construindo imagem Docker (Frontend + Binário Backend)..." -ForegroundColor Cyan
# Usar -f para especificar o Dockerfile alternativo (precisa ajustar o docker-compose ou passar build context manualmente)
# O jeito mais fácil sem alterar docker-compose.yml é forçar o build aqui
docker build -f Dockerfile.local -t camara-gestao-app .

# Agora subir usando a imagem taggeada, ignorando o build do compose
# Para isso precisamos de um docker-compose override ou apenas rodar o container na mão se for simples.
# Mas vamos tentar sobrescrever a imagem no compose via variavel ou apenas editar o docker-compose temporariamente é ruim.

# Melhor estratégia: Vamos iniciar o container com 'docker run' direto se o compose for chato,
# OU criar um docker-compose.override.yml
Write-Host "🚀 Iniciando Container..." -ForegroundColor Green

# Rodar direto na porta 8080 (compatível com frontend)
docker rm -f camara-app-local 2>$null
docker run -d --name camara-app-local -p 8080:8080 -v ${PWD}/data:/app/data camara-gestao-app

Write-Host "✅ Aplicação iniciada em http://localhost:8080" -ForegroundColor Yellow
docker ps
