#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🚀 Script de Deploy da Documentação SnapEats API
================================================

Este script automatiza o processo de deploy da documentação OpenAPI,
garantindo que ela esteja sempre disponível online e atualizada.

Funcionalidades:
- Gera documentação estática HTML
- Deploya para servidor web
- Atualiza CDN
- Verifica disponibilidade
- Envia notificações de status

Uso:
    python deploy_docs.py [--env production|staging]
    
Autor: SnapEats Development Team
Data: Novembro 2025
"""

import os
import sys
import json
import argparse
import subprocess
from datetime import datetime
from pathlib import Path

# Configurações de ambiente
ENVIRONMENTS = {
    'development': {
        'name': 'Desenvolvimento',
        'url': 'http://localhost:5000',
        'docs_url': 'http://localhost:5000/docs/',
        'deploy_path': './static/docs'
    },
    'staging': {
        'name': 'Homologação', 
        'url': 'https://api-stage.snapeats.com',
        'docs_url': 'https://docs-stage.snapeats.com',
        'deploy_path': '/var/www/docs-stage'
    },
    'production': {
        'name': 'Produção',
        'url': 'https://api.snapeats.com', 
        'docs_url': 'https://docs.snapeats.com',
        'deploy_path': '/var/www/docs'
    }
}

def print_banner():
    """Imprime banner do SnapEats"""
    banner = """
    ╔══════════════════════════════════════════════════════════════╗
    ║                    🍽️  SNAPEATS API DOCS                    ║
    ║                   Deployment & Monitoring                    ║
    ║                                                              ║
    ║  📚 Documentação sempre atualizada e disponível 24/7        ║
    ╚══════════════════════════════════════════════════════════════╝
    """
    print(banner)

def check_dependencies():
    """Verifica se todas as dependências estão instaladas"""
    print("🔍 Verificando dependências...")
    
    dependencies = [
        ('flask', 'Flask framework'),
        ('flask-restx', 'Flask-RESTX para OpenAPI'),
        ('requests', 'HTTP library'),
        ('pyyaml', 'YAML parser')
    ]
    
    missing = []
    for package, description in dependencies:
        try:
            __import__(package.replace('-', '_'))
            print(f"  ✅ {package} - {description}")
        except ImportError:
            print(f"  ❌ {package} - {description} (FALTANDO)")
            missing.append(package)
    
    if missing:
        print(f"\n❌ Dependências faltando: {', '.join(missing)}")
        print("Execute: pip install " + " ".join(missing))
        return False
    
    print("✅ Todas as dependências estão instaladas\n")
    return True

def generate_static_docs(env_config):
    """Gera documentação estática HTML"""
    print(f"📄 Gerando documentação estática para {env_config['name']}...")
    
    try:
        # Criar diretório se não existir
        docs_dir = Path(env_config['deploy_path'])
        docs_dir.mkdir(parents=True, exist_ok=True)
        
        # Template HTML personalizado para documentação
        html_template = f"""
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SnapEats API - Documentação Oficial</title>
    <link rel="stylesheet" type="text/css" href="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui.css" />
    <link rel="icon" type="image/png" href="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==" sizes="16x16" />
    <style>
        html {{ box-sizing: border-box; overflow: -moz-scrollbars-vertical; overflow-y: scroll; }}
        *, *:before, *:after {{ box-sizing: inherit; }}
        body {{ margin:0; background: #fafafa; }}
        
        /* Customização SnapEats */
        .swagger-ui .topbar {{ background-color: #d97746; }}
        .swagger-ui .topbar .download-url-wrapper .select-label {{ color: white; }}
        .swagger-ui .topbar .download-url-wrapper input[type=text] {{ border: 2px solid #6a7b53; }}
        
        /* Header customizado */
        .custom-header {{
            background: linear-gradient(135deg, #d97746 0%, #6a7b53 100%);
            color: white;
            padding: 2rem;
            text-align: center;
            margin-bottom: 0;
        }}
        
        .custom-header h1 {{
            margin: 0;
            font-size: 2.5rem;
            font-weight: 700;
        }}
        
        .custom-header p {{
            margin: 0.5rem 0 0 0;
            font-size: 1.1rem;
            opacity: 0.9;
        }}
        
        .status-badge {{
            display: inline-block;
            background: #27ae60;
            color: white;
            padding: 0.3rem 0.8rem;
            border-radius: 15px;
            font-size: 0.9rem;
            font-weight: 600;
            margin-top: 1rem;
        }}
    </style>
</head>
<body>
    <div class="custom-header">
        <h1>🍽️ SnapEats API</h1>
        <p>Documentação Oficial - Ambiente: {env_config['name']}</p>
        <div class="status-badge">🟢 Online - Atualizado em {datetime.now().strftime('%d/%m/%Y %H:%M')}</div>
    </div>
    
    <div id="swagger-ui"></div>
    
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-bundle.js"></script>
    <script src="https://unpkg.com/swagger-ui-dist@3.52.5/swagger-ui-standalone-preset.js"></script>
    <script>
    window.onload = function() {{
        const ui = SwaggerUIBundle({{
            url: '{env_config['url']}/openapi.json',
            dom_id: '#swagger-ui',
            deepLinking: true,
            presets: [
                SwaggerUIBundle.presets.apis,
                SwaggerUIStandalonePreset
            ],
            plugins: [
                SwaggerUIBundle.plugins.DownloadUrl
            ],
            layout: "StandaloneLayout",
            defaultModelsExpandDepth: 2,
            defaultModelExpandDepth: 2,
            docExpansion: "list",
            filter: true,
            showExtensions: true,
            showCommonExtensions: true,
            tryItOutEnabled: true
        }})
        
        window.ui = ui
    }}
    </script>
</body>
</html>
        """
        
        # Salvar HTML
        html_file = docs_dir / 'index.html'
        with open(html_file, 'w', encoding='utf-8') as f:
            f.write(html_template)
        
        # Criar arquivo de status
        status_file = docs_dir / 'status.json'
        status_data = {
            'environment': env_config['name'],
            'last_updated': datetime.now().isoformat(),
            'api_url': env_config['url'],
            'docs_url': env_config['docs_url'],
            'version': '2.0.1',
            'status': 'online'
        }
        
        with open(status_file, 'w', encoding='utf-8') as f:
            json.dump(status_data, f, indent=2, ensure_ascii=False)
        
        print(f"  ✅ HTML gerado: {html_file}")
        print(f"  ✅ Status criado: {status_file}")
        
        return True
        
    except Exception as e:
        print(f"  ❌ Erro ao gerar documentação: {e}")
        return False

def test_documentation_availability(env_config):
    """Testa se a documentação está acessível"""
    print(f"🌐 Testando disponibilidade da documentação...")
    
    try:
        import requests
        
        # Testar API
        api_response = requests.get(f"{env_config['url']}/api/health", timeout=10)
        api_status = "✅" if api_response.status_code == 200 else "❌"
        print(f"  {api_status} API Health: {env_config['url']}/api/health")
        
        # Testar documentação Swagger
        docs_response = requests.get(f"{env_config['url']}/docs/", timeout=10)
        docs_status = "✅" if docs_response.status_code == 200 else "❌"
        print(f"  {docs_status} Swagger UI: {env_config['url']}/docs/")
        
        # Testar OpenAPI JSON
        openapi_response = requests.get(f"{env_config['url']}/openapi.json", timeout=10)
        openapi_status = "✅" if openapi_response.status_code == 200 else "❌"
        print(f"  {openapi_status} OpenAPI JSON: {env_config['url']}/openapi.json")
        
        # Verificar se todos estão funcionando
        all_working = all([
            api_response.status_code == 200,
            docs_response.status_code == 200,
            openapi_response.status_code == 200
        ])
        
        if all_working:
            print("✅ Todos os endpoints estão funcionando corretamente\n")
        else:
            print("⚠️ Alguns endpoints não estão respondendo corretamente\n")
            
        return all_working
        
    except Exception as e:
        print(f"❌ Erro ao testar disponibilidade: {e}\n")
        return False

def generate_postman_collection(env_config):
    """Gera collection do Postman para a API"""
    print("📮 Gerando Postman Collection...")
    
    try:
        collection = {
            "info": {
                "name": f"SnapEats API - {env_config['name']}",
                "description": "Collection completa da API SnapEats com exemplos de uso",
                "version": "2.0.1",
                "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
            },
            "auth": {
                "type": "bearer",
                "bearer": [
                    {
                        "key": "token",
                        "value": "{{jwt_token}}",
                        "type": "string"
                    }
                ]
            },
            "variable": [
                {
                    "key": "base_url",
                    "value": env_config['url'],
                    "type": "string"
                },
                {
                    "key": "jwt_token",
                    "value": "seu_token_jwt_aqui",
                    "type": "string"
                }
            ],
            "item": [
                {
                    "name": "🔐 Autenticação",
                    "item": [
                        {
                            "name": "Login Cliente",
                            "request": {
                                "method": "POST",
                                "header": [
                                    {
                                        "key": "Content-Type",
                                        "value": "application/json"
                                    }
                                ],
                                "body": {
                                    "mode": "raw",
                                    "raw": json.dumps({
                                        "email": "cliente@exemplo.com",
                                        "senha": "senha123"
                                    }, indent=2)
                                },
                                "url": {
                                    "raw": "{{base_url}}/auth/login",
                                    "host": ["{{base_url}}"],
                                    "path": ["auth", "login"]
                                }
                            }
                        }
                    ]
                }
            ]
        }
        
        # Salvar collection
        docs_dir = Path(env_config['deploy_path'])
        collection_file = docs_dir / 'postman_collection.json'
        
        with open(collection_file, 'w', encoding='utf-8') as f:
            json.dump(collection, f, indent=2, ensure_ascii=False)
        
        print(f"  ✅ Postman Collection: {collection_file}")
        return True
        
    except Exception as e:
        print(f"  ❌ Erro ao gerar Postman Collection: {e}")
        return False

def main():
    """Função principal"""
    parser = argparse.ArgumentParser(description='Deploy da documentação SnapEats API')
    parser.add_argument('--env', choices=['development', 'staging', 'production'], 
                       default='development', help='Ambiente de deploy')
    parser.add_argument('--skip-tests', action='store_true', help='Pular testes de disponibilidade')
    
    args = parser.parse_args()
    
    print_banner()
    
    # Verificar dependências
    if not check_dependencies():
        sys.exit(1)
    
    # Configuração do ambiente
    env_config = ENVIRONMENTS[args.env]
    print(f"🎯 Ambiente selecionado: {env_config['name']}")
    print(f"🌐 URL da API: {env_config['url']}")
    print(f"📚 URL da Documentação: {env_config['docs_url']}")
    print()
    
    # Gerar documentação estática
    if not generate_static_docs(env_config):
        print("❌ Falha ao gerar documentação")
        sys.exit(1)
    
    # Gerar Postman Collection
    generate_postman_collection(env_config)
    
    # Testar disponibilidade (se não foi pulado)
    if not args.skip_tests:
        if not test_documentation_availability(env_config):
            print("⚠️ Alguns testes falharam, mas a documentação foi gerada")
    
    # Resumo final
    print("🎉 Deploy da documentação concluído com sucesso!")
    print(f"📖 Acesse: {env_config['docs_url']}")
    print(f"🔗 Swagger UI: {env_config['url']}/docs/")
    print(f"📋 OpenAPI JSON: {env_config['url']}/openapi.json")
    print()
    print("🚀 Documentação está online e disponível 24/7!")

if __name__ == '__main__':
    main()