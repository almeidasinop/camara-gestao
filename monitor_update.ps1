
Write-Host "Monitorando solicitações de atualização do CâmaraGestão..."
Write-Host "Mantenha esta janela aberta."

# Cria diretório data se não existir
if (-not (Test-Path ".\data")) {
    New-Item -ItemType Directory -Force -Path ".\data"
}

$watcher = New-Object System.IO.FileSystemWatcher
$watcher.Path = "$PWD\data"
$watcher.Filter = "update_request"
$watcher.EnableRaisingEvents = $true

while ($true) {
    $result = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::Created, 1000)
    if ($result.TimedOut) {
        continue
    }

    Write-Host "Detector de atualização acionado!" -ForegroundColor Yellow
    
    # Aguarda um pouco para garantir que o arquivo foi escrito/fechado
    Start-Sleep -Seconds 2

    try {
        if (Test-Path ".\data\update_request") {
            Remove-Item ".\data\update_request" -Force
            
            Write-Host "1. Baixando nova versão..." -ForegroundColor Cyan
            docker compose -f docker-compose.prod.yml pull
            
            Write-Host "2. Reiniciando conteineres..." -ForegroundColor Cyan
            docker compose -f docker-compose.prod.yml up -d
            
            Write-Host "✅ Sistema atualizado com sucesso!" -ForegroundColor Green
            Write-Host "👉 Acesse o sistema em: http://localhost" -ForegroundColor Cyan
        }
    }
    catch {
        Write-Host "Erro durante a atualização: $_" -ForegroundColor Red
    }
}
