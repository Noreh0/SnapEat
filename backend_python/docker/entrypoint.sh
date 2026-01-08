#!/bin/bash
# 🚀 Script de Inicialização do Container de Documentação SnapEats
# ==============================================================

set -e

echo "🍽️ Iniciando SnapEats Documentation Container..."

# Função para logging
log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Função para verificar se um serviço está rodando
wait_for_service() {
    local host=$1
    local port=$2
    local service_name=$3
    local timeout=${4:-30}
    
    log "⏳ Aguardando $service_name ($host:$port)..."
    
    for i in $(seq 1 $timeout); do
        if nc -z $host $port 2>/dev/null; then
            log "✅ $service_name está disponível!"
            return 0
        fi
        sleep 1
    done
    
    log "❌ Timeout aguardando $service_name"
    return 1
}

# Configurar diretórios e permissões
setup_directories() {
    log "📁 Configurando diretórios..."
    
    mkdir -p /app/logs /app/data /app/temp
    mkdir -p /usr/share/nginx/html/docs
    mkdir -p /var/log/nginx
    
    # Copiar arquivos estáticos se não existirem
    if [ ! -f /usr/share/nginx/html/docs/index.html ]; then
        log "📋 Copiando documentação estática..."
        cp -r /app/docs/static/* /usr/share/nginx/html/docs/ 2>/dev/null || true
    fi
}

# Inicializar aplicação Flask
start_flask() {
    log "🐍 Iniciando aplicação Flask..."
    
    cd /app
    
    # Configurar variáveis de ambiente
    export FLASK_APP=main.py
    export FLASK_ENV=${FLASK_ENV:-production}
    export FLASK_DEBUG=${FLASK_DEBUG:-false}
    
    # Iniciar Gunicorn em background
    gunicorn \
        --bind 127.0.0.1:5000 \
        --workers ${GUNICORN_WORKERS:-2} \
        --worker-class ${GUNICORN_WORKER_CLASS:-sync} \
        --timeout ${GUNICORN_TIMEOUT:-30} \
        --keepalive ${GUNICORN_KEEPALIVE:-5} \
        --max-requests ${GUNICORN_MAX_REQUESTS:-1000} \
        --max-requests-jitter ${GUNICORN_MAX_REQUESTS_JITTER:-100} \
        --log-level ${GUNICORN_LOG_LEVEL:-info} \
        --access-logfile /app/logs/gunicorn-access.log \
        --error-logfile /app/logs/gunicorn-error.log \
        --daemon \
        main:app
    
    # Aguardar Flask inicializar
    wait_for_service 127.0.0.1 5000 "Flask App"
}

# Inicializar monitoramento
start_monitoring() {
    if [ "${ENABLE_MONITORING:-true}" = "true" ]; then
        log "📊 Iniciando monitoramento..."
        
        cd /app
        python3 scripts/monitor_docs.py --once &
        
        # Agendar monitoramento contínuo (simplificado)
        (
            while true; do
                sleep ${MONITOR_INTERVAL:-300}
                python3 scripts/monitor_docs.py --once
            done
        ) &
    fi
}

# Gerar configuração inicial
generate_config() {
    log "⚙️ Gerando configuração..."
    
    # Gerar dashboard inicial
    if [ -f /app/scripts/monitor_docs.py ]; then
        cd /app && python3 scripts/monitor_docs.py --once 2>/dev/null || true
    fi
    
    # Copiar dashboard para Nginx
    if [ -f /app/status_dashboard.html ]; then
        cp /app/status_dashboard.html /usr/share/nginx/html/
    fi
}

# Função principal
main() {
    log "🚀 Iniciando SnapEats Documentation Server"
    log "📦 Versão: ${DOC_VERSION:-1.0.0}"
    log "🌍 Ambiente: ${ENVIRONMENT:-production}"
    
    # Configurar timezone
    if [ -n "$TZ" ]; then
        log "🕐 Configurando timezone: $TZ"
        ln -snf /usr/share/zoneinfo/$TZ /etc/localtime
        echo $TZ > /etc/timezone
    fi
    
    # Executar configurações
    setup_directories
    start_flask
    generate_config
    start_monitoring
    
    log "✅ Inicialização concluída!"
    log "📚 Documentação disponível em: http://localhost/docs/"
    log "🏥 Health check em: http://localhost/health"
    log "📊 Status dashboard em: http://localhost/status"
    
    # Executar comando passado como parâmetro
    exec "$@"
}

# Verificar se está executando como init (PID 1)
if [ $$ -eq 1 ]; then
    log "🔧 Executando como processo init"
    
    # Configurar signal handlers para shutdown gracioso
    shutdown_handler() {
        log "🛑 Recebido sinal de shutdown..."
        
        # Parar Flask
        pkill -f gunicorn || true
        
        # Parar monitoramento
        pkill -f monitor_docs.py || true
        
        log "👋 Shutdown concluído"
        exit 0
    }
    
    trap shutdown_handler SIGTERM SIGINT
fi

# Executar função principal
main "$@"