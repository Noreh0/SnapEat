from flask_restx import Resource, Namespace, fields, abort
from models.usuario import UsuarioModel
from models.restaurante import restauranteModel
from werkzeug.security import check_password_hash, generate_password_hash
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity
from blacklist import BLACKLIST
from flask import jsonify, url_for, current_app, request
from geopy.geocoders import Nominatim
from flask_mail import Message
from services.email_service import email_service
from itsdangerous import URLSafeTimedSerializer,BadSignature, SignatureExpired
from werkzeug.utils import secure_filename
from resource.firebase_storage import upload_image
from sql_alchemy import banco
import datetime
import traceback

api = Namespace('auth', description='Operações de autenticação de usuários')

SECRET_KEY = 'SUA_SECRET_KEY'  # Use a mesma do Flask
serializer = URLSafeTimedSerializer(SECRET_KEY)

def get_serializer() -> URLSafeTimedSerializer:
    key = (current_app.config.get('SECRET_KEY')) or 'dev-secret-key'
    return URLSafeTimedSerializer(key)

usuario_model = api.model('Usuario', {
    'Nome': fields.String(required=True, description='Nome do usuário'),
    'CPF': fields.String(required=True, description='CPF do usuário'),
    'email': fields.String(required=True, description='Email do usuário'),
    'senha': fields.String(required=True, description='Senha do usuário'),
    'telefone': fields.String(required=True, description='Telefone do usuário'),
    'Cidade': fields.String(required=True, description='Cidade do usuário'),
    'rede_social': fields.String(description='URL da rede social do usuário', default=None)
})

restaurante_model = api.model('Restaurante', {
    'Nome': fields.String(required=True),
    'nome_fantasia': fields.String(required=True),
    'CNPJ': fields.String(required=True),
    'email': fields.String(required=True),
    'senha': fields.String(required=True),
    'telefone': fields.String(required=True),
    'Endereco': fields.String(required=True),
    'Cidade': fields.String(required=True),
    'bairro': fields.String(required=True),
    'latitude': fields.Float(required=True, description='Latitude do restaurante'),
    'longitude': fields.Float(required=True, description='Longitude do restaurante'),
    'tipo_restaurante': fields.String(required=True),
    'descricao': fields.String(required=True),
    'imagem_url': fields.String(description='URL da imagem do restaurante', default=None)
})


login_model = api.model('Login', {
    'email': fields.String(required=True, description='Email do usuário'),
    'senha': fields.String(required=True, description='Senha do usuário'),
})

@api.route('/cadastro')
class CadastroCliente(Resource):
    @api.expect(usuario_model)
    def post(self):
        """Cadastro de novo cliente"""
        try:
            dados = api.payload
            
            # Validação de dados obrigatórios
            campos_obrigatorios = ['Nome', 'CPF', 'email', 'senha', 'telefone', 'Cidade']
            campos_faltando = [campo for campo in campos_obrigatorios if not dados.get(campo)]
            
            if campos_faltando:
                return {
                    "message": "Dados incompletos.",
                    "campos_faltando": campos_faltando
                }, 422  # ✅ Unprocessable Entity
            
            # Validação de email duplicado
            if UsuarioModel.find_by_email(dados['email']):
                return {
                    "message": f"O email '{dados['email']}' já está em uso.",
                    "tipo_erro": "email_duplicado"
                }, 409  # ✅ Conflict
            
            # Validação de CPF duplicado
            if UsuarioModel.query.filter_by(CPF=dados['CPF']).first():
                return {
                    "message": f"O CPF '{dados['CPF']}' já está cadastrado.",
                    "tipo_erro": "cpf_duplicado"
                }, 409  # ✅ Conflict
            
            # Remover campos extras
            dados.pop('confirmasenha', None)
            
            # Criar usuário
            usuario = UsuarioModel(**dados)
            usuario.save()
            
            return {
                "message": "Usuário criado com sucesso!",
                "id": usuario.ID,
                "email": usuario.email
            }, 201  # ✅ Created
            
        except ValueError as e:
            # Erro de validação de dados
            print(f"❌ Erro de validação no cadastro de cliente: {str(e)}")
            return {
                "message": "Dados inválidos fornecidos.",
                "detalhes": str(e)
            }, 422  # ✅ Unprocessable Entity
            
        except Exception as e:
            # Erro inesperado do servidor
            print(f"❌ Erro interno no cadastro de cliente: {str(e)}")
            traceback.print_exc()
            return {
                "message": "Erro interno do servidor ao processar o cadastro.",
                "tipo_erro": "internal_error",
                "detalhes": "Por favor, tente novamente mais tarde."
            }, 500  # ✅ Internal Server Error

