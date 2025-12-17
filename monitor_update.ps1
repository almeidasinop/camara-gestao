
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
    # Verifica se o arquivo existe (Polling a cada ciclo)
    if (Test-Path ".\data\update_request") {
        Write-Host "Arquivo de atualização detectado!" -ForegroundColor Yellow
        
        # Aguarda escrita finalizar
        Start-Sleep -Seconds 1
        
        try {
            Remove-Item ".\data\update_request" -Force -ErrorAction SilentlyContinue
             
            Write-Host "1. Baixando nova versão..." -ForegroundColor Cyan
            docker compose -f docker-compose.prod.yml pull
             
            Write-Host "2. Reiniciando conteineres..." -ForegroundColor Cyan
            docker compose -f docker-compose.prod.yml up -d
             
            Write-Host "✅ Sistema atualizado com sucesso!" -ForegroundColor Green
        }
        catch {
            Write-Host "Erro na atualização: $_" -ForegroundColor Red
        }
    }

    # Aguarda evento ou timeout (simulando sleep do polling)
    $result = $watcher.WaitForChanged([System.IO.WatcherChangeTypes]::Created, 2000)
}
