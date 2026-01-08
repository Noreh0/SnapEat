# resource/auth_firebase.py
from flask_restx import Resource, Namespace, fields, abort
from flask import request
from models.usuario import UsuarioModel
from models.restaurante import restauranteModel
from resource.firebase_config import verify_firebase_token
from flask_jwt_extended import create_access_token
from werkzeug.security import generate_password_hash
from sqlalchemy.exc import IntegrityError
import datetime
# Add these at the top of the file:
import secrets
import datetime

api = Namespace('auth/firebase', description='Operações de autenticação com Firebase')

firebase_login_model = api.model('FirebaseLogin', {
    'firebaseUser': fields.Raw(required=True, description='Objeto de usuário do Firebase'),
    'idToken': fields.String(required=True, description='Token ID do Firebase')
})

complementar_cliente_model = api.model('ComplementarCliente', {
    'dados': fields.Raw(required=True, description='Dados complementares do cliente'),
    'idToken': fields.String(required=True, description='Token ID do Firebase')
})

complementar_restaurante_model = api.model('ComplementarRestaurante', {
    'dados': fields.Raw(required=True, description='Dados complementares do restaurante'),
    'idToken': fields.String(required=True, description='Token ID do Firebase')
})

@api.route('/login')
class FirebaseLogin(Resource):
    @api.expect(firebase_login_model)
    def post(self):
        """
        Verifica o token Firebase e loga/cria usuário no sistema
        """
        dados = api.payload or {}
        
        # Verificar o token do Firebase
        try:
            id_token = dados.get('idToken')
            firebase_user = verify_firebase_token(id_token)
            
            # Se chegou até aqui, o token é válido
            uid = firebase_user['uid']
            email = firebase_user.get('email', '')
            nome = firebase_user.get('name', '')
            
            # Verificar se o usuário já existe no sistema
            cliente = UsuarioModel.find_by_email(email)
            restaurante = restauranteModel.find_email_restaurante(email)
            
            # Se não existe nenhum usuário com este email, precisa de dados complementares
            if not cliente and not restaurante:
                print(f"Usuário {email} não encontrado, redirecionando para cadastro complementar")
                return {
                    'requiresAdditionalInfo': True,
                    'suggestedType': 'cliente',  # Tipo padrão sugerido
                    'email': email,
                    'name': firebase_user.get('name', ''),
                    'firebase_uid': uid
                }, 200
            
            # Se existe cliente ou restaurante, gera token JWT
            if cliente:
                # Atualizar o firebase_uid se não estiver definido
                if not cliente.firebase_uid:
                    cliente.firebase_uid = uid
                    cliente.save()
                
                token = create_access_token(
                    identity=str(cliente.ID),
                    additional_claims={'tipo': 'cliente', 'firebase_uid': uid},
                    expires_delta=datetime.timedelta(hours=12)
                )
                return {
                    'access_token': token,
                    'tipo': 'cliente',
                    'id': cliente.ID,
                    'nome': cliente.Nome
                }, 200

            elif restaurante:
                # Atualizar o firebase_uid se não estiver definido
                if not restaurante.firebase_uid:
                    restaurante.firebase_uid = uid
                    restaurante.save_restaurante()
                
                token = create_access_token(
                    identity=str(restaurante.ID),
                    additional_claims={'tipo': 'restaurante', 'firebase_uid': uid},
                    expires_delta=datetime.timedelta(hours=12)
                )
                return {
                    'access_token': token,
                    'tipo': 'restaurante',
                    'id': restaurante.ID,
                    'nome': restaurante.Nome
                }, 200
        except Exception as e:
            print(f"Erro na autenticação Firebase: {e}")
            abort(401, f"Erro de autenticação: {str(e)}")
            
