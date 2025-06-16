from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_restx import Api
from flask_mail import Mail
import os
from resource.auth_usuario import api as auth_ns
from resource.prato import api as prato_ns
from resource.avaliacao_prato import api as aval_prato_ns
from resource.avaliacao import Avaliacao #, AvaliacaoList, AvaliacoesPorCliente, AvaliacoesPorRestaurante
from resource.avaliacao import api as avaliacao_ns
from resource.usuario import Usuario, buscarUsuario, encontrarEmail, editarUsuario, removerUsuario, allClientes
from resource.restaurante import TipoRestaurante, ListarRestaurantes, FiltrarRestaurante, PesquisarRestaurante, BuscarRestaurante, EncontrarEmailRes
from blacklist import BLACKLIST
from sql_alchemy import banco
from resource.restaurante import api as restaurante_ns

app = Flask(__name__)


app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:SnapEats17@localhost:7000/SnapEats'
app.config['JWT_SECRET_KEY'] = 'SENHA SEGURA, NÃO COMPARTILHE'
app.config['JWT_BLACKLIST_ENABLE'] = True

app.config['MAIL_SERVER'] = 'localhost'  # ou outro SMTP
app.config['MAIL_PORT'] = 1025
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = None  # seu e-mail
app.config['MAIL_PASSWORD'] = None         # sua senha ou app password
app.config['MAIL_DEFAULT_SENDER'] = 'no-reply@snapeats.com'

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
        'description': "Adicione o token com prefixo **Bearer**. Exemplo: 'Bearer <seu_token_aqui>'"
    }
}
api = Api(
    app,
    version='1.0',
    title='API SnapEats',
    description='Documentação da API com Flask-RESTX para OpenAPI',
    authorizations=authorizations,
    security='BearerAuth'   # Aplica por padrão a todas as operações (opcional)
)

# JWT Blacklist
@jwt.token_in_blocklist_loader
def verifica_blacklist(_, token):
    return token['jti'] in BLACKLIST

@jwt.revoked_token_loader
def token_acesso_invalido(jwt_header, jwt_payload):
    return jsonify({'message': 'Você já realizou logout'}), 401

# Banco
@app.before_request
def createDatabase():
    banco.create_all()

banco.init_app(app)
CORS(app)
CORS(app, resources={
    r"/avaliacoes/*": {"origins": "*"},
    r"/avaliacoes-prato/*": {"origins": "*"},
    r"/prato/*": {"origins": "*"},
    r"/auth/*": {"origins": "*"},
    r"/restaurante/*": {"origins": "*"}
}, supports_credentials=True)
# Namespaces

api.add_namespace(auth_ns, path='/auth')
api.add_namespace(prato_ns, path='/prato')
api.add_namespace(restaurante_ns, path='/restaurante')
api.add_namespace(avaliacao_ns, path='/avaliacoes')
api.add_namespace(aval_prato_ns, path='/avaliacoes-prato')
# Rotas manuais (sem namespace)
api.add_resource(Avaliacao, '/avaliacoes/<int:ID>')
api.add_resource(Usuario, '/cliente/<int:ID>')
api.add_resource(allClientes, '/todosClientes')
api.add_resource(removerUsuario, '/excluirCliente/<int:ID>')
api.add_resource(editarUsuario, '/editarCliente/<int:ID>')
api.add_resource(buscarUsuario, '/buscarUsuario/<string:email>')
api.add_resource(encontrarEmail, '/encontrarUsuario/<string:email>')

api.add_resource(TipoRestaurante, '/TipoRestaurante')
api.add_resource(ListarRestaurantes, '/menu')
api.add_resource(FiltrarRestaurante, '/filtrar/<string:tipo_restaurante>')
api.add_resource(BuscarRestaurante, '/BuscarRestaurante/<string:email>')
api.add_resource(PesquisarRestaurante, '/PesquisarRestauranteRestaurante/<string:Nome>')
api.add_resource(EncontrarEmailRes, '/encontrarRestaurante/<string:email>')

if __name__ == '__main__':
    app.run(debug=True)
