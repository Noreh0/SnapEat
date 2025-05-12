from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_cors import CORS
from flask_restx import Api
from resource.auth_usuario import api as auth_ns
from resource.avaliacao import Avaliacoes, Avaliacao, criarAvaliacao, encontrarAvaliacao, encontrarAvaliacaoCliente, removerAvaliacao, editarAvaliacao, allAvaliacoes
from resource.usuario import Usuario, buscarUsuario, encontrarEmail, editarUsuario, removerUsuario, allClientes
from resource.restaurante import Restaurante, CadastroRestaurante, LoginRestaurante, LogoutRestaurante, TipoRestaurante, ListarRestaurantes, FiltrarRestaurante, PesquisarRestaurante, BuscarRestaurante, EncontrarEmailRes, EditarRestaurante, RemoverRestaurante
from blacklist import BLACKLIST
from sql_alchemy import banco

app = Flask(__name__)
CORS(app)

app.config['SQLALCHEMY_DATABASE_URI'] = 'mysql+pymysql://root:SnapEats17@192.168.1.101:7000/SnapEats'
app.config['JWT_SECRET_KEY'] = 'SENHA SEGURA, NÃO COMPARTILHE'
app.config['JWT_BLACKLIST_ENABLE'] = True

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

# Namespaces
api.add_namespace(auth_ns, path='/auth')

# Rotas manuais (sem namespace)
api.add_resource(Avaliacoes, '/avaliacoes')
api.add_resource(Avaliacao, '/avaliacoes/<int:ID>')
api.add_resource(allAvaliacoes, '/todasAvaliacoes')
api.add_resource(editarAvaliacao, '/editarAvaliacao/<int:ID>')
api.add_resource(removerAvaliacao, '/excluirAvaliacao/<int:ID>')
api.add_resource(criarAvaliacao, '/avaliando')
api.add_resource(Usuario, '/cliente/<int:ID>')
api.add_resource(allClientes, '/todosClientes')
api.add_resource(removerUsuario, '/excluirCliente/<int:ID>')
api.add_resource(editarUsuario, '/editarCliente/<int:ID>')
api.add_resource(buscarUsuario, '/buscarUsuario/<string:email>')
api.add_resource(encontrarEmail, '/encontrarUsuario/<string:email>')

api.add_resource(Restaurante, '/restaurante')
api.add_resource(CadastroRestaurante, '/CadastroRestaurante')
api.add_resource(RemoverRestaurante, '/excluirRestaurante/<int:ID>')
api.add_resource(LoginRestaurante, '/LoginRestaurante')
api.add_resource(LogoutRestaurante, '/LogoutRestaurante')
api.add_resource(TipoRestaurante, '/TipoRestaurante')
api.add_resource(ListarRestaurantes, '/menu')
api.add_resource(FiltrarRestaurante, '/filtrar/<string:TipoRestaurante>')
api.add_resource(BuscarRestaurante, '/BuscarRestaurante/<string:email>')
api.add_resource(PesquisarRestaurante, '/PesquisarRestauranteRestaurante/<string:Nome>')
api.add_resource(EncontrarEmailRes, '/encontrarRestaurante/<string:email>')
api.add_resource(EditarRestaurante, '/EditarRestaurante/<int:ID>')
api.add_resource(encontrarAvaliacao, '/encontraAvaliacao/<int:ID_Restaurante>')
api.add_resource(encontrarAvaliacaoCliente, '/encontraAvaliacaoCliente/<int:ID_Cliente>')

if __name__ == '__main__':
    app.run(debug=True)