@api.route('/completar-cliente')
class ComplementarCliente(Resource):
    @api.expect(complementar_cliente_model)
    def post(self):
        """
        Completa o cadastro de um cliente após autenticação com Firebase
        """
        dados = api.payload or {}
        
        try:
            # Extrair dados do cliente (mesmo sem token)
            dados_cliente = dados.get('dados', {})
            firebase_uid = dados_cliente.get('firebase_uid')
            nome = dados_cliente.get('Nome', dados_cliente.get('nome', ''))
            email = dados_cliente.get('email')
            cpf = dados_cliente.get('CPF', dados_cliente.get('cpf', ''))
            telefone = dados_cliente.get('telefone')
            cidade = dados_cliente.get('Cidade', dados_cliente.get('cidade', ''))
            
            if not firebase_uid or not email:
                return {"message": "firebase_uid e email são obrigatórios"}, 400
            
            # Criar cliente com senha aleatória (não será usada com Firebase)
            import secrets
            senha_temp = secrets.token_hex(16)
            
            # Verificar se já existe
            cliente_existente = UsuarioModel.find_by_firebase_uid(firebase_uid) or UsuarioModel.find_by_email(email)
            if cliente_existente:
                # Atualizar informações
                cliente_existente.Nome = nome
                cliente_existente.CPF = cpf
                cliente_existente.telefone = telefone
                cliente_existente.Cidade = cidade
                cliente_existente.firebase_uid = firebase_uid
                cliente_existente.save()
                
                cliente = cliente_existente
            else:
                # Criar novo cliente
                cliente = UsuarioModel(
                    Nome=nome,
                    CPF=cpf,
                    email=email,
                    senha=senha_temp,  # Senha temporária
                    telefone=telefone,
                    Cidade=cidade,
                    firebase_uid=firebase_uid
                )
                cliente.save()
            
            # Criar token JWT
            token = create_access_token(
                identity=str(cliente.ID),
                additional_claims={'tipo': 'cliente', 'firebase_uid': firebase_uid},
                expires_delta=datetime.timedelta(hours=12)
            )
            
            return {'access_token': token, 'tipo': 'cliente', 'id': cliente.ID}, 200
            
        except Exception as e:
            print(f"Erro ao completar cadastro de cliente: {e}")
            import traceback
            traceback.print_exc()
            abort(400, f"Erro ao completar cadastro: {str(e)}")
            
@api.route('/completar-restaurante')
class ComplementarRestaurante(Resource):
    @api.expect(complementar_restaurante_model)
    def post(self):
        """
        Completa o cadastro de um restaurante após autenticação com Firebase
        """
        dados = api.payload or {}
        
        try:
            # Dados do restaurante (mesmo sem token)
            dados_restaurante = dados.get('dados', {})
            firebase_uid = dados_restaurante.get('firebase_uid')
            nome = dados_restaurante.get('Nome', dados_restaurante.get('nome', ''))
            email = dados_restaurante.get('email')
            nome_fantasia = dados_restaurante.get('nome_fantasia')
            cnpj = dados_restaurante.get('CNPJ', dados_restaurante.get('cnpj', ''))
            telefone = dados_restaurante.get('telefone')
            endereco = dados_restaurante.get('Endereco', dados_restaurante.get('endereco', ''))
            cidade = dados_restaurante.get('Cidade', dados_restaurante.get('cidade', ''))
            bairro = dados_restaurante.get('bairro')
            tipo_restaurante = dados_restaurante.get('tipo_restaurante')
            descricao = dados_restaurante.get('descricao', '')
            latitude = dados_restaurante.get('latitude', 0)
            longitude = dados_restaurante.get('longitude', 0)
            
            if not firebase_uid or not email:
                return {"message": "firebase_uid e email são obrigatórios"}, 400
            
            # Criar restaurante com senha aleatória (não será usada com Firebase)
            import secrets
            senha_temp = secrets.token_hex(16)
            
            # Verificar se já existe
            restaurante_existente = restauranteModel.find_by_firebase_uid(firebase_uid) or restauranteModel.find_email_restaurante(email)
            if restaurante_existente:
                # Atualizar informações
                restaurante_existente.Nome = nome
                restaurante_existente.nome_fantasia = nome_fantasia
                restaurante_existente.CNPJ = cnpj
                restaurante_existente.telefone = telefone
                restaurante_existente.Endereco = endereco
                restaurante_existente.Cidade = cidade
                restaurante_existente.bairro = bairro
                restaurante_existente.tipo_restaurante = tipo_restaurante
                restaurante_existente.descricao = descricao
                restaurante_existente.latitude = latitude
                restaurante_existente.longitude = longitude
                restaurante_existente.firebase_uid = firebase_uid
                restaurante_existente.save_restaurante()
                
                restaurante = restaurante_existente
            else:
                # Criar novo restaurante
                restaurante = restauranteModel(
                    Nome=nome,
                    nome_fantasia=nome_fantasia,
                    CNPJ=cnpj,
                    email=email,
                    senha=senha_temp,  # Senha temporária
                    telefone=telefone,
                    Endereco=endereco,
                    Cidade=cidade,
                    bairro=bairro,
                    tipo_restaurante=tipo_restaurante,
                    descricao=descricao,
                    latitude=latitude,
                    longitude=longitude,
                    firebase_uid=firebase_uid
                )
                restaurante.save_restaurante()
            
            # Criar token JWT
            token = create_access_token(
                identity=str(restaurante.ID),
                additional_claims={'tipo': 'restaurante', 'firebase_uid': firebase_uid},
                expires_delta=datetime.timedelta(hours=12)
            )
            
            return {'access_token': token, 'tipo': 'restaurante', 'id': restaurante.ID}, 200
            
        except Exception as e:
            print(f"Erro ao completar cadastro de restaurante: {e}")
            import traceback
            traceback.print_exc()
            abort(400, f"Erro ao completar cadastro: {str(e)}")