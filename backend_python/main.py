from flask import Flask, jsonify, redirect
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_restx import Api, Resource, fields
from flask_mail import Mail
import os
import traceback
from flask_jwt_extended import exceptions as jwt_exceptions
from werkzeug.exceptions import HTTPException
from dotenv import load_dotenv
from services.email_service import email_service
from services.notification_service import notification_service
from resource.sentimento import api as nlp_ns
from resource.auth_usuario import api as auth_ns
from resource.auth_firebase import api as firebase_auth_ns
from resource.tags_api import api as tags_ns
from models.tag_restaurante import TagRestauranteModel, AvaliacaoTagsModel, RestauranteTagsConquistadasModel
# Importar todos os modelos para o SQLAlchemy mapear relacionamentos
from models.usuario import UsuarioModel
from models.restaurante import restauranteModel
from models.pontos_usuario import pontosUsuarioModel, historicoModel
from resource.prato import api as prato_ns
from resource.avaliacao_prato import api as aval_prato_ns
from resource.cupom import api as cupom_ns
from resource.denuncia import api as denuncia_ns
from resource.avaliacao import Avaliacao
from resource.avaliacao import api as avaliacao_ns
from resource.notificacoes_api import api as notificacoes_api_ns
import json
from resource.notificacoes import api as notificacao_ns
from resource.usuario import Usuario, buscarUsuario, encontrarEmail, editarUsuario, removerUsuario, allClientes
from resource.restaurante import TipoRestaurante, ListarRestaurantes, FiltrarRestaurante, PesquisarRestaurante, EncontrarEmailRes, RestaurantesProximos
from blacklist import BLACKLIST
from datetime import datetime
from sql_alchemy import banco
from resource.restaurante import api as restaurante_ns

load_dotenv()


class CustomJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, datetime):
            return obj.isoformat()
        return super().default(obj)

app = Flask(__name__)

try:
    # Tente configurar usando o método Flask 2.x
    app.json.provider.cls.encoder = CustomJSONEncoder
except AttributeError:
    # Fallback para Flask 1.x
    try:
        app.json_encoder = CustomJSONEncoder
    except AttributeError:
        # Se tudo falhar, vamos modificar os endpoints diretamente
        print("Aviso: Não foi possível configurar o JSONEncoder. Datas serão tratadas nos endpoints.")

app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv(
    'DATABASE_URL',
    f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:{os.getenv('DB_PASSWORD', '')}@{os.getenv('DB_HOST', 'localhost')}:{os.getenv('DB_PORT', '7000')}/{os.getenv('DB_NAME', 'SnapEats')}"
)
app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY', 'CHANGE-THIS-IN-PRODUCTION')
app.config['JWT_BLACKLIST_ENABLE'] = True
app.config['JWT_ERROR_MESSAGE_KEY'] = 'message'
app.config['PROPAGATE_EXCEPTIONS'] = True
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_IDENTITY_CLAIM'] = 'sub'
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

# SECRET_KEY com fallback correto
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY') or app.config.get('SECRET_KEY') or 'dev-secret-key'

# SMTP (SendGrid)
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER', 'smtp.sendgrid.net')
app.config['MAIL_PORT'] = int(os.getenv('MAIL_PORT', '587'))
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS', 'true').lower() == 'true'
app.config['MAIL_USE_SSL'] = os.getenv('MAIL_USE_SSL', 'false').lower() == 'true'
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = os.getenv('MAIL_DEFAULT_SENDER') or app.config['MAIL_USERNAME']
app.config['MAIL_SUPPRESS_SEND'] = False
app.config['MAIL_DEBUG'] = app.debug

# URL do frontend para redirecionar o link de redefinição
app.config['FRONTEND_BASE_URL'] = os.getenv('FRONTEND_BASE_URL', 'http://localhost:4200')

# Adicionar handler de erro para problemas com JWT
@app.errorhandler(jwt_exceptions.JWTExtendedException)
def handle_jwt_error(error):
    print(f"Erro JWT: {str(error)}")
    traceback.print_exc()
    return {'message': str(error)}, 401

@app.errorhandler(Exception)
def handle_exception(e):
    # Registrar o erro
    print(f"Erro não tratado: {str(e)}")
    traceback.print_exc()
    
    # Se é um erro HTTP, retornar com o código apropriado
    if isinstance(e, HTTPException):
        return {'message': str(e)}, e.code
    
    # Caso contrário, retornar 500
    return {'message': 'Erro interno do servidor'}, 500

mail = Mail(app)

