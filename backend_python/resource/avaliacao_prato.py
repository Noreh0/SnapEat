import json
import traceback  # ✅ ADICIONAR
from flask import request
from flask_restx import Resource, Namespace, fields, reqparse, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.avaliacao_prato import avaliacaoPratoModel
from models.prato import pratoModel
from models.usuario import UsuarioModel
from werkzeug.datastructures import FileStorage
from resource.firebase_storage import upload_image, delete_image
from utils.decorators import cliente_required 
from datetime import datetime
from sql_alchemy import banco

api = Namespace('avaliacoes-prato', description='Operações com avaliações de pratos')

# Swagger model
avaliacao_prato_fields = api.model('AvaliacaoPrato', {
    'ID':        fields.Integer(readOnly=True),
    'Comentario':fields.String(required=True, description='Comentário do cliente'),
    'Nota':      fields.Integer(required=True, description='Nota de 1 a 5'),
    'ID_Cliente':fields.Integer(required=True, description='ID do cliente'),
    'Nome_Cliente': fields.String(description='Nome do cliente'),
    'ID_Prato':  fields.Integer(required=True, description='ID do prato'),
    'created_at': fields.DateTime(description='Data de criação'),
    'updated_at': fields.DateTime(description='Data de atualização'),
    'imagens': fields.List(fields.String, description='URLs das imagens associadas à avaliação'),
})

# Parser para POST e PUT
parser = reqparse.RequestParser()
parser.add_argument('Comentario', type=str, required=True, help='Comentário é obrigatório')
parser.add_argument('Nota',       type=int, required=True, help='Nota é obrigatória')
parser.add_argument('ID_Cliente', type=int, required=True, help='ID do cliente é obrigatório')
parser.add_argument('ID_Prato',   type=int, required=True, help='ID do prato é obrigatório')
parser.add_argument('imagens', type=FileStorage, location='files', action='append')

