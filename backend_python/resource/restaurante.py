# resource/restaurante.py
from flask import request, current_app, send_from_directory
from werkzeug.utils import secure_filename
from geopy.geocoders import Nominatim
import os
from flask_restx import Resource, Namespace, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.restaurante import restauranteModel
from models.avaliacao import avaliacaoModel
from resource.firebase_storage import upload_image, get_image_url, delete_image
from sql_alchemy import banco
from utils.decorators import restaurante_required
from sqlalchemy import case, func, desc, or_, and_
import traceback  # ✅ ADICIONAR

api = Namespace('restaurante', description='Operações com restaurantes')

# Definição do modelo para Swagger e para marshal
restaurante_fields = api.model('Restaurante', {
    'ID': fields.Integer(readOnly=True),
    'Nome': fields.String(required=True),
    'nome_fantasia': fields.String(required=True),
    'CNPJ': fields.String(required=True),
    'email': fields.String(required=True),
    'telefone': fields.String,
    'Endereco': fields.String,
    'Cidade': fields.String,
    'bairro': fields.String,
    'latitude': fields.Float,
    'longitude': fields.Float,
    'tipo_restaurante': fields.String,
    'descricao': fields.String,
    'imagem_url': fields.String(description='URL da imagem do restaurante', default=None)
})

