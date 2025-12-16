#!/bin/bash
# Monitor de Atualização Automática
# Este script deve rodar em background no servidor (host) para detectar pedidos de atualização.
# Uso: ./monitor_update.sh &

WATCH_FILE="./data/update_request"
LOG_FILE="./data/update_monitor.log"

echo "👀 [Monitor] Iniciando monitoramento de $WATCH_FILE..." | tee -a $LOG_FILE

while true; do
  if [ -f "$WATCH_FILE" ]; then
    echo "🔄 [Monitor] Pedido de atualização detectado em $(date)" | tee -a $LOG_FILE
    
    # Remover o gatilho para não entrar em loop infinito
    rm "$WATCH_FILE"

    echo "🚀 [Monitor] Executando update.sh..." | tee -a $LOG_FILE
    
    # Executar script de atualização e logar saída
    ./update.sh >> $LOG_FILE 2>&1
    
    echo "✅ [Monitor] Atualização concluída em $(date)" | tee -a $LOG_FILE
  fi
  
  # Verificar a cada 10 segundos
  sleep 10
done