@api.route('/cadastro/restaurante')
class CadastroRestaurante(Resource):
    @api.expect(restaurante_model)
    def post(self):
        """Cadastro de novo restaurante"""
        try:
            dados = api.payload
            
            print('📝 Dados recebidos no backend:', dados)
            
            # Validação de dados obrigatórios
            campos_obrigatorios = ['Nome', 'CNPJ', 'email', 'senha', 'telefone', 'Endereco', 'Cidade', 'tipo_restaurante']
            campos_faltando = [campo for campo in campos_obrigatorios if not dados.get(campo)]
            
            if campos_faltando:
                return {
                    "message": "Dados incompletos.",
                    "campos_faltando": campos_faltando
                }, 422  # ✅ Unprocessable Entity
            
            # Validação de email duplicado
            if restauranteModel.find_email_restaurante(dados['email']):
                return {
                    "message": f"O email '{dados['email']}' já está em uso.",
                    "tipo_erro": "email_duplicado"
                }, 409  # ✅ Conflict
            
            # Validação de CNPJ duplicado
            if restauranteModel.query.filter_by(CNPJ=dados['CNPJ']).first():
                return {
                    "message": f"O CNPJ '{dados['CNPJ']}' já está cadastrado.",
                    "tipo_erro": "cnpj_duplicado"
                }, 409  # ✅ Conflict
            
            # Geocodificação se não houver coordenadas
            if not dados.get('latitude') or not dados.get('longitude'):
                try:
                    geolocator = Nominatim(user_agent="restaurante_app", timeout=10)
                    endereco_completo = f"{dados['Endereco']}, {dados['Cidade']}, Brasil"
                    location = geolocator.geocode(endereco_completo)
                    
                    if location:
                        dados['latitude'] = location.latitude
                        dados['longitude'] = location.longitude
                        print(f"✅ Coordenadas obtidas: {location.latitude}, {location.longitude}")
                    else:
                        return {
                            "message": "Não foi possível obter coordenadas para o endereço fornecido.",
                            "tipo_erro": "geocoding_failed",
                            "endereco": endereco_completo
                        }, 422  # ✅ Unprocessable Entity
                        
                except Exception as geo_error:
                    print(f"❌ Erro na geocodificação: {str(geo_error)}")
                    return {
                        "message": "Erro ao buscar coordenadas do endereço.",
                        "tipo_erro": "geocoding_error",
                        "detalhes": str(geo_error)
                    }, 500  # ✅ Internal Server Error
            
            # Remover campos extras
            dados.pop('confirmasenha', None)
            
            # Criar restaurante
            restaurante = restauranteModel(**dados)
            restaurante.save_restaurante()
            
            # ✅ CORRIGIDO: Retornar resposta completa com ID em maiúscula
            return {
                "message": "Restaurante cadastrado com sucesso!",
                "ID": restaurante.ID,  # ✅ Mudado para maiúscula
                "Nome": restaurante.Nome,
                "email": restaurante.email,
                "CNPJ": restaurante.CNPJ,
                "telefone": restaurante.telefone,
                "Cidade": restaurante.Cidade,
                "tipo_restaurante": restaurante.tipo_restaurante
            }, 201  # ✅ Created
            
        except ValueError as e:
            print(f"❌ Erro de validação no cadastro de restaurante: {str(e)}")
            return {
                "message": "Dados inválidos fornecidos.",
                "detalhes": str(e)
            }, 422  # ✅ Unprocessable Entity
            
        except Exception as e:
            print(f"❌ Erro interno no cadastro de restaurante: {str(e)}")
            traceback.print_exc()
            return {
                "message": "Erro interno do servidor ao processar o cadastro.",
                "tipo_erro": "internal_error",
                "detalhes": "Por favor, tente novamente mais tarde."
            }, 500  # ✅ Internal Server Error

