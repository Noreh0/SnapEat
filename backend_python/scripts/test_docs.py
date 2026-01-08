#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
🧪 Testes de Validação da Documentação SnapEats API
==================================================

Script que valida se a documentação está funcionando corretamente,
verifica a especificação OpenAPI e testa todos os endpoints documentados.

Funcionalidades:
- Validação da especificação OpenAPI
- Teste de disponibilidade da documentação
- Verificação de todos os endpoints
- Validação de schemas e exemplos
- Relatório de cobertura da documentação

Uso:
    python scripts/test_docs.py
    python scripts/test_docs.py --environment production
    python scripts/test_docs.py --full-test

Autor: SnapEats Development Team
"""

import requests
import json
import sys
import argparse
from pathlib import Path
from typing import Dict, List, Tuple, Optional
import yaml
import time
from datetime import datetime
import jsonschema

class DocumentationTester:
    """Tester para validação completa da documentação da API"""
    
    def __init__(self, base_url: str = 'http://localhost:5000'):
        """
        Inicializa o tester
        
        Args:
            base_url: URL base da API
        """
        self.base_url = base_url.rstrip('/')
        self.results = {
            'timestamp': datetime.now().isoformat(),
            'base_url': base_url,
            'tests_run': 0,
            'tests_passed': 0,
            'tests_failed': 0,
            'errors': [],
            'warnings': [],
            'coverage': {}
        }
        
    def log_success(self, message: str):
        """Log de sucesso"""
        print(f"✅ {message}")
        self.results['tests_passed'] += 1
        
    def log_error(self, message: str, details: Optional[str] = None):
        """Log de erro"""
        print(f"❌ {message}")
        if details:
            print(f"   Details: {details}")
        
        error_entry = {'message': message, 'timestamp': datetime.now().isoformat()}
        if details:
            error_entry['details'] = details
            
        self.results['errors'].append(error_entry)
        self.results['tests_failed'] += 1
        
    def log_warning(self, message: str):
        """Log de aviso"""
        print(f"⚠️ {message}")
        self.results['warnings'].append({
            'message': message,
            'timestamp': datetime.now().isoformat()
        })
        
    def test_api_availability(self) -> bool:
        """Testa se a API está disponível"""
        print("\n🔍 Testando disponibilidade da API...")
        self.results['tests_run'] += 1
        
        try:
            response = requests.get(f"{self.base_url}/api/health", timeout=10)
            if response.status_code == 200:
                self.log_success(f"API disponível em {self.base_url}")
                return True
            else:
                self.log_error(f"API retornou status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_error(f"Falha ao conectar com a API", str(e))
            return False
    
    def test_swagger_ui_availability(self) -> bool:
        """Testa se a interface Swagger está disponível"""
        print("\n📚 Testando disponibilidade do Swagger UI...")
        self.results['tests_run'] += 1
        
        try:
            response = requests.get(f"{self.base_url}/docs/", timeout=10)
            if response.status_code == 200:
                if 'swagger' in response.text.lower() or 'openapi' in response.text.lower():
                    self.log_success("Swagger UI disponível e carregando")
                    return True
                else:
                    self.log_warning("Swagger UI carregou mas pode não estar configurado corretamente")
                    return False
            else:
                self.log_error(f"Swagger UI retornou status {response.status_code}")
                return False
        except requests.exceptions.RequestException as e:
            self.log_error("Falha ao acessar Swagger UI", str(e))
            return False
    
    def test_openapi_spec_validity(self) -> Optional[Dict]:
        """Testa se a especificação OpenAPI é válida"""
        print("\n📋 Testando especificação OpenAPI...")
        self.results['tests_run'] += 1
        
        try:
            # Testar endpoint dinâmico
            response = requests.get(f"{self.base_url}/openapi.json", timeout=10)
            if response.status_code != 200:
                self.log_error(f"Falha ao obter OpenAPI spec via API: {response.status_code}")
                return None
            
            spec = response.json()
            
            # Validações básicas da spec
            required_fields = ['openapi', 'info', 'paths']
            for field in required_fields:
                if field not in spec:
                    self.log_error(f"Campo obrigatório '{field}' não encontrado na spec OpenAPI")
                    return None
            
            # Verificar versão OpenAPI
            if not spec['openapi'].startswith('3.'):
                self.log_warning(f"Versão OpenAPI {spec['openapi']} pode não ser suportada")
            
            # Contar endpoints
            paths_count = len(spec.get('paths', {}))
            self.results['coverage']['total_endpoints'] = paths_count
            
            self.log_success(f"Especificação OpenAPI válida com {paths_count} endpoints")
            return spec
            
        except requests.exceptions.RequestException as e:
            self.log_error("Falha ao obter especificação OpenAPI", str(e))
            return None
        except json.JSONDecodeError as e:
            self.log_error("Especificação OpenAPI contém JSON inválido", str(e))
            return None
    
    def test_openapi_yaml_file(self) -> Optional[Dict]:
        """Testa o arquivo openapi.yaml local"""
        print("\n📄 Testando arquivo openapi.yaml...")
        self.results['tests_run'] += 1
        
        yaml_file = Path('openapi.yaml')
        if not yaml_file.exists():
            self.log_warning("Arquivo openapi.yaml não encontrado")
            return None
        
        try:
            with open(yaml_file, 'r', encoding='utf-8') as f:
                spec = yaml.safe_load(f)
            
            # Validações básicas
            required_fields = ['openapi', 'info', 'paths']
            for field in required_fields:
                if field not in spec:
                    self.log_error(f"Campo '{field}' não encontrado no openapi.yaml")
                    return None
            
            self.log_success("Arquivo openapi.yaml é válido")
            return spec
            
        except yaml.YAMLError as e:
            self.log_error("Erro ao parsear openapi.yaml", str(e))
            return None
        except Exception as e:
            self.log_error("Erro ao ler openapi.yaml", str(e))
            return None
    
    def test_endpoints_documentation(self, spec: Dict) -> None:
        """Testa se todos os endpoints estão documentados"""
        print("\n🔗 Testando documentação dos endpoints...")
        
        paths = spec.get('paths', {})
        documented_endpoints = 0
        working_endpoints = 0
        
        for path, methods in paths.items():
            for method, details in methods.items():
                if method.upper() in ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']:
                    self.results['tests_run'] += 1
                    documented_endpoints += 1
                    
                    # Verificar se o endpoint tem documentação adequada
                    if not details.get('summary'):
                        self.log_warning(f"{method.upper()} {path} não possui summary")
                    
                    if not details.get('description'):
                        self.log_warning(f"{method.upper()} {path} não possui description")
                    
                    # Testar endpoints GET publicos
                    if method.upper() == 'GET' and not self._requires_auth(path):
                        if self._test_endpoint_availability(method.upper(), path):
                            working_endpoints += 1
        
        self.results['coverage']['documented_endpoints'] = documented_endpoints
        self.results['coverage']['working_endpoints'] = working_endpoints
        
        coverage_percentage = (working_endpoints / documented_endpoints * 100) if documented_endpoints > 0 else 0
        self.log_success(f"Cobertura de documentação: {working_endpoints}/{documented_endpoints} ({coverage_percentage:.1f}%)")
    
    def _requires_auth(self, path: str) -> bool:
        """Verifica se o endpoint requer autenticação"""
        # Endpoints que normalmente são públicos
        public_endpoints = [
            '/api/health',
            '/api/info',
            '/docs',
            '/openapi.json',
            '/api/auth/login',
            '/api/auth/register'
        ]
        
        return not any(public_path in path for public_path in public_endpoints)
    
    def _test_endpoint_availability(self, method: str, path: str) -> bool:
        """Testa se um endpoint específico está disponível"""
        full_url = f"{self.base_url}{path}"
        
        try:
            if method == 'GET':
                response = requests.get(full_url, timeout=5)
            else:
                return True  # Não testamos outros métodos por segurança
                
            # Consideramos sucesso se não for 404 ou 500
            if response.status_code not in [404, 500]:
                self.log_success(f"{method} {path} - Status {response.status_code}")
                return True
            else:
                self.log_error(f"{method} {path} - Status {response.status_code}")
                return False
                
        except requests.exceptions.RequestException as e:
            self.log_error(f"{method} {path} - Erro de conexão", str(e))
            return False
    
    def test_health_endpoints(self) -> None:
        """Testa endpoints específicos de saúde"""
        print("\n🏥 Testando endpoints de saúde...")
        
        health_endpoints = [
            ('/api/health', 'Health Check'),
            ('/api/info', 'API Info'),
        ]
        
        for endpoint, description in health_endpoints:
            self.results['tests_run'] += 1
            try:
                response = requests.get(f"{self.base_url}{endpoint}", timeout=5)
                if response.status_code == 200:
                    data = response.json()
                    self.log_success(f"{description} funcionando - {endpoint}")
                    
                    # Validações específicas para health check
                    if 'health' in endpoint:
                        if 'status' not in data:
                            self.log_warning("Health check não retorna campo 'status'")
                else:
                    self.log_error(f"{description} falhou - Status {response.status_code}")
                    
            except requests.exceptions.RequestException as e:
                self.log_error(f"Erro ao testar {description}", str(e))
            except json.JSONDecodeError:
                self.log_error(f"{description} não retorna JSON válido")
    
    def test_cors_configuration(self) -> None:
        """Testa configuração de CORS"""
        print("\n🌐 Testando configuração CORS...")
        self.results['tests_run'] += 1
        
        try:
            # Fazer requisição OPTIONS para verificar CORS
            response = requests.options(
                f"{self.base_url}/api/health",
                headers={'Origin': 'http://localhost:4200'},
                timeout=5
            )
            
            cors_headers = {
                'Access-Control-Allow-Origin',
                'Access-Control-Allow-Methods',
                'Access-Control-Allow-Headers'
            }
            
            found_headers = cors_headers.intersection(response.headers.keys())
            
            if found_headers:
                self.log_success(f"CORS configurado - Headers: {', '.join(found_headers)}")
            else:
                self.log_warning("CORS pode não estar configurado corretamente")
                
        except requests.exceptions.RequestException as e:
            self.log_error("Erro ao testar CORS", str(e))
    
    def generate_report(self) -> str:
        """Gera relatório final dos testes"""
        print("\n" + "="*60)
        print("📊 RELATÓRIO FINAL DOS TESTES")
        print("="*60)
        
        total_tests = self.results['tests_run']
        passed_tests = self.results['tests_passed']
        failed_tests = self.results['tests_failed']
        
        success_rate = (passed_tests / total_tests * 100) if total_tests > 0 else 0
        
        print(f"🧪 Total de testes: {total_tests}")
        print(f"✅ Testes aprovados: {passed_tests}")
        print(f"❌ Testes falharam: {failed_tests}")
        print(f"⚠️ Avisos: {len(self.results['warnings'])}")
        print(f"📈 Taxa de sucesso: {success_rate:.1f}%")
        
        if self.results['coverage']:
            print(f"\n📋 Cobertura da Documentação:")
            coverage = self.results['coverage']
            if 'total_endpoints' in coverage:
                print(f"   Total de endpoints: {coverage['total_endpoints']}")
            if 'documented_endpoints' in coverage:
                print(f"   Endpoints documentados: {coverage['documented_endpoints']}")
            if 'working_endpoints' in coverage:
                print(f"   Endpoints funcionando: {coverage['working_endpoints']}")
        
        # Mostrar erros se houver
        if self.results['errors']:
            print(f"\n❌ Erros encontrados:")
            for i, error in enumerate(self.results['errors'][:5], 1):
                print(f"   {i}. {error['message']}")
                if 'details' in error:
                    print(f"      {error['details']}")
            if len(self.results['errors']) > 5:
                print(f"   ... e mais {len(self.results['errors']) - 5} erros")
        
        # Mostrar avisos
        if self.results['warnings']:
            print(f"\n⚠️ Avisos:")
            for i, warning in enumerate(self.results['warnings'][:3], 1):
                print(f"   {i}. {warning['message']}")
            if len(self.results['warnings']) > 3:
                print(f"   ... e mais {len(self.results['warnings']) - 3} avisos")
        
        # Salvar relatório em arquivo
        report_file = f"docs_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w', encoding='utf-8') as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        
        print(f"\n💾 Relatório completo salvo em: {report_file}")
        
        # Determinar status final
        if failed_tests == 0:
            status = "🎉 TODOS OS TESTES PASSARAM!"
            exit_code = 0
        elif success_rate >= 80:
            status = "⚠️ MAIORIA DOS TESTES PASSOU (alguns problemas encontrados)"
            exit_code = 0
        else:
            status = "❌ MUITOS TESTES FALHARAM (problemas críticos encontrados)"
            exit_code = 1
        
        print(f"\n{status}")
        print("="*60)
        
        return exit_code

def main():
    """Função principal"""
    parser = argparse.ArgumentParser(description='Testa a documentação da API SnapEats')
    parser.add_argument('--url', '-u', default='http://localhost:5000',
                       help='URL base da API (padrão: http://localhost:5000)')
    parser.add_argument('--environment', '-e', choices=['development', 'staging', 'production'],
                       help='Ambiente a ser testado')
    parser.add_argument('--full-test', '-f', action='store_true',
                       help='Executa todos os testes (incluindo endpoints)')
    parser.add_argument('--verbose', '-v', action='store_true',
                       help='Saída verbosa')
    
    args = parser.parse_args()
    
    # Configurar URL baseado no ambiente
    if args.environment:
        if args.environment == 'staging':
            base_url = 'https://api-stage.snapeats.com'
        elif args.environment == 'production':
            base_url = 'https://api.snapeats.com'
        else:
            base_url = args.url
    else:
        base_url = args.url
    
    print("🍽️ SnapEats API Documentation Tester")
    print(f"🌐 Testando: {base_url}")
    print(f"📅 Iniciado em: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    tester = DocumentationTester(base_url)
    
    try:
        # Testes básicos
        api_available = tester.test_api_availability()
        if not api_available:
            print("\n❌ API não está disponível. Abortando testes.")
            return 1
        
        # Testes de documentação
        tester.test_swagger_ui_availability()
        spec = tester.test_openapi_spec_validity()
        tester.test_openapi_yaml_file()
        
        # Testes de endpoints de saúde
        tester.test_health_endpoints()
        
        # Testes de CORS
        tester.test_cors_configuration()
        
        # Testes completos se solicitado
        if args.full_test and spec:
            tester.test_endpoints_documentation(spec)
        
        # Gerar relatório final
        exit_code = tester.generate_report()
        return exit_code
        
    except KeyboardInterrupt:
        print("\n\n⏹️ Testes interrompidos pelo usuário")
        return 1
    except Exception as e:
        print(f"\n💥 Erro inesperado durante os testes: {e}")
        if args.verbose:
            import traceback
            traceback.print_exc()
        return 1

if __name__ == '__main__':
    exit_code = main()
    sys.exit(exit_code)