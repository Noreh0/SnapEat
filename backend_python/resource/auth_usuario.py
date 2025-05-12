from flask_restx import Resource, Namespace, fields
from models.usuario import UsuarioModel
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt
from blacklist import BLACKLIST
from flask import jsonify
import datetime

api = Namespace('auth', description='Operações de autenticação de usuários')

usuario_model = api.model('Usuario', {
    'Nome': fields.String(required=True, description='Nome do usuário'),
    'CPF': fields.String(required=True, description='CPF do usuário'),
    'email': fields.String(required=True, description='Email do usuário'),
    'senha': fields.String(required=True, description='Senha do usuário'),
    'telefone': fields.String(required=True, description='Telefone do usuário'),
    'Cidade': fields.String(required=True, description='Cidade do usuário'),
})


"""atributos = reqparse.RequestParser()
atributos.add_argument('Nome', type=str, required=True, help="O campo 'Nome' não pode ser deixado em branco!", location='json')
atributos.add_argument('CPF', type=str, required=True, location='json')
atributos.add_argument('email', type=str, required=True, location='json')
atributos.add_argument('senha', type=str, required=True, location='json')
atributos.add_argument('telefone', type=str, required=True, location='json')
atributos.add_argument('Cidade', type=str, required=True, location='json')"""


"""parser_login = reqparse.RequestParser()
parser_login.add_argument('email', type=str, required=True)
parser_login.add_argument('senha', type=str, required=True)"""
login_model = api.model('Login', {
    'email': fields.String(required=True, description='Email do usuário'),
    'senha': fields.String(required=True, description='Senha do usuário'),
})


@api.route('/cadastro')
class CadastroCliente(Resource):
    @api.expect(usuario_model)
    def post(self):
        dados = api.payload  # <- recebe automaticamente o JSON

        if UsuarioModel.find_by_email(dados['email']):
            return {"message": f"O email '{dados['email']}' já está em uso."}, 400

        usuario = UsuarioModel(**dados)
        usuario.save()
        return {"message": "Usuário criado com sucesso!"}, 201


@api.route('/login')
class loginUsuario(Resource):
    @api.expect(login_model)
    def post(self):
        dados = api.payload
        usuario = UsuarioModel.find_by_email(dados['email'])
        if usuario and usuario.verificar_senha(dados['senha']):
            token = create_access_token(identity=usuario.ID, expires_delta=datetime.timedelta(hours=2))
            return {"access_token": token}, 200

        return {"message": "Email ou senha inválidos!"}, 401




@api.route('/logout')
class logoutUsuario(Resource):
    @api.doc(security='BearerAuth')  
    @jwt_required()
    def post(self):
        jti = get_jwt()['jti']
        BLACKLIST.add(jti)
        return {"message": "Logout realizado com sucesso!"}, 200