@api.route('/cadastro/restaurante-com-imagem')
class CadastroRestauranteComImagem(Resource):
    def post(self):
        """Cadastro de novo restaurante com imagem"""
        try:
            
            print('📝 Cadastro de restaurante com imagem iniciado')
            
            # Extrair dados do form
            dados = {}
            campos_obrigatorios = ['Nome', 'CNPJ', 'email', 'senha', 'telefone', 'Endereco', 'Cidade', 'tipo_restaurante']
            
            for campo in campos_obrigatorios:
                valor = request.form.get(campo)
                if not valor:
                    return {
                        "message": f"Campo obrigatório faltando: {campo}",
                        "campo_faltando": campo
                    }, 400
                dados[campo] = valor
            
            # Campos opcionais
            dados['nome_fantasia'] = request.form.get('nome_fantasia', '')
            dados['descricao'] = request.form.get('descricao', '')
            dados['bairro'] = request.form.get('bairro', '')
            
            # Coordenadas (converter para float se existir)
            try:
                dados['latitude'] = float(request.form.get('latitude', 0))
                dados['longitude'] = float(request.form.get('longitude', 0))
            except (ValueError, TypeError):
                dados['latitude'] = 0
                dados['longitude'] = 0
            
            print('📝 Dados extraídos do formulário:', dados)
            
            # Validação de email duplicado
            if restauranteModel.find_email_restaurante(dados['email']):
                return {
                    "message": "Email já cadastrado! Use outro email.",
                    "campo": "email"
                }, 409
            
            # Validação de CNPJ duplicado
            if restauranteModel.query.filter_by(CNPJ=dados['CNPJ']).first():
                return {
                    "message": "CNPJ já cadastrado! Use outro CNPJ.",
                    "campo": "CNPJ"
                }, 409
            
            # Geocodificação se necessário
            if not dados.get('latitude') or not dados.get('longitude'):
                try:
                    geolocator = Nominatim(user_agent="restaurante_app", timeout=10)
                    endereco_completo = f"{dados['Endereco']}, {dados['Cidade']}, Brasil"
                    location = geolocator.geocode(endereco_completo)
                    
                    if location:
                        dados['latitude'] = location.latitude
                        dados['longitude'] = location.longitude
                        print(f"✅ Coordenadas obtidas: {location.latitude}, {location.longitude}")
                
                except Exception as geo_error:
                    print(f"⚠️ Erro na geocodificação: {str(geo_error)}")
                    # Continuar sem coordenadas
                    pass
            
            # Criar restaurante primeiro
            restaurante = restauranteModel(**dados)
            restaurante.save_restaurante()
            
            print(f"✅ Restaurante criado com ID: {restaurante.ID}")
            
            # Processar imagem se fornecida
            imagem_url = None
            if 'imagem' in request.files:
                file = request.files['imagem']
                if file and file.filename != '':
                    print(f"📷 Processando imagem: {file.filename}")
                    
                    # Validar extensão
                    allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
                    extensao = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
                    
                    if extensao in allowed_extensions:
                        try:
                            # Gerar nome único
                            filename = secure_filename(f"restaurante_{restaurante.ID}_{file.filename}")
                            
                            # Fazer upload
                            imagem_url = upload_image(file, folder="restaurantes", filename=filename, use_local_fallback=True)
                            
                            if imagem_url:
                                # Atualizar restaurante com URL da imagem
                                restaurante.imagem_url = imagem_url
                                banco.session.commit()
                                print(f"✅ Imagem salva com sucesso: {imagem_url}")
                            else:
                                print("⚠️ Falha no upload da imagem, mas restaurante foi criado")
                        
                        except Exception as e:
                            print(f"⚠️ Erro no upload da imagem: {str(e)}")
                            # Não falhar o cadastro por causa da imagem
                    else:
                        print(f"⚠️ Extensão de arquivo não permitida: {extensao}")
            
            return {
                "message": "Restaurante cadastrado com sucesso!",
                "ID": restaurante.ID,
                "Nome": restaurante.Nome,
                "email": restaurante.email,
                "CNPJ": restaurante.CNPJ,
                "telefone": restaurante.telefone,
                "Cidade": restaurante.Cidade,
                "tipo_restaurante": restaurante.tipo_restaurante,
                "imagem_url": imagem_url
            }, 201
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro no cadastro de restaurante com imagem: {str(e)}")
            traceback.print_exc()
            return {
                "message": "Erro interno do servidor. Tente novamente.",
                "tipo_erro": "internal_error",
                "detalhes": str(e)
            }, 500