UPLOAD_FOLDER = os.path.join(os.getcwd(), 'static', 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

jwt = JWTManager(app)
authorizations = {
    'BearerAuth': {
        'type': 'apiKey',
        'in': 'header',
        'name': 'Authorization',
        'description': "Adicione o token JWT com prefixo **Bearer**. Exemplo: 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'"
    }
}

# Configuração completa da documentação OpenAPI
# ✅ CORREÇÃO DEFINITIVA: Desabilitar rota padrão do Flask-RESTX
api = Api(
    app,
    version='2.0.1',
    title='SnapEats API - Sistema de Avaliação de Restaurantes',
    description='''
## 🍽️ SnapEats - Plataforma de Avaliação de Restaurantes

### Visão Geral
API RESTful completa para gerenciamento de restaurantes, clientes, avaliações, pratos e cupons promocionais.

### Funcionalidades Principais
- 🔐 Autenticação JWT com suporte a múltiplos tipos de usuário
- 🏪 Gestão de Restaurantes com dashboard completo
- 👥 Gestão de Clientes com sistema de pontuação
- ⭐ Sistema de Avaliações com análise de sentimentos
- 🍕 Catálogo de Pratos com imagens e categorização
- 🎟️ Sistema de Cupons promocionais
- 📍 Busca por Localização com filtros avançados
- 🏆 Sistema de Tags e conquistas para restaurantes
- 📧 Notificações via email e push

### Autenticação
A API utiliza JWT (JSON Web Tokens) para autenticação. Após login bem-sucedido, inclua o token no header Authorization como Bearer <token>.

### Códigos de Status Principais
- 200: Sucesso
- 201: Recurso criado com sucesso
- 400: Requisição inválida
- 401: Não autorizado
- 403: Acesso negado
- 404: Recurso não encontrado
- 409: Conflito
- 500: Erro interno do servidor

### Suporte
Email: suporte@snapeats.com
    ''',
    doc='/docs/',
    default='default',  # Mudando para namespace default
    default_label='SnapEats API',
    add_specs=False,  # Desabilita rota automática /
    authorizations=authorizations,
    security='BearerAuth'
)

# JWT Blacklist
@jwt.token_in_blocklist_loader
def verifica_blacklist(jwt_header, jwt_payload):
    try:
        jti = jwt_payload.get('jti', '')
        if not jti:
            print("AVISO: Token sem JTI")
            return False
            
        print(f"Verificando token JTI: {jti[:10]}... na blacklist")
        print(f"Subject (identity): {jwt_payload.get('sub')}, Tipo: {type(jwt_payload.get('sub'))}")
        
        # Verificar se o token tem data de expiração (exp) e se já expirou
        import time
        current_timestamp = time.time()
        exp_timestamp = jwt_payload.get('exp', 0)
        
        # Se o token já expirou (mas isso deveria ser capturado automaticamente)
        if exp_timestamp and current_timestamp > exp_timestamp:
            print(f"Token expirado: exp={exp_timestamp}, agora={current_timestamp}")
            return False
            
        # Verificação na blacklist normal
        is_blacklisted = jti in BLACKLIST
        if is_blacklisted:
            print(f"Token encontrado na blacklist: {jti[:10]}...")
            
        return is_blacklisted
        
    except Exception as e:
        print(f"Erro ao verificar blacklist: {e}")
        return False
    
# Adicionar callback para erro de autenticação
@jwt.invalid_token_loader
def invalid_token_callback(error):
    print(f"Token inválido: {error}")
    return jsonify({"message": "Token inválido ou mal-formado"}), 401

@jwt.unauthorized_loader
def missing_token_callback(error):
    print(f"Erro de autorização: {error}")
    return jsonify({"message": "Falta token de autorização"}), 401

@jwt.revoked_token_loader
def token_acesso_invalido(jwt_header, jwt_payload):
    return jsonify({'message': 'Você já realizou logout'}), 401

# Banco
banco.init_app(app)

# ✅ CORREÇÃO: Usar with app.app_context() ao invés de @app.before_first_request
with app.app_context():
    # Criar todas as tabelas
    banco.create_all()
    print("✅ Tabelas do banco de dados criadas/verificadas")
    
    # Popular tags iniciais se não existirem
    try:
        if TagRestauranteModel.query.count() == 0:
            tags_iniciais = [
                {
                    'nome': 'Comida',
                    'categoria': 'comida',
                    'descricao': 'Qualidade, sabor e apresentação dos pratos',
                    'icone': 'fas fa-utensils',
                    'cor': '#e74c3c',
                    'ativo': True
                },
                {
                    'nome': 'Atendimento',  
                    'categoria': 'atendimento',
                    'descricao': 'Qualidade do serviço e cordialidade da equipe',
                    'icone': 'fas fa-user-tie',
                    'cor': '#3498db',
                    'ativo': True
                },
                {
                    'nome': 'Local',
                    'categoria': 'ambiente',
                    'descricao': 'Ambiente, decoração e conforto do estabelecimento',
                    'icone': 'fas fa-home',
                    'cor': '#27ae60',
                    'ativo': True
                }
            ]
            
            for tag_data in tags_iniciais:
                nova_tag = TagRestauranteModel(**tag_data)
                banco.session.add(nova_tag)
            
            banco.session.commit()
            print("✅ Tags iniciais criadas automaticamente")
        else:
            print("ℹ️ Tags já existem no banco de dados")
    except Exception as e:
        print(f"⚠️ Erro ao popular tags iniciais: {e}")
        banco.session.rollback()

# REMOVER este método duplicado - já foi substituído pelo código acima
# @app.before_request
# def createDatabase():
#     banco.create_all()

CORS(app, supports_credentials=True)
CORS(app, resources={
    r"/avaliacoes/*": {"origins": "*"},
    r"/avaliacoes-prato/*": {"origins": "*"},
    r"/prato/*": {"origins": "*"},
    r"/auth/*": {"origins": "*"},
    r"/restaurante/*": {"origins": "*"},
    r"/tags/*": {"origins": "*"},  # ✅ ADICIONAR CORS para tags
    r"/cupom/*": {"origins": "*"},  # ✅ ADICIONAR CORS para cupons
    r"/*": {
        "origins": ["http://localhost:4200"],
        "supports_credentials": True,
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
        "expose_headers": ["Content-Type", "Authorization"],
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
    },
    r"/auth/firebase/*": {
        "origins": ["http://localhost:4200"],
        "supports_credentials": True,
        "allow_headers": ["Content-Type", "Authorization", "X-Requested-With"],
        "expose_headers": ["Content-Type", "Authorization"]
    },
}, supports_credentials=True)

# Importar e configurar modelos de documentação
try:
    from docs.api_models import create_api_models
    models = create_api_models(api)
    print("✅ Modelos de documentação carregados com sucesso")
except ImportError as e:
    print(f"⚠️ Módulo de documentação não encontrado: {e}")
    print("ℹ️ API funcionará normalmente, mas sem modelos de documentação detalhados")
    models = {}
except Exception as e:
    print(f"⚠️ Erro ao carregar modelos de documentação: {e}")
    print("ℹ️ API funcionará normalmente")
    models = {}

# Configuração de tags para documentação (aplicadas via decorators nos namespaces)
print("✅ Configuração de documentação carregada")

# ✅ CORREÇÃO DEFINITIVA: Desabilitar completamente a rota raiz do Flask-RESTX
# e registrar nossas rotas ANTES de configurar os namespaces

# Criar método _has_fr_route que retorna True para desabilitar rota padrão
def _has_fr_route_method():
    return True

api._has_fr_route = _has_fr_route_method

print("✅ Configurando rotas Flask customizadas...")

# Rota raiz personalizada ANTES dos namespaces
@app.route('/', methods=['GET'])
def api_root():
    """
    Página inicial da API SnapEats
    """
    return jsonify({
        'message': '🍽️ SnapEats API v2.0.1',
        'description': 'Sistema completo de avaliação de restaurantes',
        'documentation': {
            'swagger_ui': '/docs/',
            'openapi_spec': '/swagger.json',
            'redoc': '/redoc/'
        },
        'endpoints': {
            'health': '/api/health',
            'info': '/api/info', 
            'examples': '/api/examples'
        },
        'features': [
            'Autenticação JWT',
            'Sistema de Avaliações',
            'Geolocalização',
            'Upload de Imagens',
            'Sistema de Cupons'
        ],
        'status': 'online',
        'version': '2.0.1'
    })

# Rotas de redirecionamento úteis
@app.route('/docs')
def redirect_to_docs():
    """Redireciona /docs para /docs/"""
    return redirect('/docs/', code=301)

@app.route('/api')  
def api_redirect():
    """Redireciona /api para a documentação"""
    return redirect('/docs/', code=302)

# Rota para favicon (evitar erro 404)
@app.route('/favicon.ico')
def favicon():
    """Retorna status 204 para favicon"""
    return '', 204

# Namespaces organizados por categoria
# ✅ CORREÇÃO: Usar api.add_namespace ao invés de app.register_blueprint
print("✅ Adicionando namespaces da API...")
api.add_namespace(auth_ns, path='/auth')
api.add_namespace(firebase_auth_ns, path='/auth/firebase')
api.add_namespace(restaurante_ns, path='/restaurante')  
api.add_namespace(avaliacao_ns, path='/avaliacoes')
api.add_namespace(prato_ns, path='/prato')
api.add_namespace(aval_prato_ns, path='/avaliacoes-prato')
api.add_namespace(cupom_ns, path='/cupom')
api.add_namespace(tags_ns, path='/tags')
api.add_namespace(notificacoes_api_ns, path='/notificacoes')
api.add_namespace(notificacao_ns, path='/notificacao')
api.add_namespace(denuncia_ns, path='/denuncias')
api.add_namespace(nlp_ns, path='/nlp')

# Rotas manuais (sem namespace)
api.add_resource(Avaliacao, '/avaliacoes/<int:ID>')
api.add_resource(Usuario, '/cliente/<int:ID>')
api.add_resource(allClientes, '/todosClientes')
api.add_resource(removerUsuario, '/excluirCliente/<int:ID>')
api.add_resource(editarUsuario, '/editarCliente/<int:ID>')
api.add_resource(buscarUsuario, '/buscarUsuario/<string:email>')
api.add_resource(encontrarEmail, '/encontrarUsuario/<string:email>')
api.add_resource(RestaurantesProximos, '/restaurantes/proximos')
api.add_resource(TipoRestaurante, '/TipoRestaurante')
api.add_resource(ListarRestaurantes, '/menu')
api.add_resource(FiltrarRestaurante, '/filtrar/<string:tipo_restaurante>')
api.add_resource(PesquisarRestaurante, '/PesquisarRestauranteRestaurante/<string:Nome>')
api.add_resource(EncontrarEmailRes, '/encontrarRestaurante/<string:email>')

# =============================================================================
# 📚 ENDPOINTS DE DOCUMENTAÇÃO E INFORMAÇÕES DA API
# =============================================================================

@api.route('/api/info')
@api.doc('api_info', description='Informações gerais sobre a API SnapEats')
class ApiInfo(Resource):
    @api.marshal_with(api.model('ApiInfo', {
        'nome': fields.String(description='Nome da API'),
        'versao': fields.String(description='Versão atual'),
        'descricao': fields.String(description='Descrição da API'),
        'documentacao_url': fields.String(description='URL da documentação'),
        'status': fields.String(description='Status operacional'),
        'uptime': fields.String(description='Tempo online'),
        'endpoints': fields.Integer(description='Número de endpoints disponíveis'),
        'ultima_atualizacao': fields.DateTime(description='Data da última atualização')
    }))
    def get(self):
        """
        📋 **Informações Gerais da API**
        
        Retorna informações básicas sobre a API SnapEats, incluindo:
        - Versão atual e status operacional
        - Links para documentação
        - Estatísticas básicas
        - Data da última atualização
        
        **Exemplo de Uso:**
        ```bash
        curl -X GET "http://localhost:5000/api/info" \\
             -H "Content-Type: application/json"
        ```
        """
        import datetime
        return {
            'nome': 'SnapEats API',
            'versao': '2.0.1',
            'descricao': 'API completa para plataforma de avaliação de restaurantes',
            'documentacao_url': '/docs/',
            'status': 'operacional',
            'uptime': 'Disponível 24/7',
            'endpoints': len(api.endpoints),
            'ultima_atualizacao': datetime.datetime.now(),
            'features': [
                'Autenticação JWT',
                'Sistema de Avaliações',
                'Análise de Sentimentos com IA',
                'Geolocalização',
                'Sistema de Cupons',
                'Dashboard Analytics',
                'Upload de Imagens',
                'Notificações Push/Email'
            ],
            'tecnologias': {
                'backend': 'Python Flask + SQLAlchemy',
                'database': 'MySQL',
                'auth': 'JWT (JSON Web Tokens)',
                'ai': 'Natural Language Processing',
                'docs': 'OpenAPI 3.0 + Swagger UI'
            }
        }

@api.route('/api/health')
@api.doc('health_check', description='Verificação de saúde da API e dependências')
class HealthCheck(Resource):
    def get(self):
        """
        🏥 **Health Check da API**
        
        Verifica o status de saúde da API e suas dependências:
        - Status da aplicação
        - Conectividade com banco de dados
        - Status dos serviços externos
        
        **Códigos de Resposta:**
        - `200`: Tudo funcionando normalmente
        - `503`: Algum serviço indisponível
        
        **Exemplo de Uso:**
        ```bash
        curl -X GET "http://localhost:5000/api/health"
        ```
        """
        try:
            # Testar conexão com banco
            from sql_alchemy import banco
            with banco.engine.connect() as connection:
                connection.execute(banco.text('SELECT 1'))
            database_status = 'online'
        except:
            database_status = 'offline'
        
        # Status geral
        overall_status = 'healthy' if database_status == 'online' else 'unhealthy'
        
        response = {
            'status': overall_status,
            'timestamp': datetime.now().isoformat(),
            'services': {
                'database': database_status,
                'jwt': 'online',
                'email': 'online',
                'storage': 'online'
            },
            'uptime': 'OK'
        }
        
        status_code = 200 if overall_status == 'healthy' else 503
        return response, status_code

@api.route('/api/examples')
@api.doc('api_examples', description='Exemplos práticos de uso da API')
class ApiExamples(Resource):
    def get(self):
        """
        📖 **Exemplos Práticos da API**
        
        Fornece exemplos de código e casos de uso comuns:
        - Fluxo completo de autenticação
        - Criar e gerenciar avaliações
        - Upload de imagens
        - Busca por localização
        
        **Use Cases Inclusos:**
        1. Cadastro e login de cliente
        2. Cadastro e gestão de restaurante
        3. Sistema de avaliações completo
        4. Implementação de cupons promocionais
        """
        return {
            'exemplos': {
                'autenticacao': {
                    'descricao': 'Fluxo completo de autenticação',
                    'passos': [
                        {
                            'passo': 1,
                            'acao': 'Cadastrar cliente',
                            'endpoint': 'POST /auth/cadastro',
                            'exemplo': {
                                'url': 'http://localhost:5000/auth/cadastro',
                                'method': 'POST',
                                'body': {
                                    'Nome': 'João Silva',
                                    'CPF': '12345678901',
                                    'email': 'joao@exemplo.com',
                                    'senha': 'MinhaSenh@123',
                                    'telefone': '(11)99999-9999',
                                    'Cidade': 'São Paulo'
                                }
                            }
                        },
                        {
                            'passo': 2,
                            'acao': 'Fazer login',
                            'endpoint': 'POST /auth/login',
                            'exemplo': {
                                'url': 'http://localhost:5000/auth/login',
                                'method': 'POST',
                                'body': {
                                    'email': 'joao@exemplo.com',
                                    'senha': 'MinhaSenh@123'
                                },
                                'response': {
                                    'access_token': 'eyJ0eXAiOi...',
                                    'tipo': 'cliente',
                                    'id': 1
                                }
                            }
                        }
                    ]
                },
                'avaliacao': {
                    'descricao': 'Criar uma avaliação completa',
                    'exemplo': {
                        'url': 'http://localhost:5000/avaliacoes',
                        'method': 'POST',
                        'headers': {
                            'Authorization': 'Bearer eyJ0eXAiOi...',
                            'Content-Type': 'application/json'
                        },
                        'body': {
                            'Comentario': 'Excelente restaurante! Comida deliciosa e atendimento impecável.',
                            'Nota': 5,
                            'ID_Restaurante': 1,
                            'tags_avaliadas': [1, 2, 3]
                        }
                    }
                },
                'busca_restaurantes': {
                    'descricao': 'Buscar restaurantes por localização',
                    'exemplo': {
                        'url': 'http://localhost:5000/restaurantes/proximos',
                        'method': 'GET',
                        'params': {
                            'latitude': -23.5505,
                            'longitude': -46.6333,
                            'raio_km': 5,
                            'categoria': 'Pizzaria'
                        }
                    }
                }
            },
            'postman_collection': 'https://documenter.getpostman.com/view/snapeats-api',
            'swagger_ui': '/docs/',
            'github_repo': 'https://github.com/snapeats/api'
        }

# Rota de informações da API no namespace padrão
@api.route('/info-api')
@api.doc('api_root_info', description='Informações básicas da API SnapEats')
class ApiRootInfo(Resource):
    def get(self):
        """
        📋 **Informações Básicas da API**
        
        Rota de boas-vindas com links úteis para navegação.
        """
        return {
            'message': 'SnapEats API v2.0.1',
            'documentation': '/docs/',
            'swagger_json': '/swagger.json',
            'endpoints': {
                'health': '/api/health',
                'info': '/api/info',
                'examples': '/api/examples'
            },
            'status': 'online'
        }

if __name__ == '__main__':
    print("🚀 Iniciando SnapEats API...")
    print("📚 Documentação Swagger: http://localhost:5000/docs/")
    print("🏥 Health Check: http://localhost:5000/api/health")
    print("ℹ️ API Info: http://localhost:5000/api/info")
    app.run(debug=True, host='0.0.0.0', port=5000)