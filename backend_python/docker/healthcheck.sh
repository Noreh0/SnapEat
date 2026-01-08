#!/bin/bash
# 🏥 Health Check Script para Container de Documentação SnapEats
# ============================================================

set -e

# Configurações
API_URL="http://127.0.0.1:5000"
NGINX_URL="http://127.0.0.1:80"
TIMEOUT=5
EXIT_CODE=0

# Função para logging
log() {
    echo "[HEALTHCHECK] $1" >&2
}

# Função para verificar endpoint
check_endpoint() {
    local url=$1
    local description=$2
    local expected_status=${3:-200}
    
    log "🔍 Verificando $description: $url"
    
    # Fazer requisição com timeout
    if response=$(curl -s -w "\n%{http_code}" --max-time $TIMEOUT "$url" 2>/dev/null); then
        # Extrair código de status da última linha
        status_code=$(echo "$response" | tail -n1)
        
        if [ "$status_code" = "$expected_status" ]; then
            log "✅ $description: OK ($status_code)"
            return 0
        else
            log "❌ $description: Erro HTTP $status_code"
            return 1
        fi
    else
        log "❌ $description: Falha na conexão"
        return 1
    fi
}

# Função para verificar processo
check_process() {
    local process_name=$1
    local description=$2
    
    if pgrep -f "$process_name" >/dev/null; then
        log "✅ $description: Rodando"
        return 0
    else
        log "❌ $description: Não encontrado"
        return 1
    fi
}

# Função para verificar uso de recursos
check_resources() {
    log "📊 Verificando recursos do sistema..."
    
    # Verificar memória (falhar se usar mais de 90%)
    if command -v free >/dev/null; then
        memory_usage=$(free | awk 'NR==2{printf "%.1f", $3*100/$2}')
        if [ "$(echo "$memory_usage > 90" | bc -l 2>/dev/null || echo 0)" = "1" ]; then
            log "❌ Uso de memória crítico: ${memory_usage}%"
            return 1
        else
            log "✅ Uso de memória: ${memory_usage}%"
        fi
    fi
    
    # Verificar espaço em disco (falhar se usar mais de 95%)
    disk_usage=$(df / | awk 'NR==2{print substr($5,1,length($5)-1)}')
    if [ "$disk_usage" -gt 95 ]; then
        log "❌ Espaço em disco crítico: ${disk_usage}%"
        return 1
    else
        log "✅ Espaço em disco: ${disk_usage}%"
    fi
    
    return 0
}

# Verificar arquivos críticos
check_files() {
    log "📁 Verificando arquivos críticos..."
    
    critical_files=(
        "/app/main.py"
        "/etc/nginx/nginx.conf"
        "/app/logs"
    )
    
    for file in "${critical_files[@]}"; do
        if [ ! -e "$file" ]; then
            log "❌ Arquivo crítico ausente: $file"
            return 1
        fi
    done
    
    log "✅ Todos os arquivos críticos presentes"
    return 0
}

# Health check principal
main() {
    log "🏥 Iniciando health check do SnapEats Documentation"
    log "⏰ $(date)"
    
    # Verificar arquivos críticos
    if ! check_files; then
        EXIT_CODE=1
    fi
    
    # Verificar processos essenciais
    if ! check_process "gunicorn" "Flask App (Gunicorn)"; then
        EXIT_CODE=1
    fi
    
    if ! check_process "nginx" "Nginx Web Server"; then
        EXIT_CODE=1
    fi
    
    # Verificar endpoints da API
    if ! check_endpoint "$API_URL/api/health" "API Health Endpoint"; then
        EXIT_CODE=1
    fi
    
    if ! check_endpoint "$API_URL/api/info" "API Info Endpoint"; then
        EXIT_CODE=1
    fi
    
    if ! check_endpoint "$API_URL/docs/" "Swagger Documentation" "200"; then
        EXIT_CODE=1
    fi
    
    # Verificar Nginx
    if ! check_endpoint "$NGINX_URL/health" "Nginx Health Proxy"; then
        EXIT_CODE=1
    fi
    
    # Verificar recursos do sistema
    if ! check_resources; then
        EXIT_CODE=1
    fi
    
    # Verificar conectividade da documentação
    if ! check_endpoint "$NGINX_URL/docs/" "Documentation via Nginx"; then
        EXIT_CODE=1
    fi
    
    # Resultado final
    if [ $EXIT_CODE -eq 0 ]; then
        log "🎉 Health check PASSOU - Todos os serviços estão funcionando"
        echo "healthy"
    else
        log "💥 Health check FALHOU - Alguns serviços estão com problemas"
        echo "unhealthy"
    fi
    
    exit $EXIT_CODE
}

# Executar health check
main "$@"