@api.route('/login')
class Login(Resource):
    @api.expect(login_model)
    def post(self):
        """Login para clientes e restaurantes"""
        try:
            dados = api.payload or {}
            email = dados.get('email')
            senha = dados.get('senha')
            
            # Validação de campos obrigatórios
            if not email or not senha:
                return {
                    "message": "Email e senha são obrigatórios.",
                    "campos_faltando": [
                        campo for campo in ['email', 'senha'] 
                        if not dados.get(campo)
                    ]
                }, 422  # ✅ Unprocessable Entity
            
            # Tentativa de login como cliente
            usuario = UsuarioModel.find_by_email(email)
            print(f"🔍 Login: Verificando cliente com email {email} - Resultado: {usuario}")
            
            if usuario and usuario.verificar_senha(senha):
                id_var = usuario.ID
                tipo = 'cliente'
                nome = usuario.Nome
            else:
                # Tentativa de login como restaurante
                restaurante = restauranteModel.find_email_restaurante(email)
                print(f"🔍 Login: Verificando restaurante com email {email} - Resultado: {restaurante}")
                
                if restaurante and check_password_hash(restaurante.senha_hash, senha):
                    id_var = restaurante.ID
                    tipo = 'restaurante'
                    nome = restaurante.Nome
                else:
                    # Credenciais inválidas
                    return {
                        'message': 'Email ou senha inválidos.',
                        'tipo_erro': 'credenciais_invalidas'
                    }, 401  # ✅ Unauthorized
            
            # Geração do token JWT
            try:
                token = create_access_token(
                    identity=str(id_var),
                    additional_claims={'tipo': tipo, 'nome': nome},
                    expires_delta=datetime.timedelta(hours=12)
                )
                
                return {
                    'access_token': token,
                    'tipo': tipo,
                    'id': id_var,
                    'nome': nome,
                    'message': 'Login realizado com sucesso!'
                }, 200  # ✅ OK
                
            except Exception as token_error:
                print(f"❌ Erro ao gerar token JWT: {str(token_error)}")
                traceback.print_exc()
                return {
                    'message': 'Erro ao gerar token de autenticação.',
                    'tipo_erro': 'token_generation_failed'
                }, 500  # ✅ Internal Server Error
                
        except Exception as e:
            print(f"❌ Erro interno no login: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno do servidor durante o login.',
                'tipo_erro': 'internal_error',
                'detalhes': 'Por favor, tente novamente mais tarde.'
            }, 500  # ✅ Internal Server Error