@api.route('/')
class AvaliacaoPratoList(Resource):
    @jwt_required(optional=True)
    @api.marshal_list_with(avaliacao_prato_fields)
    def get(self):
        """Lista todas as avaliações de pratos"""
        try:
            avaliacoes = avaliacaoPratoModel.find_all()
            return avaliacoes, 200  # ✅ OK
        except Exception as e:
            print(f"❌ Erro ao listar avaliações de pratos: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao listar avaliações.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

    @api.expect(parser, validate=True)
    @api.marshal_with(avaliacao_prato_fields, code=201)
    @jwt_required()
    @cliente_required
    def post(self):
        """Cria uma nova avaliação de prato com suporte a imagens"""
        try:
            # Obter dados do formulário
            comentario = request.form.get('Comentario')
            nota = request.form.get('Nota', type=int)
            id_cliente = request.form.get('ID_Cliente', type=int)
            id_prato = request.form.get('ID_Prato', type=int)
            
            print(f"📝 Criando avaliação de prato:")
            print(f"   Comentário: {comentario[:50] if comentario else 'N/A'}...")
            print(f"   Nota: {nota}")
            print(f"   Cliente ID: {id_cliente}")
            print(f"   Prato ID: {id_prato}")
            
            # ✅ Validação de campos obrigatórios
            if not all([comentario, nota, id_cliente, id_prato]):
                campos_faltando = []
                if not comentario: campos_faltando.append('Comentario')
                if not nota: campos_faltando.append('Nota')
                if not id_cliente: campos_faltando.append('ID_Cliente')
                if not id_prato: campos_faltando.append('ID_Prato')
                
                return {
                    'message': 'Campos obrigatórios faltando.',
                    'tipo_erro': 'missing_fields',
                    'campos_faltando': campos_faltando
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Validar nota
            if not (1 <= nota <= 5):
                return {
                    'message': 'Nota deve estar entre 1 e 5.',
                    'tipo_erro': 'invalid_rating',
                    'valor_recebido': nota
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Validar comentário
            if len(comentario.strip()) < 10:
                return {
                    'message': 'Comentário deve ter pelo menos 10 caracteres.',
                    'tipo_erro': 'invalid_comment',
                    'tamanho_minimo': 10,
                    'tamanho_atual': len(comentario.strip())
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Validar cliente
            if not UsuarioModel.find_by_id(id_cliente):
                return {
                    'message': 'Cliente não encontrado.',
                    'tipo_erro': 'client_not_found',
                    'id_cliente': id_cliente
                }, 404  # ✅ Not Found
            
            # ✅ Validar prato
            prato = pratoModel.find_by_id(id_prato)
            if not prato:
                return {
                    'message': 'Prato não encontrado.',
                    'tipo_erro': 'dish_not_found',
                    'id_prato': id_prato
                }, 404  # ✅ Not Found
            
            # ✅ Verificar avaliação duplicada
            avaliacao_existente = avaliacaoPratoModel.query.filter_by(
                ID_Cliente=id_cliente,
                ID_Prato=id_prato
            ).first()
            
            if avaliacao_existente:
                return {
                    'message': 'Você já avaliou este prato.',
                    'tipo_erro': 'duplicate_review',
                    'avaliacao_existente_id': avaliacao_existente.ID
                }, 409  # ✅ Conflict
            
            # Criar avaliação
            nova = avaliacaoPratoModel(
                Comentario=comentario,
                Nota=nota,
                ID_Cliente=id_cliente,
                ID_Prato=id_prato
            )
            
            banco.session.add(nova)
            banco.session.flush()
            
            print(f"✅ Avaliação criada com ID: {nova.ID}")
            
            # Processar imagens
            imagens_urls = []
            if 'imagens' in request.files:
                imagens = request.files.getlist('imagens')
                print(f"📸 {len(imagens)} imagem(ns) recebida(s)")
                
                # ✅ Validar limite de imagens
                if len(imagens) > 5:
                    banco.session.rollback()
                    return {
                        'message': 'Máximo de 5 imagens por avaliação.',
                        'tipo_erro': 'too_many_images',
                        'maximo': 5,
                        'recebido': len(imagens)
                    }, 422  # ✅ Unprocessable Entity
                
                for idx, imagem in enumerate(imagens):
                    if imagem and imagem.filename:
                        extensao = imagem.filename.lower().split('.')[-1]
                        if extensao not in ['png', 'jpg', 'jpeg', 'gif', 'webp']:
                            print(f"⚠️ Extensão inválida: {extensao}")
                            continue
                        
                        try:
                            # Obter ID do restaurante do prato
                            id_restaurante = prato.get('ID_Restaurante') if isinstance(prato, dict) else prato.ID_Restaurante
                            
                            imagem_url = upload_image(
                                imagem,
                                folder=f"avaliacoes_pratos/restaurante_{id_restaurante}/prato_{id_prato}",
                                filename=f"aval_prato_{nova.ID}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{idx}"
                            )
                            
                            if imagem_url:
                                imagens_urls.append(imagem_url)
                                print(f"✅ Imagem {idx + 1} enviada: {imagem_url}")
                        except Exception as e:
                            print(f"❌ Erro ao fazer upload da imagem {idx}: {e}")
                            continue
            
            # Atualizar campos de imagens (temporário: atributos não existem no banco ainda)
            setattr(nova, 'imagens_urls', imagens_urls)
            setattr(nova, 'tem_imagens', bool(imagens_urls))
            
            print(f"📊 Total de imagens salvas: {len(imagens_urls)}")
            print(f"📊 tem_imagens definido como: {getattr(nova, 'tem_imagens', False)}")
            
            banco.session.commit()
            banco.session.refresh(nova)
            
            # ✅ NOVO: Sistema de Pontos - Processar pontos para avaliação de prato
            try:
                # Buscar prato para obter restaurante_id
                prato = pratoModel.query.get(id_prato)
                if prato:
                    from services.pontos_service import PontosService
                    
                    resultado_pontos = PontosService.processar_pontos_avaliacao_prato(
                        cliente_id=id_cliente,
                        restaurante_id=prato.restaurante_id,
                        nota=nota,
                        comentario=comentario,
                        tem_imagens=bool(imagens_urls),
                        avaliacao_id=nova.ID
                    )
                    print(f"🎁 Pontos de prato concedidos: {resultado_pontos['pontos_ganhos']}")
            except Exception as e:
                print(f"⚠️ Erro ao processar pontos de prato: {e}")
                # Não falhar a avaliação por erro nos pontos
            
            # Retornar JSON
            resultado = nova.json()
            print(f"📤 Retornando para frontend:")
            print(f"   tem_imagens: {resultado['tem_imagens']}")
            print(f"   total imagens: {len(resultado['imagens_urls'])}")
            
            return resultado, 201  # ✅ Created
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro ao criar avaliação de prato: {e}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao salvar avaliação.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error
    
@api.route('/<int:ID>/upload-imagens')
class AvaliacaoPratoUploadImagens(Resource):
    @jwt_required()
    @cliente_required
    def post(self, ID):
        """Adiciona imagens a uma avaliação de prato existente"""
        try:
            aval = avaliacaoPratoModel.query.get(ID)
            if not aval:
                return {
                    'message': 'Avaliação não encontrada.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            
            # Verificar permissão
            identity = get_jwt_identity()
            try:
                identity_int = int(identity)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            if identity_int != aval.ID_Cliente:
                return {
                    'message': 'Você não tem permissão para adicionar imagens a esta avaliação.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            imagens = request.files.getlist('imagens')
            if not imagens:
                return {
                    'message': 'Nenhuma imagem foi enviada.',
                    'tipo_erro': 'no_images'
                }, 422  # ✅ Unprocessable Entity
            
            imagens_urls = getattr(aval, 'imagens_urls', []) or []
            
            # Validar limite
            espaco_disponivel = 5 - len(imagens_urls)
            if len(imagens) > espaco_disponivel:
                return {
                    'message': f'Máximo de 5 imagens por avaliação. Você pode adicionar {espaco_disponivel} imagem(ns).',
                    'tipo_erro': 'limit_exceeded',
                    'maximo': 5,
                    'atual': len(imagens_urls),
                    'espaco_disponivel': espaco_disponivel
                }, 422  # ✅ Unprocessable Entity
            
            # Obter prato para ID do restaurante
            prato = pratoModel.query.get(aval.ID_Prato)
            id_restaurante = prato.ID_Restaurante if prato else 0
            
            imagens_adicionadas = 0
            for idx, imagem in enumerate(imagens):
                if imagem and imagem.filename:
                    if not imagem.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                        continue
                    
                    try:
                        imagem_url = upload_image(
                            imagem,
                            folder=f"avaliacoes_pratos/restaurante_{id_restaurante}/prato_{aval.ID_Prato}",
                            filename=f"aval_prato_{ID}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(imagens_urls) + idx}"
                        )
                        
                        if imagem_url:
                            imagens_urls.append(imagem_url)
                            imagens_adicionadas += 1
                    except Exception as e:
                        print(f"❌ Erro ao fazer upload: {e}")
                        continue
            
            if imagens_adicionadas == 0:
                return {
                    'message': 'Nenhuma imagem foi adicionada com sucesso.',
                    'tipo_erro': 'upload_failed'
                }, 500  # ✅ Internal Server Error
            
            avaliacaoPratoModel.update(ID, imagens_urls=imagens_urls, tem_imagens=True)
            
            return {
                'message': f'{imagens_adicionadas} imagem(ns) adicionada(s) com sucesso.',
                'total_imagens': len(imagens_urls),
                'novas_urls': imagens_urls[-imagens_adicionadas:]
            }, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao adicionar imagens: {e}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao processar imagens.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/<int:ID>/remover-imagem')
class AvaliacaoPratoRemoverImagem(Resource):
    @jwt_required()
    @cliente_required
    def delete(self, ID):
        """Remove uma imagem de uma avaliação de prato"""
        try:
            aval_dict = avaliacaoPratoModel.find_by_id(ID)
            if not aval_dict:
                return {
                    'message': 'Avaliação não encontrada.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            
            identity = get_jwt_identity()
            try:
                identity_int = int(identity)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            if identity_int != aval_dict['ID_Cliente']:
                return {
                    'message': 'Você não tem permissão para remover imagens desta avaliação.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            dados = request.get_json()
            if not dados:
                return {
                    'message': 'Corpo da requisição vazio.',
                    'tipo_erro': 'empty_body'
                }, 422  # ✅ Unprocessable Entity
            
            imagem_url = dados.get('imagem_url')
            
            if not imagem_url:
                return {
                    'message': 'URL da imagem não fornecida.',
                    'tipo_erro': 'missing_field',
                    'campo': 'imagem_url'
                }, 422  # ✅ Unprocessable Entity
            
            imagens_urls = aval_dict.get('imagens_urls', [])
            if imagem_url not in imagens_urls:
                return {
                    'message': 'Imagem não encontrada nesta avaliação.',
                    'tipo_erro': 'image_not_found'
                }, 404  # ✅ Not Found
            
            try:
                delete_image(imagem_url)
            except Exception as e:
                print(f"⚠️ Erro ao deletar do storage: {e}")
            
            imagens_urls.remove(imagem_url)
            avaliacaoPratoModel.update(ID, imagens_urls=imagens_urls, tem_imagens=bool(imagens_urls))
            
            return {
                'message': 'Imagem removida com sucesso.',
                'imagens_restantes': len(imagens_urls)
            }, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao remover imagem: {e}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao remover imagem.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/cliente/<int:cliente_id>')
class AvaliacoesPorCliente(Resource):
    @jwt_required()
    @cliente_required
    @api.marshal_list_with(avaliacao_prato_fields)
    def get(self, cliente_id):
        """Lista avaliações feitas por um cliente (permitido para o próprio cliente)"""
        try:
            identity = get_jwt_identity()
            try:
                identity_int = int(identity)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            if identity_int != cliente_id:
                return {
                    'message': 'Você só pode ver suas próprias avaliações.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            avaliacoes = avaliacaoPratoModel.find_by_cliente(cliente_id)
            return avaliacoes, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar avaliações do cliente: {e}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar avaliações.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/prato/<int:prato_id>')
class AvaliacoesPorPrato(Resource):
    @api.marshal_list_with(avaliacao_prato_fields)
    def get(self, prato_id):
        """Lista todas as avaliações de um prato específico"""
        try:
            # Verificar se o prato existe
            prato = pratoModel.find_by_id(prato_id)
            if not prato:
                return {
                    'message': 'Prato não encontrado.',
                    'tipo_erro': 'dish_not_found',
                    'id_prato': prato_id
                }, 404  # ✅ Not Found
            
            avaliacoes = avaliacaoPratoModel.find_by_prato(prato_id)
            return avaliacoes, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar avaliações do prato: {e}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar avaliações.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/search/<string:nome>')
class AvaliacaoPratoSearch(Resource):
    @api.marshal_list_with(avaliacao_prato_fields)
    def get(self, nome):
        """Filtra avaliações pelo nome do prato (contains)"""
        try:
            avaliacoes = avaliacaoPratoModel.find_by_prato_name(nome)
            return avaliacoes, 200  # ✅ OK
        except Exception as e:
            print(f"❌ Erro ao buscar avaliações: {e}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar avaliações.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/<int:ID>')
class AvaliacaoPrato(Resource):
    @jwt_required(optional=True)
    @api.marshal_with(avaliacao_prato_fields)
    def get(self, ID):
        """Retorna uma avaliação de prato por ID"""
        try:
            resultado = avaliacaoPratoModel.find_by_id(ID)
            if not resultado:
                return {
                    'message': 'Avaliação não encontrada.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            return resultado, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar avaliação: {e}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar avaliação.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

    @jwt_required()
    @cliente_required
    @api.expect(parser, validate=True)
    @api.marshal_with(avaliacao_prato_fields)
    def put(self, ID):
        """Atualiza uma avaliação de prato COM suporte a imagens"""
        try:
            print(f"\n{'='*60}")
            print(f"🔄 INICIANDO ATUALIZAÇÃO - Avaliação ID: {ID}")
            print(f"{'='*60}")
            
            avaliacao = avaliacaoPratoModel.query.get(ID)
            if not avaliacao:
                return {
                    'message': 'Avaliação não encontrada.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            
            # Verificar autorização
            current_user_id = get_jwt_identity()
            try:
                current_user_id_int = int(current_user_id)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            print(f"👤 Usuário logado: {current_user_id_int}")
            print(f"👤 Dono da avaliação: {avaliacao.ID_Cliente}")
            
            if current_user_id_int != avaliacao.ID_Cliente:
                return {
                    'message': 'Você não tem permissão para editar esta avaliação.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # Atualizar campos de texto
            if 'Comentario' in request.form:
                novo_comentario = request.form.get('Comentario')
                if len(novo_comentario.strip()) < 10:
                    return {
                        'message': 'Comentário deve ter pelo menos 10 caracteres.',
                        'tipo_erro': 'invalid_comment'
                    }, 422  # ✅ Unprocessable Entity
                avaliacao.Comentario = novo_comentario
                print(f"✏️ Novo comentário: {avaliacao.Comentario[:50]}...")
            
            if 'Nota' in request.form:
                nova_nota = int(request.form.get('Nota'))
                if not (1 <= nova_nota <= 5):
                    return {
                        'message': 'Nota deve estar entre 1 e 5.',
                        'tipo_erro': 'invalid_rating'
                    }, 422  # ✅ Unprocessable Entity
                avaliacao.Nota = nova_nota
                print(f"⭐ Nova nota: {avaliacao.Nota}")
            
            # Processar imagens (temporário: atributo não existe no banco ainda)
            imagens_atuais = getattr(avaliacao, 'imagens_urls', []) or []
            print(f"\n📸 ESTADO INICIAL DAS IMAGENS:")
            print(f"   Imagens atuais: {len(imagens_atuais)}")
            
            # 1. Processar imagens existentes a manter
            if 'imagens_existentes' in request.form:
                try:
                    imagens_manter = json.loads(request.form.get('imagens_existentes'))
                    print(f"\n📌 MANTENDO IMAGENS:")
                    print(f"   Total a manter: {len(imagens_manter)}")
                    imagens_atuais = [img for img in imagens_atuais if img in imagens_manter]
                except json.JSONDecodeError as e:
                    print(f"⚠️ Erro ao parsear imagens_existentes: {e}")
                    imagens_atuais = []
            else:
                print("\n⚠️ Nenhuma lista de imagens existentes enviada - limpando todas")
                imagens_atuais = []
            
            # 2. Processar imagens a remover
            if 'imagens_remover' in request.form:
                try:
                    imagens_remover = json.loads(request.form.get('imagens_remover'))
                    print(f"\n🗑️ REMOVENDO IMAGENS:")
                    print(f"   Total a remover: {len(imagens_remover)}")
                    
                    for img_url in imagens_remover:
                        try:
                            delete_image(img_url)
                            if img_url in imagens_atuais:
                                imagens_atuais.remove(img_url)
                            print(f"   ✅ Removida: {img_url[:50]}...")
                        except Exception as e:
                            print(f"   ⚠️ Erro ao remover {img_url[:50]}...: {e}")
                except json.JSONDecodeError as e:
                    print(f"⚠️ Erro ao parsear imagens_remover: {e}")
            
            # 3. Adicionar novas imagens
            if 'imagens' in request.files:
                novas_imagens = request.files.getlist('imagens')
                print(f"\n📸 ADICIONANDO NOVAS IMAGENS:")
                print(f"   Recebidas: {len(novas_imagens)} arquivo(s)")
                
                # Limitar total
                espaco_disponivel = 5 - len(imagens_atuais)
                if len(novas_imagens) > espaco_disponivel:
                    return {
                        'message': f'Máximo de 5 imagens. Você pode adicionar {espaco_disponivel} imagem(ns).',
                        'tipo_erro': 'too_many_images'
                    }, 422  # ✅ Unprocessable Entity
                
                prato = pratoModel.find_by_id(avaliacao.ID_Prato)
                id_restaurante = prato.get('ID_Restaurante') if isinstance(prato, dict) else prato.ID_Restaurante
                
                for idx, imagem in enumerate(novas_imagens):
                    if imagem and imagem.filename:
                        extensao = imagem.filename.lower().split('.')[-1]
                        if extensao not in ['png', 'jpg', 'jpeg', 'gif', 'webp']:
                            print(f"   ⚠️ Extensão inválida: {extensao}")
                            continue
                        
                        try:
                            imagem_url = upload_image(
                                imagem,
                                folder=f"avaliacoes_pratos/restaurante_{id_restaurante}/prato_{avaliacao.ID_Prato}",
                                filename=f"aval_prato_{ID}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{idx}"
                            )
                            
                            if imagem_url:
                                imagens_atuais.append(imagem_url)
                                print(f"   ✅ Adicionada: {imagem_url[:50]}...")
                        except Exception as e:
                            print(f"   ❌ Erro ao fazer upload: {e}")
            
            # Atualizar avaliação (temporário: atributos não existem no banco ainda)
            setattr(avaliacao, 'imagens_urls', imagens_atuais)
            setattr(avaliacao, 'tem_imagens', bool(imagens_atuais))
            avaliacao.updated_at = datetime.now()
            
            print(f"\n📊 RESULTADO FINAL:")
            print(f"   Total de imagens: {len(imagens_atuais)}")
            print(f"   tem_imagens: {getattr(avaliacao, 'tem_imagens', False)}")
            
            banco.session.commit()
            
            resultado = avaliacao.json()
            print(f"\n📤 RETORNANDO PARA FRONTEND:")
            print(f"   ID: {resultado['ID']}")
            print(f"   tem_imagens: {resultado['tem_imagens']}")
            print(f"   total_imagens: {len(resultado.get('imagens_urls', []))}")
            print(f"{'='*60}\n")
            
            return resultado, 200  # ✅ OK
            
        except Exception as e:
            banco.session.rollback()
            print(f"\n❌ ERRO AO ATUALIZAR AVALIAÇÃO:")
            print(f"   {str(e)}")
            traceback.print_exc()
            print(f"{'='*60}\n")
            return {
                'message': 'Erro interno ao atualizar avaliação.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

    @jwt_required()
    @cliente_required
    def delete(self, ID):
        """Remove uma avaliação de prato"""
        try:
            aval = avaliacaoPratoModel.find_by_id(ID)
            if not aval:
                return {
                    'message': 'Avaliação não encontrada.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
                
            # Obter e converter o ID do token
            usuario_id = get_jwt_identity()
            try:
                usuario_id_int = int(usuario_id)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            print(f"Comparando IDs: usuario={usuario_id_int} vs avaliacao_autor={aval['ID_Cliente']}")
            
            if usuario_id_int != aval['ID_Cliente']:
                return {
                    'message': 'Você não tem permissão para remover esta avaliação.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
                
            # Remover imagens do storage
            if aval.get('imagens_urls'):
                for img_url in aval['imagens_urls']:
                    try:
                        delete_image(img_url)
                    except Exception as e:
                        print(f"⚠️ Erro ao deletar imagem: {e}")
            
            # Remover avaliação
            sucesso = avaliacaoPratoModel.delete(ID)
            if not sucesso:
                return {
                    'message': 'Erro ao remover avaliação do banco de dados.',
                    'tipo_erro': 'database_error'
                }, 500  # ✅ Internal Server Error
            
            return {
                'message': 'Avaliação removida com sucesso.',
                'id': ID
            }, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao remover avaliação: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao remover avaliação.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error