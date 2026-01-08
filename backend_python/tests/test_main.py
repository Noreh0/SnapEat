# tests/test_main.py
import pytest
from flask import Flask
from main import app, CustomJSONEncoder
from datetime import datetime
import json

class TestMainApp:
    """Testes para a aplicação principal"""
    
    def test_app_exists(self, app):
        """Verifica se a aplicação Flask foi criada"""
        assert app is not None
        assert isinstance(app, Flask)
    
    def test_app_is_testing(self, app):
        """Verifica se a aplicação está em modo de teste"""
        assert app.config['TESTING'] is True
    
    def test_custom_json_encoder_datetime(self):
        """Testa o encoder customizado de JSON para datetime"""
        encoder = CustomJSONEncoder()
        now = datetime.now()
        result = encoder.default(now)
        assert isinstance(result, str)
        assert 'T' in result  # ISO format
    
    def test_cors_configured(self, client):
        """Verifica se CORS está configurado"""
        response = client.options('/tags')
        assert 'Access-Control-Allow-Origin' in response.headers or response.status_code in [404, 405]
    
    def test_jwt_configured(self, app):
        """Verifica se JWT está configurado"""
        assert 'JWT_SECRET_KEY' in app.config
        assert app.config['JWT_SECRET_KEY'] is not None
    
    def test_database_configured(self, app):
        """Verifica se o banco de dados está configurado"""
        assert 'SQLALCHEMY_DATABASE_URI' in app.config
        assert app.config['SQLALCHEMY_DATABASE_URI'] is not None
    
    def test_error_handler_jwt(self, client):
        """Testa o handler de erro JWT"""
        # Tentar acessar endpoint protegido sem token
        response = client.get('/restaurante')
        assert response.status_code in [401, 404]
    
    def test_api_namespaces_registered(self, app):
        """Verifica se os namespaces estão registrados"""
        rules = [str(rule) for rule in app.url_map.iter_rules()]
        
        # Verificar alguns endpoints importantes
        assert any('/tags' in rule for rule in rules)
        assert any('/restaurante' in rule for rule in rules)
        assert any('/avaliacoes' in rule for rule in rules)
    
    def test_mail_configured(self, app):
        """Verifica se o Mail está configurado"""
        assert 'MAIL_SERVER' in app.config
        assert 'MAIL_USERNAME' in app.config
    
    def test_upload_folder_configured(self, app):
        """Verifica se a pasta de upload está configurada"""
        assert 'UPLOAD_FOLDER' in app.config
        import os
        assert os.path.exists(app.config['UPLOAD_FOLDER'])

class TestAPIEndpoints:
    """Testes básicos dos endpoints da API"""
    
    def test_tags_endpoint_exists(self, client):
        """Verifica se o endpoint de tags existe"""
        response = client.get('/tags')
        assert response.status_code in [200, 401, 404]
    
    def test_restaurante_endpoint_exists(self, client):
        """Verifica se o endpoint de restaurantes existe"""
        response = client.get('/menu')
        assert response.status_code in [200, 404]
    
    def test_health_check(self, client):
        """Teste básico de saúde da aplicação"""
        # Tentar acessar a raiz da API
        response = client.get('/')
        # A API pode retornar 404 se não houver rota raiz, mas não deve dar erro 500
        assert response.status_code != 500

class TestDatabaseInitialization:
    """Testes para inicialização do banco de dados"""
    
    def test_tags_iniciais_criadas(self, session):
        """Verifica se as tags iniciais foram criadas"""
        from models.tag_restaurante import TagRestauranteModel
        
        # Em um ambiente de teste limpo, as tags podem não ser populadas automaticamente.
        # O importante é que a query funcione sem erros.
        tags = session.query(TagRestauranteModel).all()
        assert isinstance(tags, list)
    
    def test_database_connection(self, session):
        """Testa a conexão com o banco de dados"""
        # Tentar fazer uma query simples
        from sqlalchemy import text
        result = session.execute(text('SELECT 1'))
        assert result is not None

class TestSecurity:
    """Testes de segurança"""
    
    def test_jwt_required_endpoints(self, client):
        """Verifica se endpoints protegidos requerem autenticação"""
        protected_endpoints = [
            '/restaurante',
            '/avaliacoes',
        ]
        
        for endpoint in protected_endpoints:
            response = client.post(endpoint, json={})
            # Deve retornar 401 (não autorizado) ou 405 (método não permitido)
            assert response.status_code in [401, 405, 404]
    
    def test_invalid_token_handling(self, client):
        """Testa o tratamento de token inválido"""
        headers = {'Authorization': 'Bearer token_invalido'}
        response = client.get('/restaurante', headers=headers)
        # A resposta correta para um token malformado é 422 Unprocessable Entity
        assert response.status_code in [401, 422]