@api.route('/recuperar-senha')
class RecuperarSenha(Resource):
    @api.expect(api.model('RecuperarSenha', {'email': fields.String(required=True)}))
    def post(self):
        """Enviar email de recuperação de senha"""
        try:
            dados = api.payload or {}
            email = dados.get('email')
            
            # Validação de email
            if not email:
                return {
                    'message': 'Email é obrigatório.',
                    'tipo_erro': 'campo_faltando'
                }, 422  # ✅ Unprocessable Entity
            
            # Buscar usuário ou restaurante
            user = UsuarioModel.find_by_email(email)
            restaurante = restauranteModel.find_email_restaurante(email)
            
            if not user and not restaurante:
                print(f"⚠️ Tentativa de recuperação para email não existente: {email}")
                # Não revelar se o email existe (segurança)
                return {
                    'message': 'Se o e-mail existir, você receberá instruções para redefinir sua senha.'
                }, 200  # ✅ OK
            
            # Gerar token de recuperação
            try:
                s = get_serializer()
                token = s.dumps(email, salt='recuperar-senha')
                
                # Montar URL de recuperação
                from urllib.parse import quote
                frontend_url = current_app.config.get('FRONTEND_BASE_URL', 'http://localhost:4200')
                safe_token = quote(token)
                link = f"{frontend_url}/#/redefinir-senha/{safe_token}"
                
                # HTML do email
                html_content = f"""
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #d57a3d;">Recuperação de Senha - SnapEats</h2>
                    <p>Olá,</p>
                    <p>Recebemos uma solicitação para redefinir sua senha no SnapEats.</p>
                    <p>Para criar uma nova senha, clique no botão abaixo:</p>
                    <p style="text-align: center;">
                        <a href="{link}" style="background-color: #d57a3d; color: white; padding: 10px 20px; 
                        text-decoration: none; border-radius: 4px; display: inline-block;">
                            Redefinir Minha Senha
                        </a>
                    </p>
                    <p>Se o botão acima não funcionar, copie e cole o link abaixo no seu navegador:</p>
                    <p style="word-break: break-all;"><a href="{link}">{link}</a></p>
                    <p>Este link é válido por 1 hora.</p>
                    <p>Se você não solicitou esta alteração, ignore este email.</p>
                    <p>Atenciosamente,<br>Equipe SnapEats</p>
                </div>
                """
                
                text_content = f"""
                Recuperação de Senha - SnapEats
                
                Olá,
                
                Para redefinir sua senha, acesse: {link}
                
                Este link é válido por 1 hora.
                
                Atenciosamente,
                Equipe SnapEats
                """
                
                # Enviar email
                email_sent = email_service.send_email(
                    recipient=email,
                    subject="Recuperação de Senha - SnapEats",
                    html_content=html_content,
                    text_content=text_content
                )
                
                if not email_sent:
                    print("❌ Falha no envio do e-mail de recuperação de senha.")
                    return {
                        'message': 'Erro ao enviar email de recuperação.',
                        'tipo_erro': 'email_send_failed'
                    }, 500  # ✅ Internal Server Error
                
                return {
                    'message': 'Se o e-mail existir, você receberá instruções para redefinir sua senha.'
                }, 200  # ✅ OK
                
            except Exception as token_error:
                print(f"❌ Erro ao gerar token de recuperação: {str(token_error)}")
                traceback.print_exc()
                return {
                    'message': 'Erro ao processar recuperação de senha.',
                    'tipo_erro': 'token_generation_failed'
                }, 500  # ✅ Internal Server Error
                
        except Exception as e:
            print(f"❌ Erro interno na recuperação de senha: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno do servidor.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/redefinir-senha/<string:token>')
class RedefinirSenha(Resource):
    def get(self, token):
        """Redirecionar para o frontend (GET)"""
        try:
            from flask import redirect
            from urllib.parse import quote
            
            base = current_app.config.get('FRONTEND_BASE_URL', 'http://localhost:4200')
            safe_token = quote(token)
            return redirect(f'{base}/#/redefinir-senha/{safe_token}')
            
        except Exception as e:
            print(f"❌ Erro no redirecionamento: {str(e)}")
            return {
                'message': 'Erro ao processar solicitação.',
                'tipo_erro': 'redirect_failed'
            }, 500  # ✅ Internal Server Error

    @api.expect(api.model('RedefinirSenha', {
        'nova_senha': fields.String(required=True, min_length=6)
    }))
    def post(self, token):
        """Redefinir senha com token válido (POST)"""
        try:
            from urllib.parse import unquote
            
            # Decodificar token
            token = unquote(token)
            
            # Validar token
            s = get_serializer()
            try:
                email = s.loads(token, salt='recuperar-senha', max_age=3600)  # 1 hora
            except SignatureExpired:
                return {
                    'message': 'Token expirado. Solicite uma nova recuperação de senha.',
                    'tipo_erro': 'token_expired'
                }, 401  # ✅ Unauthorized
            except BadSignature:
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'token_invalid'
                }, 401  # ✅ Unauthorized
            
            # Buscar usuário
            user = UsuarioModel.find_by_email(email)
            restaurante = restauranteModel.find_email_restaurante(email)
            
            if not user and not restaurante:
                return {
                    'message': 'Usuário não encontrado.',
                    'tipo_erro': 'user_not_found'
                }, 404  # ✅ Not Found
            
            # Validar nova senha
            nova_senha = (api.payload or {}).get('nova_senha')
            if not nova_senha or len(nova_senha) < 6:
                return {
                    'message': 'A nova senha deve ter no mínimo 6 caracteres.',
                    'tipo_erro': 'senha_invalida'
                }, 422  # ✅ Unprocessable Entity
            
            # Atualizar senha
            if user:
                user.senha = nova_senha
                user.save()
            else:
                restaurante.senha = nova_senha
                restaurante.save_restaurante()
            
            return {
                'message': 'Senha redefinida com sucesso!'
            }, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao redefinir senha: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao redefinir senha.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/me')
