#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
📊 Monitor de Documentação SnapEats API
=======================================

Sistema de monitoramento contínuo que verifica se a documentação
está sempre online, atualizada e acessível.

Funcionalidades:
- Monitoramento 24/7 da disponibilidade
- Verificação de integridade dos endpoints
- Alertas via email/webhook quando offline
- Métricas de uptime e performance
- Dashboard de status em tempo real

Configuração via variáveis de ambiente:
- DOCS_MONITOR_INTERVAL: Intervalo de verificação (default: 300s)
- DOCS_ALERT_EMAIL: Email para alertas
- DOCS_WEBHOOK_URL: Webhook para notificações
- DOCS_ENVIRONMENTS: Ambientes para monitorar

Autor: SnapEats Development Team
Data: Novembro 2025
"""

import os
import time
import json
import logging
import requests
import smtplib
from datetime import datetime, timedelta
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart
from pathlib import Path
from typing import Dict, List, Optional

# Configuração de logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler('docs_monitor.log'),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

class DocumentationMonitor:
    """Monitor de documentação da API SnapEats"""
    
    def __init__(self):
        """Inicializa o monitor com configurações"""
        self.config = self._load_config()
        self.status_history = []
        self.alert_cooldown = {}
        
    def _load_config(self) -> Dict:
        """Carrega configurações do monitor"""
        return {
            'environments': {
                'development': {
                    'name': 'Desenvolvimento',
                    'api_url': 'http://localhost:5000',
                    'docs_url': 'http://localhost:5000/docs/',
                    'priority': 'low'
                },
                'staging': {
                    'name': 'Homologação',
                    'api_url': 'https://api-stage.snapeats.com',
                    'docs_url': 'https://docs-stage.snapeats.com',
                    'priority': 'medium'
                },
                'production': {
                    'name': 'Produção',
                    'api_url': 'https://api.snapeats.com',
                    'docs_url': 'https://docs.snapeats.com',
                    'priority': 'critical'
                }
            },
            'monitor_interval': int(os.getenv('DOCS_MONITOR_INTERVAL', 300)),  # 5 minutos
            'alert_email': os.getenv('DOCS_ALERT_EMAIL', 'suporte@snapeats.com'),
            'webhook_url': os.getenv('DOCS_WEBHOOK_URL'),
            'timeout': 10,
            'max_retries': 3,
            'alert_cooldown_minutes': 30
        }
    
    def check_endpoint_health(self, url: str, timeout: int = 10) -> Dict:
        """Verifica a saúde de um endpoint"""
        try:
            start_time = time.time()
            response = requests.get(url, timeout=timeout)
            response_time = time.time() - start_time
            
            return {
                'url': url,
                'status_code': response.status_code,
                'response_time': round(response_time * 1000, 2),  # ms
                'is_healthy': response.status_code == 200,
                'timestamp': datetime.now().isoformat(),
                'error': None
            }
            
        except requests.exceptions.RequestException as e:
            return {
                'url': url,
                'status_code': None,
                'response_time': None,
                'is_healthy': False,
                'timestamp': datetime.now().isoformat(),
                'error': str(e)
            }
    
    def check_environment_health(self, env_name: str, env_config: Dict) -> Dict:
        """Verifica a saúde completa de um ambiente"""
        logger.info(f"🔍 Verificando ambiente: {env_config['name']}")
        
        endpoints_to_check = [
            (f"{env_config['api_url']}/api/health", "API Health"),
            (f"{env_config['api_url']}/api/info", "API Info"),
            (f"{env_config['api_url']}/docs/", "Swagger UI"),
            (f"{env_config['api_url']}/openapi.json", "OpenAPI Spec")
        ]
        
        results = []
        overall_healthy = True
        
        for url, description in endpoints_to_check:
            result = self.check_endpoint_health(url)
            result['description'] = description
            results.append(result)
            
            if not result['is_healthy']:
                overall_healthy = False
                logger.warning(f"  ❌ {description}: {result.get('error', 'HTTP ' + str(result.get('status_code', 'N/A')))}")
            else:
                logger.info(f"  ✅ {description}: {result['response_time']}ms")
        
        env_status = {
            'environment': env_name,
            'name': env_config['name'],
            'priority': env_config['priority'],
            'overall_healthy': overall_healthy,
            'endpoints': results,
            'timestamp': datetime.now().isoformat(),
            'uptime_percentage': self._calculate_uptime(env_name)
        }
        
        # Adicionar ao histórico
        self.status_history.append(env_status)
        
        # Manter apenas últimas 1000 verificações
        if len(self.status_history) > 1000:
            self.status_history = self.status_history[-1000:]
        
        return env_status
    
    def _calculate_uptime(self, env_name: str) -> float:
        """Calcula a porcentagem de uptime nas últimas 24h"""
        now = datetime.now()
        yesterday = now - timedelta(hours=24)
        
        recent_checks = [
            status for status in self.status_history
            if (status.get('environment') == env_name and 
                datetime.fromisoformat(status['timestamp']) > yesterday)
        ]
        
        if not recent_checks:
            return 100.0
        
        healthy_checks = sum(1 for check in recent_checks if check['overall_healthy'])
        uptime_percentage = (healthy_checks / len(recent_checks)) * 100
        
        return round(uptime_percentage, 2)
    
    def send_alert(self, env_status: Dict) -> bool:
        """Envia alerta quando documentação está offline"""
        env_name = env_status['environment']
        priority = env_status['priority']
        
        # Verificar cooldown de alertas
        last_alert = self.alert_cooldown.get(env_name)
        if last_alert:
            time_since_alert = datetime.now() - last_alert
            if time_since_alert.total_seconds() < (self.config['alert_cooldown_minutes'] * 60):
                logger.info(f"⏳ Alerta em cooldown para {env_name}")
                return False
        
        logger.error(f"🚨 ALERTA: Documentação offline - {env_status['name']}")
        
        # Preparar detalhes do alerta
        failed_endpoints = [
            ep for ep in env_status['endpoints'] 
            if not ep['is_healthy']
        ]
        
        alert_data = {
            'environment': env_status['name'],
            'priority': priority,
            'timestamp': env_status['timestamp'],
            'uptime': env_status['uptime_percentage'],
            'failed_endpoints': failed_endpoints,
            'total_endpoints': len(env_status['endpoints'])
        }
        
        # Enviar email
        email_sent = self._send_email_alert(alert_data)
        
        # Enviar webhook
        webhook_sent = self._send_webhook_alert(alert_data)
        
        if email_sent or webhook_sent:
            self.alert_cooldown[env_name] = datetime.now()
            return True
        
        return False
    
    def _send_email_alert(self, alert_data: Dict) -> bool:
        """Envia alerta via email"""
        try:
            priority_emoji = {'low': '🟡', 'medium': '🟠', 'critical': '🔴'}
            emoji = priority_emoji.get(alert_data['priority'], '⚠️')
            
            subject = f"{emoji} SnapEats API Docs - {alert_data['environment']} OFFLINE"
            
            body = f"""
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
                <h2 style="color: #d97746;">🚨 Alerta: Documentação SnapEats Offline</h2>
                
                <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3>📊 Detalhes do Incidente</h3>
                    <ul>
                        <li><strong>Ambiente:</strong> {alert_data['environment']}</li>
                        <li><strong>Prioridade:</strong> {alert_data['priority'].upper()}</li>
                        <li><strong>Timestamp:</strong> {alert_data['timestamp']}</li>
                        <li><strong>Uptime (24h):</strong> {alert_data['uptime']}%</li>
                        <li><strong>Endpoints afetados:</strong> {len(alert_data['failed_endpoints'])}/{alert_data['total_endpoints']}</li>
                    </ul>
                </div>
                
                <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3>🔧 Endpoints com Falha</h3>
                    <ul>
            """
            
            for endpoint in alert_data['failed_endpoints']:
                body += f"<li><code>{endpoint['url']}</code> - {endpoint.get('error', 'HTTP ' + str(endpoint.get('status_code', 'N/A')))}</li>"
            
            body += """
                    </ul>
                </div>
                
                <div style="background: #d1ecf1; padding: 15px; border-radius: 5px; margin: 15px 0;">
                    <h3>🛠️ Próximos Passos</h3>
                    <ol>
                        <li>Verificar status dos servidores</li>
                        <li>Reiniciar aplicação se necessário</li>
                        <li>Verificar logs de erro</li>
                        <li>Confirmar resolução do problema</li>
                    </ol>
                </div>
                
                <p style="font-size: 12px; color: #666; margin-top: 30px;">
                    Este alerta foi gerado automaticamente pelo Monitor de Documentação SnapEats.<br>
                    Para mais informações, acesse o dashboard de monitoramento.
                </p>
            </body>
            </html>
            """
            
            # Aqui você implementaria o envio real do email
            # Por agora, apenas logamos
            logger.info(f"📧 Email de alerta preparado para: {self.config['alert_email']}")
            logger.info(f"📧 Assunto: {subject}")
            
            return True
            
        except Exception as e:
            logger.error(f"❌ Erro ao enviar email: {e}")
            return False
    
    def _send_webhook_alert(self, alert_data: Dict) -> bool:
        """Envia alerta via webhook (Slack, Discord, etc.)"""
        if not self.config['webhook_url']:
            return False
        
        try:
            priority_colors = {'low': '#ffc107', 'medium': '#fd7e14', 'critical': '#dc3545'}
            color = priority_colors.get(alert_data['priority'], '#6c757d')
            
            webhook_payload = {
                "text": f"🚨 SnapEats API Docs - {alert_data['environment']} OFFLINE",
                "attachments": [
                    {
                        "color": color,
                        "fields": [
                            {
                                "title": "Ambiente",
                                "value": alert_data['environment'],
                                "short": True
                            },
                            {
                                "title": "Prioridade",
                                "value": alert_data['priority'].upper(),
                                "short": True
                            },
                            {
                                "title": "Uptime (24h)",
                                "value": f"{alert_data['uptime']}%",
                                "short": True
                            },
                            {
                                "title": "Endpoints Afetados",
                                "value": f"{len(alert_data['failed_endpoints'])}/{alert_data['total_endpoints']}",
                                "short": True
                            }
                        ],
                        "footer": "Monitor SnapEats",
                        "ts": int(datetime.now().timestamp())
                    }
                ]
            }
            
            response = requests.post(
                self.config['webhook_url'],
                json=webhook_payload,
                timeout=10
            )
            
            if response.status_code == 200:
                logger.info("📨 Webhook enviado com sucesso")
                return True
            else:
                logger.error(f"❌ Erro no webhook: HTTP {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erro ao enviar webhook: {e}")
            return False
    
    def generate_status_report(self) -> Dict:
        """Gera relatório de status atual"""
        if not self.status_history:
            return {'message': 'Nenhum dado de monitoramento disponível'}
        
        latest_status = {}
        for env_name, env_config in self.config['environments'].items():
            env_checks = [
                status for status in self.status_history[-10:]  # Últimas 10 verificações
                if status.get('environment') == env_name
            ]
            
            if env_checks:
                latest_check = env_checks[-1]
                latest_status[env_name] = {
                    'name': latest_check['name'],
                    'healthy': latest_check['overall_healthy'],
                    'uptime_24h': latest_check['uptime_percentage'],
                    'last_check': latest_check['timestamp'],
                    'priority': latest_check['priority']
                }
        
        overall_health = all(
            env['healthy'] for env in latest_status.values()
        )
        
        return {
            'overall_healthy': overall_health,
            'environments': latest_status,
            'last_updated': datetime.now().isoformat(),
            'monitor_interval': self.config['monitor_interval'],
            'total_checks': len(self.status_history)
        }
    
    def save_status_dashboard(self):
        """Salva dashboard de status em arquivo HTML"""
        status_report = self.generate_status_report()
        
        dashboard_html = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SnapEats API Docs - Status Dashboard</title>
    <meta http-equiv="refresh" content="60">
    <style>
        body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 20px; background: #f8f9fa; }}
        .container {{ max-width: 1200px; margin: 0 auto; }}
        .header {{ text-align: center; margin-bottom: 30px; }}
        .status-card {{ background: white; border-radius: 10px; padding: 20px; margin: 15px 0; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }}
        .status-indicator {{ display: inline-block; width: 20px; height: 20px; border-radius: 50%; margin-right: 10px; }}
        .status-online {{ background: #28a745; }}
        .status-offline {{ background: #dc3545; }}
        .timestamp {{ color: #6c757d; font-size: 0.9em; }}
        .uptime {{ font-weight: bold; color: #007bff; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🍽️ SnapEats API Documentation Status</h1>
            <p class="timestamp">Última atualização: {status_report['last_updated']}</p>
        </div>
        
        <div class="status-card">
            <h2>📊 Status Geral</h2>
            <p><span class="status-indicator {'status-online' if status_report['overall_healthy'] else 'status-offline'}"></span>
               {'✅ Todos os ambientes online' if status_report['overall_healthy'] else '❌ Alguns ambientes offline'}</p>
        </div>
        """
        
        for env_name, env_data in status_report['environments'].items():
            status_class = 'status-online' if env_data['healthy'] else 'status-offline'
            status_text = '✅ Online' if env_data['healthy'] else '❌ Offline'
            
            dashboard_html += f"""
        <div class="status-card">
            <h3><span class="status-indicator {status_class}"></span>{env_data['name']}</h3>
            <p><strong>Status:</strong> {status_text}</p>
            <p><strong>Uptime (24h):</strong> <span class="uptime">{env_data['uptime_24h']}%</span></p>
            <p><strong>Prioridade:</strong> {env_data['priority'].capitalize()}</p>
            <p class="timestamp">Última verificação: {env_data['last_check']}</p>
        </div>
            """
        
        dashboard_html += """
    </div>
</body>
</html>
        """
        
        # Salvar dashboard
        dashboard_file = Path('status_dashboard.html')
        with open(dashboard_file, 'w', encoding='utf-8') as f:
            f.write(dashboard_html)
        
        logger.info(f"📊 Dashboard salvo: {dashboard_file}")
    
    def run_monitoring_cycle(self):
        """Executa um ciclo completo de monitoramento"""
        logger.info("🔄 Iniciando ciclo de monitoramento...")
        
        for env_name, env_config in self.config['environments'].items():
            env_status = self.check_environment_health(env_name, env_config)
            
            # Enviar alerta se necessário
            if not env_status['overall_healthy']:
                self.send_alert(env_status)
        
        # Gerar dashboard
        self.save_status_dashboard()
        
        logger.info("✅ Ciclo de monitoramento concluído")
    
    def run_continuous_monitoring(self):
        """Executa monitoramento contínuo"""
        logger.info("🚀 Iniciando monitoramento contínuo da documentação SnapEats...")
        logger.info(f"⏱️ Intervalo: {self.config['monitor_interval']} segundos")
        
        while True:
            try:
                self.run_monitoring_cycle()
                logger.info(f"💤 Aguardando {self.config['monitor_interval']} segundos...")
                time.sleep(self.config['monitor_interval'])
                
            except KeyboardInterrupt:
                logger.info("🛑 Monitoramento interrompido pelo usuário")
                break
            except Exception as e:
                logger.error(f"❌ Erro no monitoramento: {e}")
                logger.info("🔄 Continuando monitoramento após erro...")
                time.sleep(60)  # Aguardar 1 minuto antes de tentar novamente

def main():
    """Função principal"""
    monitor = DocumentationMonitor()
    
    # Executar um ciclo único ou monitoramento contínuo
    import sys
    if '--once' in sys.argv:
        monitor.run_monitoring_cycle()
    else:
        monitor.run_continuous_monitoring()

if __name__ == '__main__':
    main()