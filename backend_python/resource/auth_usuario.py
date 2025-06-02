from flask_restx import Resource, Namespace, fields, abort
from models.usuario import UsuarioModel
from models.restaurante import restauranteModel
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

restaurante_model = api.model('Restaurante', {
    'Nome': fields.String(required=True),
    'CNPJ': fields.String(required=True),
    'email': fields.String(required=True),
    'senha': fields.String(required=True),
    'telefone': fields.String(required=True),
    'Endereco': fields.String(required=True),
    'Cidade': fields.String(required=True),
    'tipo_restaurante': fields.String(required=True),
    'descricao': fields.String(required=True),
})


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
        # Remover o campo que não faz parte do model
        dados.pop('confirmasenha', None)

        usuario = UsuarioModel(**dados)
        usuario.save()
        return {"message": "Usuário criado com sucesso!"}, 201
 
@api.route('/cadastro/restaurante')
class CadastroRestaurante(Resource):
    @api.expect(restaurante_model)
    def post(self):
        dados = api.payload

        if restauranteModel.find_email_restaurante(dados['email']):
            return {"message": f"O email '{dados['email']}' já está em uso."}, 400

        dados.pop('confirmasenha', None)
        dados['senha'] = generate_password_hash(dados['senha'])
        
        restaurante = restauranteModel(**dados)
        restaurante.save_restaurante()
        return {"message": "Restaurante criado com sucesso!"}, 201

# auth_usuario.py (Flask)
# resource/auth_usuario.py

@api.route('/login')
class Login(Resource):
    @api.expect(login_model)
    def post(self):
        """
        Primeiro tenta logar como Cliente. Se não achar cliente (ou a senha não bater),
        então tenta logar como Restaurante. Se nenhum der certo, retorna 401.
        """
        dados = api.payload or {}
        email = dados.get('email')
        senha = dados.get('senha')

        if not email or not senha:
            # Caso o payload chegue vazio ou sem um dos campos
            abort(400, "Você precisa enviar 'email' e 'senha' no corpo da requisição.")

        # 1) Tenta encontrar um cliente com esse e-mail
        usuario = UsuarioModel.find_by_email(email)
        # Debug temporário (remova em produção)
        print("user encontrado:", usuario)
        if usuario and usuario.verificar_senha(senha):
            id_var = usuario.ID
            tipo  = 'cliente'
        else:
            # 2) Como não encontrou cliente válido, tenta encontrar o restaurante
            restaurante = restauranteModel.find_email_restaurante(email)
            # Debug temporário (remova em produção)
            print("Login recebido:", dados)
            print("restaurante encontrado:", restaurante)

            if restaurante and check_password_hash(restaurante.senha_hash, senha):
                id_var = restaurante.ID
                tipo  = 'restaurante'
            else:
                # Nem cliente nem restaurante bateram (ou a senha não confere)
                return {'message': 'E-mail ou senha inválidos.'}, 401

        # 3) Se chegou até aqui, temos um ID válido (cliente ou restaurante) e um tipo.
        #    Geramos token JWT com identity=ID e uma claim extra 'tipo'.
        token = create_access_token(
            identity=id_var,
            additional_claims={'tipo': tipo},
            expires_delta=datetime.timedelta(hours=2)
        )

        return {'access_token': token, 'tipo': tipo}, 200

@api.route('/logout')
class logoutUsuario(Resource):
    @api.doc(security='BearerAuth')  
    @jwt_required()
    def post(self):
        jti = get_jwt()['jti']
        BLACKLIST.add(jti)
        return {"message": "Logout realizado com sucesso!"}, 200