class UsuarioAtual(Resource):
    @jwt_required()
    def get(self):
        """Retorna informações do usuário autenticado"""
        try:
            claims = get_jwt()
            identity = get_jwt_identity()
            tipo = claims.get('tipo')
            
            print(f"🔍 /auth/me chamado - Identity: {identity}, Tipo: {tipo}")
            
            # Converter identity para int
            try:
                user_id = int(identity)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            # Buscar dados baseado no tipo
            if tipo == 'cliente':
                usuario = UsuarioModel.find_by_id(user_id)
                if not usuario:
                    return {
                        'message': 'Cliente não encontrado.',
                        'tipo_erro': 'user_not_found'
                    }, 404  # ✅ Not Found
                
                return {
                    'id': usuario.ID,
                    'tipo': 'cliente',
                    'nome': usuario.Nome,
                    'email': usuario.email,
                    'telefone': usuario.telefone,
                    'cidade': usuario.Cidade,
                    'cpf': usuario.CPF
                }, 200  # ✅ OK
                
            elif tipo == 'restaurante':
                restaurante = restauranteModel.find_restaurante(user_id)
                if not restaurante:
                    return {
                        'message': 'Restaurante não encontrado.',
                        'tipo_erro': 'restaurant_not_found'
                    }, 404  # ✅ Not Found
                
                return {
                    'id': restaurante.ID,
                    'tipo': 'restaurante',
                    'nome': restaurante.Nome,
                    'email': restaurante.email,
                    'telefone': restaurante.telefone,
                    'cidade': restaurante.Cidade,
                    'cnpj': restaurante.CNPJ,
                    'tipo_restaurante': restaurante.tipo_restaurante,
                    'descricao': restaurante.descricao,
                    'imagem_url': restaurante.imagem_url
                }, 200  # ✅ OK
            else:
                return {
                    'message': 'Tipo de usuário inválido.',
                    'tipo_erro': 'invalid_user_type'
                }, 400  # ✅ Bad Request
                
        except Exception as e:
            print(f"❌ Erro em /auth/me: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar usuário.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/logout')
class logoutUsuario(Resource):
    @jwt_required(optional=True)
    def post(self):
        """Realizar logout do usuário"""
        try:
            # Tentar obter o JWT se disponível
            try:
                jwt_data = get_jwt()
                jti = jwt_data.get('jti')
                if jti:
                    BLACKLIST.add(jti)
                    print(f"✅ Token {jti} adicionado à blacklist")
            except Exception as jwt_error:
                print(f"⚠️ Não foi possível obter JWT durante logout: {jwt_error}")
            
            return {
                "message": "Logout realizado com sucesso!"
            }, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro no logout: {str(e)}")
            traceback.print_exc()
            # Retornar sucesso mesmo com erro para não travar o frontend
            return {
                "message": "Logout realizado com sucesso!"
            }, 200  # ✅ OK