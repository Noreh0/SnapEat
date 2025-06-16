from flask_restx import Resource, Namespace, fields, abort
from models.usuario import UsuarioModel
from models.restaurante import restauranteModel
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt
from blacklist import BLACKLIST
from flask import jsonify, url_for, current_app
from flask_mail import Message
from itsdangerous import URLSafeTimedSerializer
import datetime

api = Namespace('auth', description='Operações de autenticação de usuários')

SECRET_KEY = 'SUA_SECRET_KEY'  # Use a mesma do Flask
serializer = URLSafeTimedSerializer(SECRET_KEY)

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
 
# resource/auth_usuario.py
@api.route('/cadastro/restaurante')
class CadastroRestaurante(Resource):
    @api.expect(restaurante_model)
    def post(self):
        dados = api.payload

        if restauranteModel.find_email_restaurante(dados['email']):
            return {"message": f"O email '{dados['email']}' já está em uso."}, 400

        dados.pop('confirmasenha', None)
        # NÃO faça hash aqui!
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

            restaurante = restauranteModel.find_email_restaurante(email)
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
@api.route('/recuperar-senha')
class RecuperarSenha(Resource):
    @api.expect(api.model('RecuperarSenha', {'email': fields.String(required=True)}))
    def post(self):
        dados = api.payload
        email = dados.get('email')
        user = UsuarioModel.find_by_email(email)
        if not user:
            return {'message': 'Se o e-mail existir, você receberá instruções para redefinir sua senha.'}, 200
        token = serializer.dumps(email, salt='recuperar-senha')
        link = url_for('auth_redefinir_senha', token=token, _external=True)
        try:
            msg = Message(
                subject="Recuperação de senha - SnapEats",
                recipients=[email],
                body=f"Olá!\n\nPara redefinir sua senha, clique no link abaixo:\n{link}\n\nSe não solicitou, ignore este e-mail."
            )
            mail = current_app.extensions['mail']
            mail.send(msg)
        except Exception as e:
            print(f"Erro ao enviar e-mail: {e}")
            print(f"Link de redefinição: {link}")
        return {'message': 'Se o e-mail existir, você receberá instruções para redefinir sua senha.'}, 200


@api.route('/redefinir-senha/<string:token>')
class RedefinirSenha(Resource):
    def get(self, token):
        from flask import redirect
        return redirect(f'http://localhost:4200/#/redefinir-senha/{token}')
    
    @api.expect(api.model('RedefinirSenha', {
        'nova_senha': fields.String(required=True, min_length=6)
    }))
    def post(self, token):
        try:
            email = serializer.loads(token, salt='recuperar-senha', max_age=3600)  # 1 hora
        except Exception:
            return {'message': 'Token inválido ou expirado.'}, 400
        user = UsuarioModel.find_by_email(email)
        if not user:
            return {'message': 'Usuário não encontrado.'}, 404
        nova_senha = api.payload.get('nova_senha')
        user.senha = nova_senha
        user.save()
        return {'message': 'Senha redefinida com sucesso.'}, 200
    
@api.route('/logout')
class logoutUsuario(Resource):
    @api.doc(security='BearerAuth')  
    @jwt_required()
    def post(self):
        jti = get_jwt()['jti']
        BLACKLIST.add(jti)
        return {"message": "Logout realizado com sucesso!"}, 200