@api.route('', '/<int:ID>')
class RestauranteResource(Resource):
    @api.marshal_with(restaurante_fields, as_list=False, skip_none=True)
    def get(self, ID):
        """Retorna um restaurante por ID"""
        try:
            print(f"🔍 Buscando restaurante com ID: {ID}")
            
            data = restauranteModel.find_restaurante(ID)
            if not data:
                return {
                    'message': 'Restaurante não encontrado.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            
            # ✅ Adicionar tags conquistadas
            from models.tag_restaurante import RestauranteTagsConquistadasModel
            
            # ✅ CORREÇÃO TEMPORÁRIA: Incluir tags sem ranking também
            tags_conquistadas = RestauranteTagsConquistadasModel.query.filter_by(
                ID_Restaurante=ID, ativo=True
            ).filter(
                # Aceitar tanto com ranking quanto sem ranking (para debug)
                (RestauranteTagsConquistadasModel.posicao_ranking.isnot(None)) |
                (RestauranteTagsConquistadasModel.posicao_ranking.is_(None))
            ).order_by(
                # MySQL equivalente ao nullslast()
                case(
                    (RestauranteTagsConquistadasModel.posicao_ranking.is_(None), 9999),
                    else_=RestauranteTagsConquistadasModel.posicao_ranking
                ).asc()
            ).limit(5).all()
            
            resultado = data.json() if hasattr(data, 'json') else data
            resultado['tags_conquistadas'] = [
                {
                    'ID': tag.ID,
                    'ID_Tag': tag.ID_Tag,
                    'nome': tag.tag.nome if tag.tag else '',
                    'categoria': tag.tag.categoria if tag.tag else '',
                    'icone': tag.tag.icone if tag.tag else '',
                    'descricao': tag.tag.descricao if tag.tag else '',
                    'posicao_ranking': tag.posicao_ranking,
                    'media_categoria': float(tag.media_categoria) if tag.media_categoria else 0,
                    'total_avaliacoes': tag.total_avaliacoes
                }
                for tag in tags_conquistadas
            ]
            
            return resultado, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar restaurante: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar restaurante.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

    @api.expect(restaurante_fields)
    @jwt_required()
    @restaurante_required
    def post(self):
        """Cria um novo restaurante"""
        try:
            dados = request.json or {}
            
            # ✅ Validação de campos obrigatórios
            campos_obrigatorios = ['Nome', 'nome_fantasia', 'CNPJ', 'email', 'Endereco', 'Cidade']
            campos_faltando = [campo for campo in campos_obrigatorios if not dados.get(campo)]
            
            if campos_faltando:
                return {
                    'message': 'Campos obrigatórios faltando.',
                    'tipo_erro': 'missing_fields',
                    'campos_faltando': campos_faltando
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Validar CNPJ único
            cnpj_existente = restauranteModel.query.filter_by(CNPJ=dados['CNPJ']).first()
            if cnpj_existente:
                return {
                    'message': 'CNPJ já cadastrado.',
                    'tipo_erro': 'duplicate_cnpj'
                }, 409  # ✅ Conflict
            
            # ✅ Validar email único
            email_existente = restauranteModel.query.filter_by(email=dados['email']).first()
            if email_existente:
                return {
                    'message': 'Email já cadastrado.',
                    'tipo_erro': 'duplicate_email'
                }, 409  # ✅ Conflict
            
            # Geocodificação automática
            if not dados.get('latitude') or not dados.get('longitude'):
                try:
                    geolocator = Nominatim(user_agent="restaurante_app")
                    endereco_completo = f"{dados['Endereco']}, {dados['Cidade']}, Brasil"
                    location = geolocator.geocode(endereco_completo, timeout=10)
                    
                    if location:
                        dados['latitude'] = location.latitude
                        dados['longitude'] = location.longitude
                    else:
                        print(f"⚠️ Não foi possível geocodificar: {endereco_completo}")
                        
                except Exception as e:
                    print(f"⚠️ Erro na geocodificação: {str(e)}")
                    # Continua sem bloquear o cadastro
            
            # Criar restaurante
            novo_restaurante = restauranteModel(**dados)
            novo_restaurante.save_restaurante()
            
            print(f"✅ Restaurante criado: ID={novo_restaurante.ID}, Nome={novo_restaurante.Nome}")
            
            return novo_restaurante.json(), 201  # ✅ Created
            
        except Exception as e:
            print(f"❌ Erro ao criar restaurante: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao salvar restaurante.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

    @api.expect(restaurante_fields)
    @jwt_required()
    @restaurante_required
    def put(self, ID):
        """Atualiza dados de um restaurante"""
        try:
            # ✅ Verificar se o restaurante existe
            restaurante = restauranteModel.find_restaurante(ID)
            if not restaurante:
                return {
                    'message': 'Restaurante não encontrado.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            
            # ✅ Verificar ownership
            usuario_logado = get_jwt_identity()
            try:
                usuario_logado_int = int(usuario_logado)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            if usuario_logado_int != ID:
                return {
                    'message': 'Você só pode editar seu próprio restaurante.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # Processar dados
            dados = request.get_json() or {}
            dados.pop('ID', None)
            dados.pop('confirmasenha', None)
            
            # ✅ Validar CNPJ único (se estiver sendo alterado)
            if 'CNPJ' in dados and dados['CNPJ'] != restaurante.CNPJ:
                cnpj_existente = restauranteModel.query.filter_by(CNPJ=dados['CNPJ']).first()
                if cnpj_existente:
                    return {
                        'message': 'CNPJ já cadastrado por outro restaurante.',
                        'tipo_erro': 'duplicate_cnpj'
                    }, 409  # ✅ Conflict
            
            # ✅ Validar email único (se estiver sendo alterado)
            if 'email' in dados and dados['email'] != restaurante.email:
                email_existente = restauranteModel.query.filter_by(email=dados['email']).first()
                if email_existente:
                    return {
                        'message': 'Email já cadastrado por outro restaurante.',
                        'tipo_erro': 'duplicate_email'
                    }, 409  # ✅ Conflict
            
            # Atualizar
            atualizado = restauranteModel.update_restaurante(ID, **dados)
            if not atualizado:
                return {
                    'message': 'Erro ao atualizar restaurante.',
                    'tipo_erro': 'update_failed'
                }, 500  # ✅ Internal Server Error
            
            print(f"✅ Restaurante atualizado: ID={ID}")
            
            return atualizado.json(), 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao editar restaurante: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao editar restaurante.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

    @jwt_required()
    @restaurante_required
    def delete(self, ID):
        """Exclui um restaurante"""
        try:
            # ✅ Verificar se o restaurante existe
            restaurante = restauranteModel.find_restaurante(ID)
            if not restaurante:
                return {
                    'message': 'Restaurante não encontrado.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            
            # ✅ Verificar ownership
            usuario_logado = get_jwt_identity()
            try:
                usuario_logado_int = int(usuario_logado)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            if usuario_logado_int != ID:
                return {
                    'message': 'Você só pode excluir seu próprio restaurante.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # Remover avaliações associadas
            try:
                avaliacaoModel.findandremove(ID)
            except Exception as e:
                print(f"⚠️ Erro ao remover avaliações: {e}")
            
            # Deletar restaurante
            sucesso = restauranteModel.delete_restaurante(ID)
            if not sucesso:
                return {
                    'message': 'Erro ao excluir restaurante do banco de dados.',
                    'tipo_erro': 'delete_failed'
                }, 500  # ✅ Internal Server Error
            
            print(f"✅ Restaurante excluído: ID={ID}")
            
            return {
                'message': 'Restaurante removido com sucesso.',
                'id': ID
            }, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao excluir restaurante: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao excluir restaurante.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error


@api.route('/menu')
class ListarRestaurantes(Resource):
    def get(self):
        """Lista todos os restaurantes com suas tags conquistadas"""
        try:
            print("\n📋 Listando todos os restaurantes com tags...")
            
            from models.tag_restaurante import RestauranteTagsConquistadasModel
            
            restaurantes = restauranteModel.query.all()
            print(f"   Total de restaurantes: {len(restaurantes)}")
            
            resultado = []
            
            for resto in restaurantes:
                resto_dict = resto.json()
                
                # ✅ CORREÇÃO: MySQL não suporta nullslast(), usar expressão condicional
                tags = RestauranteTagsConquistadasModel.query.filter_by(
                    ID_Restaurante=resto.ID,
                    ativo=True
                ).filter(
                    # Aceitar tanto com ranking quanto sem ranking (para debug)
                    (RestauranteTagsConquistadasModel.posicao_ranking.isnot(None)) |
                    (RestauranteTagsConquistadasModel.posicao_ranking.is_(None))
                ).order_by(
                    # MySQL equivalente ao nullslast(): NULL valores vão para o final
                    case(
                        (RestauranteTagsConquistadasModel.posicao_ranking.is_(None), 9999),
                        else_=RestauranteTagsConquistadasModel.posicao_ranking
                    ).asc()
                ).limit(5).all()
                
                print(f"\n   Restaurante: {resto.Nome} (ID: {resto.ID})")
                print(f"      Tags conquistadas: {len(tags)}")
                
                resto_dict['tags_conquistadas'] = []
                for tag in tags:
                    tag_info = {
                        'ID': tag.ID,
                        'ID_Tag': tag.ID_Tag,
                        'nome': tag.tag.nome if tag.tag else '',
                        'categoria': tag.tag.categoria if tag.tag else '',
                        'icone': tag.tag.icone if tag.tag else '',
                        'descricao': tag.tag.descricao if tag.tag else '',
                        'posicao_ranking': tag.posicao_ranking,
                        'media_categoria': float(tag.media_categoria) if tag.media_categoria else 0
                    }
                    resto_dict['tags_conquistadas'].append(tag_info)
                    print(f"         - {tag_info['nome']} (#{tag.posicao_ranking})")
                
                resultado.append(resto_dict)
            
            print(f"\n✅ Retornando {len(resultado)} restaurantes com tags")
            return resultado, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao listar restaurantes: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao listar restaurantes.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error
    
@api.route('/filtrar/<string:tipo_restaurante>')
class FiltrarRestaurante(Resource):
    def get(self, tipo_restaurante):
        """Filtra restaurantes por tipo"""
        try:
            if not tipo_restaurante or tipo_restaurante.lower() in ("nenhum", "todos"):
                return restauranteModel.find_all_restaurante(), 200  # ✅ OK
            
            return restauranteModel.find_tipo_restaurante(tipo_restaurante), 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao filtrar restaurantes: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao filtrar restaurantes.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/encontrarRestaurante/<string:email>')
class EncontrarEmailRes(Resource):
    def get(self, email):
        """Busca restaurante por email"""
        try:
            # ✅ Validar email
            if not email or '@' not in email:
                return {
                    'message': 'Email inválido.',
                    'tipo_erro': 'invalid_email'
                }, 422  # ✅ Unprocessable Entity
            
            resultado = restauranteModel.buscar_email_restaurante(email)
            
            if not resultado:
                return {
                    'message': 'Restaurante não encontrado com este email.',
                    'tipo_erro': 'not_found'
                }, 404  # ✅ Not Found
            
            return resultado, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar por email: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar restaurante.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/tipo/<string:tipo_restaurante>')
class TipoRestaurante(Resource):
    def get(self, tipo_restaurante):
        """Busca restaurantes por tipo"""
        try:
            restaurantes = restauranteModel.find_tipo_restaurante(tipo_restaurante)
            
            if not restaurantes:
                return {
                    'message': 'Nenhum restaurante encontrado com esse tipo.',
                    'tipo_erro': 'not_found',
                    'tipo_buscado': tipo_restaurante
                }, 404  # ✅ Not Found
            
            return restaurantes, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar por tipo: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar restaurantes.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error
    
@api.route('/recomendados/<string:tipo_restaurante>')
class RestaurantesRecomendados(Resource):
    def get(self, tipo_restaurante):
        """Retorna os 5 restaurantes mais bem avaliados"""
        try:

            q = (
                banco.session.query(
                    restauranteModel,
                    func.coalesce(func.avg(avaliacaoModel.Nota), 0).label('media')
                )
                .outerjoin(avaliacaoModel, avaliacaoModel.ID_Restaurante == restauranteModel.ID)
            )
            
            if tipo_restaurante and tipo_restaurante.lower() not in ('todos', 'nenhum'):
                q = q.filter(restauranteModel.tipo_restaurante == tipo_restaurante)

            rows = (
                q.group_by(restauranteModel.ID)
                 .order_by(desc('media'))
                 .limit(5)
                 .all()
            )

            return [
                {**r.json(), 'mediaAvaliacoes': float(media)}
                for (r, media) in rows
            ], 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar recomendados: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar restaurantes recomendados.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/pesquisarRestaurante/<string:Nome>')
class PesquisarRestaurante(Resource):
    def get(self, Nome):
        """Pesquisa restaurantes por nome"""
        try:
            # ✅ Validar nome
            if len(Nome.strip()) < 2:
                return {
                    'message': 'Nome de busca deve ter pelo menos 2 caracteres.',
                    'tipo_erro': 'invalid_search_term',
                    'tamanho_minimo': 2
                }, 422  # ✅ Unprocessable Entity
            
            restaurantes = restauranteModel.find_name_restaurante(Nome)
            
            if not restaurantes:
                return {
                    'message': 'Nenhum restaurante encontrado com esse nome.',
                    'tipo_erro': 'not_found',
                    'termo_buscado': Nome
                }, 404  # ✅ Not Found
            
            return restaurantes, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao pesquisar restaurante: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao pesquisar restaurantes.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error
    

@api.route('/<int:ID>/upload-imagem')
class RestauranteImagemUpload(Resource):
    @jwt_required()
    @restaurante_required
    def post(self, ID):
        """Faz upload de uma imagem para o restaurante"""
        try:
            # ✅ Verificar se o restaurante existe
            restaurante = restauranteModel.query.get(ID)
            if not restaurante:
                return {
                    'message': 'Restaurante não encontrado.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            
            # ✅ Verificar ownership
            usuario_logado = get_jwt_identity()
            try:
                usuario_logado_int = int(usuario_logado)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            if usuario_logado_int != ID:
                return {
                    'message': 'Você só pode fazer upload de imagens para seu próprio restaurante.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden

            # ✅ Validar arquivo
            if 'imagem' not in request.files:
                return {
                    'message': 'Nenhuma imagem foi enviada.',
                    'tipo_erro': 'no_file'
                }, 422  # ✅ Unprocessable Entity

            file = request.files['imagem']
            if file.filename == '':
                return {
                    'message': 'Nome de arquivo vazio.',
                    'tipo_erro': 'empty_filename'
                }, 422  # ✅ Unprocessable Entity

            # ✅ Validar extensão
            allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp', 'avif'}
            extensao = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
            
            if extensao not in allowed_extensions:
                return {
                    'message': f'Formato de arquivo não permitido. Use: {", ".join(allowed_extensions)}',
                    'tipo_erro': 'invalid_file_format',
                    'extensao_recebida': extensao,
                    'extensoes_validas': list(allowed_extensions)
                }, 422  # ✅ Unprocessable Entity

            # Gerar nome único
            filename = secure_filename(f"restaurante_{ID}_{file.filename}")
            
            # Upload
            image_url = upload_image(file, folder="restaurantes", filename=filename, use_local_fallback=True)
            
            if not image_url:
                return {
                    'message': 'Erro ao fazer upload da imagem.',
                    'tipo_erro': 'upload_failed'
                }, 500  # ✅ Internal Server Error
            
            # Atualizar banco
            restaurante.imagem_url = image_url
            banco.session.commit()
            
            print(f"✅ Imagem do restaurante atualizada: ID={ID}")
            
            return {
                'message': 'Imagem enviada com sucesso.',
                'imagem_url': image_url
            }, 200  # ✅ OK
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro no upload da imagem: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao processar imagem.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/proximos')
class RestaurantesProximos(Resource):
    @api.expect(api.model('BuscaProximos', {
        'latitude': fields.Float(required=True),
        'longitude': fields.Float(required=True),
        'tipo_restaurante': fields.String(required=False),
        'raio_km': fields.Float(required=False, default=5)
    }))
    def post(self):
        """Busca restaurantes próximos a uma localização"""
        try:
            dados = request.get_json() or {}
            
            # ✅ Validar coordenadas
            lat = dados.get('latitude')
            lng = dados.get('longitude')
            
            if lat is None or lng is None:
                return {
                    'message': 'Latitude e longitude são obrigatórias.',
                    'tipo_erro': 'missing_coordinates'
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Validar range de coordenadas
            if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                return {
                    'message': 'Coordenadas inválidas.',
                    'tipo_erro': 'invalid_coordinates'
                }, 422  # ✅ Unprocessable Entity
            
            tipo_restaurante = dados.get('tipo_restaurante')
            raio_km = dados.get('raio_km', 5)
            
            # ✅ Validar raio
            if raio_km <= 0 or raio_km > 100:
                return {
                    'message': 'Raio deve estar entre 0 e 100 km.',
                    'tipo_erro': 'invalid_radius'
                }, 422  # ✅ Unprocessable Entity

            restaurantes = restauranteModel.encontrar_proximos(lat, lng, tipo_restaurante, raio_km)

            def calcular_distancia(lat1, lon1, lat2, lon2):
                from math import radians, sin, cos, sqrt, atan2
                if lat2 is None or lon2 is None:
                    return None
                R = 6371
                dlat = radians(lat2 - lat1)
                dlon = radians(lon2 - lon1)
                a = sin(dlat/2)**2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon/2)**2
                c = 2 * atan2(sqrt(a), sqrt(1 - a))
                return R * c

            resp = []
            for r in restaurantes:
                dist = calcular_distancia(lat, lng, r.latitude, r.longitude)
                if dist is None:
                    continue
                resp.append({
                    'ID': r.ID,  # ✅ Usar ID maiúsculo para compatibilidade com frontend
                    'Nome': r.Nome,
                    'nome': r.Nome,  # ✅ Adicionar nome minúsculo também
                    'nome_fantasia': r.nome_fantasia,  # ✅ Adicionar nome_fantasia
                    'descricao': r.descricao,  # ✅ Adicionar descrição
                    'tipo_restaurante': r.tipo_restaurante,
                    'distancia_km': round(dist, 2),
                    'bairro': r.bairro,
                    'Cidade': r.Cidade,
                    'imagem_url': r.imagem_url
                })
            
            return resp, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar restaurantes próximos: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar restaurantes próximos.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error
     
@api.route('/tipos')
class TiposRestaurante(Resource):
    def get(self):
        """Lista os tipos de restaurante disponíveis"""
        try:
            tipos = ['Arabe','Brasileira','Carnes','Chinesa','Francesa','Frango',
                'Italiana','Japonesa','Lanches','Mexicana','Peixes',
                'Pizzaria','Saudavel','Vegana','Vegetariana']
            return {'tipos': tipos}, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao listar tipos: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao listar tipos.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/busca-avancada')
class BuscaAvancadaRestaurante(Resource):
    @api.expect(api.model('FiltroAvancado', {
        'termo': fields.String(required=False, description='Termo para pesquisa no nome ou descrição'),
        'tipo_restaurante': fields.String(required=False, description='Tipo de restaurante'),
        'cidade': fields.String(required=False, description='Cidade'),
        'estado': fields.String(required=False, description='Estado (UF)'),
        'bairro': fields.String(required=False, description='Bairro'),
        'latitude': fields.Float(required=False, description='Latitude para busca por proximidade'),
        'longitude': fields.Float(required=False, description='Longitude para busca por proximidade'),
        'raio_km': fields.Float(required=False, description='Raio de busca em km', default=10)
    }))
    def post(self):
        """Realiza uma busca avançada com múltiplos filtros"""
        try:
            dados = request.get_json() or {}
            query = restauranteModel.query
            
            # Filtro por termo (nome ou descrição)
            if termo := dados.get('termo'):
                if len(termo.strip()) < 2:
                    return {
                        'message': 'Termo de busca deve ter pelo menos 2 caracteres.',
                        'tipo_erro': 'invalid_search_term'
                    }, 422  # ✅ Unprocessable Entity
                
                query = query.filter(
                    or_(
                        restauranteModel.Nome.ilike(f'%{termo}%'),
                        restauranteModel.descricao.ilike(f'%{termo}%')
                    )
                )
            
            # Filtro por tipo de restaurante
            if tipo := dados.get('tipo_restaurante'):
                if tipo.lower() not in ('todos', 'nenhum', ''):
                    query = query.filter(restauranteModel.tipo_restaurante == tipo)
            
            # Filtro por cidade
            if cidade := dados.get('cidade'):
                query = query.filter(restauranteModel.Cidade.ilike(f'%{cidade}%'))
            
            # Filtro por bairro
            if bairro := dados.get('bairro'):
                query = query.filter(restauranteModel.bairro.ilike(f'%{bairro}%'))
            
            # Filtro por proximidade geográfica
            if (lat := dados.get('latitude')) is not None and (lng := dados.get('longitude')) is not None:
                # ✅ Validar coordenadas
                if not (-90 <= lat <= 90) or not (-180 <= lng <= 180):
                    return {
                        'message': 'Coordenadas inválidas.',
                        'tipo_erro': 'invalid_coordinates'
                    }, 422  # ✅ Unprocessable Entity
                
                raio_km = dados.get('raio_km', 10)
                
                # ✅ Validar raio
                if raio_km <= 0 or raio_km > 100:
                    return {
                        'message': 'Raio deve estar entre 0 e 100 km.',
                        'tipo_erro': 'invalid_radius'
                    }, 422  # ✅ Unprocessable Entity
                
                # Fórmula de Haversine para cálculo de distância geográfica
                query = query.filter(
                    (6371 * 
                    func.acos(
                        func.cos(func.radians(lat)) * 
                        func.cos(func.radians(restauranteModel.latitude)) * 
                        func.cos(func.radians(restauranteModel.longitude) - func.radians(lng)) + 
                        func.sin(func.radians(lat)) * 
                        func.sin(func.radians(restauranteModel.latitude))
                    )) <= raio_km
                )
            
            restaurantes = query.all()
            resultado = []
            
            for r in restaurantes:
                restaurante_dict = r.json()
                
                # Se temos coordenadas, calcular a distância
                if (lat := dados.get('latitude')) is not None and (lng := dados.get('longitude')) is not None and r.latitude and r.longitude:
                    from math import radians, sin, cos, sqrt, atan2
                    
                    # Fórmula de Haversine para distância
                    R = 6371  # Raio da Terra em km
                    d_lat = radians(r.latitude - lat)
                    d_lng = radians(r.longitude - lng)
                    a = (sin(d_lat/2) * sin(d_lat/2) + 
                         cos(radians(lat)) * cos(radians(r.latitude)) * 
                         sin(d_lng/2) * sin(d_lng/2))
                    c = 2 * atan2(sqrt(a), sqrt(1-a))
                    distancia = R * c
                    
                    restaurante_dict['distancia_km'] = round(distancia, 2)
                
                resultado.append(restaurante_dict)
            
            # Ordenar por distância se disponível, senão pelo nome
            if dados.get('latitude') is not None and dados.get('longitude') is not None:
                resultado.sort(key=lambda x: x.get('distancia_km', float('inf')))
            else:
                resultado.sort(key=lambda x: x['Nome'])
                
            return resultado, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro na busca avançada: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao realizar busca avançada.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error