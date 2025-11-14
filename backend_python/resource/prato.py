from flask import request, current_app, url_for
from flask_restx import Resource, Namespace, fields, reqparse
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.prato import pratoModel
from models.restaurante import restauranteModel
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
from datetime import datetime, timedelta
import os
from sql_alchemy import banco
from resource.firebase_storage import upload_image, get_image_url, delete_image
from sqlalchemy import text
from utils.decorators import restaurante_required
import traceback  # ✅ ADICIONAR

api = Namespace('prato', description='Operações com pratos do cardápio')

prato_fields = api.model('Prato', {
    'ID': fields.Integer(readOnly=True),
    'Nome': fields.String(required=True, description='Nome do prato'),
    'descricao': fields.String(description='Descrição do prato'),
    'preco': fields.Float(required=True, description='Preço do prato'),
    'restaurante_id': fields.Integer(required=True, description='ID do restaurante'),
    'imagem_url': fields.String(description='URL da imagem do prato'),
    'mediaAvaliacoes': fields.Float(readonly=True, description='Média de avaliações'),
    'totalAvaliacoes': fields.Integer(readonly=True, description='Total de avaliações')
})

upload_parser = reqparse.RequestParser()
upload_parser.add_argument(
    'file',
    location='files',
    type=FileStorage,
    required=True,
    help='Arquivo de imagem do prato'
)

@api.route('')
@api.route('/<int:ID>')
class PratoResource(Resource):
    @jwt_required(optional=True)
    @api.marshal_with(prato_fields, as_list=True)
    def get(self, ID=None):
        """Lista todos os pratos ou retorna um prato específico por ID"""
        try:
            if ID is None:
                pratos = pratoModel.find_all()
                return pratos, 200  # ✅ OK
            
            resultado = pratoModel.find_by_id(ID)
            if not resultado:
                return {
                    'message': 'Prato não encontrado.',
                    'tipo_erro': 'not_found',
                    'id': ID
                }, 404  # ✅ Not Found
            
            return resultado, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar prato(s): {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar prato(s).',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

    @jwt_required()
    @restaurante_required
    @api.expect(prato_fields, validate=True)
    @api.marshal_with(prato_fields, code=201)
    def post(self):
        """Cria um novo prato ligado a um restaurante existente"""
        try:
            dados = request.json or {}
            
            # ✅ Validação de campos obrigatórios
            campos_obrigatorios = ['Nome', 'preco', 'restaurante_id']
            campos_faltando = [campo for campo in campos_obrigatorios if not dados.get(campo)]
            
            if campos_faltando:
                return {
                    'message': 'Campos obrigatórios faltando.',
                    'tipo_erro': 'missing_fields',
                    'campos_faltando': campos_faltando
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Validar nome do prato
            if len(dados['Nome'].strip()) < 3:
                return {
                    'message': 'Nome do prato deve ter pelo menos 3 caracteres.',
                    'tipo_erro': 'invalid_name',
                    'tamanho_minimo': 3,
                    'tamanho_atual': len(dados['Nome'].strip())
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Validar preço
            try:
                preco = float(dados['preco'])
                if preco <= 0:
                    return {
                        'message': 'Preço deve ser maior que zero.',
                        'tipo_erro': 'invalid_price',
                        'valor_recebido': preco
                    }, 422  # ✅ Unprocessable Entity
            except (ValueError, TypeError):
                return {
                    'message': 'Preço inválido.',
                    'tipo_erro': 'invalid_price_format'
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Verificar se o restaurante existe
            restaurante_id = dados['restaurante_id']
            restaurante = restauranteModel.find_restaurante(restaurante_id)
            if not restaurante:
                return {
                    'message': 'Restaurante não encontrado.',
                    'tipo_erro': 'restaurant_not_found',
                    'restaurante_id': restaurante_id
                }, 404  # ✅ Not Found
            
            # ✅ Verificar ownership (restaurante só pode criar pratos para si mesmo)
            usuario_logado = get_jwt_identity()
            try:
                usuario_logado_int = int(usuario_logado)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            if usuario_logado_int != restaurante_id:
                return {
                    'message': 'Você só pode criar pratos para seu próprio restaurante.',
                    'tipo_erro': 'forbidden',
                    'restaurante_logado': usuario_logado_int,
                    'restaurante_tentado': restaurante_id
                }, 403  # ✅ Forbidden
            
            # ✅ Verificar prato duplicado
            pratos_existentes = pratoModel.find_by_restaurante(restaurante_id)
            if any(p.get('Nome', '').lower() == dados['Nome'].lower() for p in pratos_existentes):
                return {
                    'message': f'Já existe um prato com o nome "{dados["Nome"]}" neste restaurante.',
                    'tipo_erro': 'duplicate_dish'
                }, 409  # ✅ Conflict
            
            # Criar prato
            novo = pratoModel(**dados)
            novo.save_prato()
            
            print(f"✅ Prato criado: ID={novo.ID}, Nome={novo.Nome}")
            
            return novo.json(), 201  # ✅ Created
            
        except Exception as e:
            print(f"❌ Erro ao criar prato: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao criar prato.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

    @jwt_required()
    @restaurante_required
    @api.expect(prato_fields, validate=True)
    @api.marshal_with(prato_fields)
    def put(self, ID):
        """Atualiza os dados de um prato existente"""
        try:
            # ✅ Verificar se o prato existe
            prato = pratoModel.find_by_id(ID)
            if not prato:
                return {
                    'message': 'Prato não encontrado.',
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
            
            restaurante_id_prato = prato.get('restaurante_id')
            if usuario_logado_int != restaurante_id_prato:
                return {
                    'message': 'Você só pode editar pratos do seu próprio restaurante.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # Validar dados
            dados = request.json or {}
            dados.pop('ID', None)
            dados.pop('restaurante_id', None)  # Não permitir mudar o restaurante
            
            # ✅ Validar nome se fornecido
            if 'Nome' in dados and len(dados['Nome'].strip()) < 3:
                return {
                    'message': 'Nome do prato deve ter pelo menos 3 caracteres.',
                    'tipo_erro': 'invalid_name'
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Validar preço se fornecido
            if 'preco' in dados:
                try:
                    preco = float(dados['preco'])
                    if preco <= 0:
                        return {
                            'message': 'Preço deve ser maior que zero.',
                            'tipo_erro': 'invalid_price'
                        }, 422  # ✅ Unprocessable Entity
                except (ValueError, TypeError):
                    return {
                        'message': 'Preço inválido.',
                        'tipo_erro': 'invalid_price_format'
                    }, 422  # ✅ Unprocessable Entity
            
            # Atualizar prato
            atualizado = pratoModel.update_prato(ID, **dados)
            if not atualizado:
                return {
                    'message': 'Erro ao atualizar prato.',
                    'tipo_erro': 'update_failed'
                }, 500  # ✅ Internal Server Error
            
            print(f"✅ Prato atualizado: ID={ID}")
            
            return atualizado.json(), 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao atualizar prato: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao atualizar prato.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

    @jwt_required()
    @restaurante_required
    def delete(self, ID):
        """Exclui um prato"""
        try:
            # ✅ Verificar se o prato existe
            prato = pratoModel.find_by_id(ID)
            if not prato:
                return {
                    'message': 'Prato não encontrado.',
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
            
            restaurante_id_prato = prato.get('restaurante_id')
            if usuario_logado_int != restaurante_id_prato:
                return {
                    'message': 'Você só pode excluir pratos do seu próprio restaurante.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # Deletar imagem se existir
            if prato.get('imagem_url'):
                try:
                    delete_image(prato['imagem_url'])
                except Exception as e:
                    print(f"⚠️ Erro ao deletar imagem: {e}")
            
            # Deletar prato
            sucesso = pratoModel.delete_prato(ID)
            if not sucesso:
                return {
                    'message': 'Erro ao excluir prato do banco de dados.',
                    'tipo_erro': 'delete_failed'
                }, 500  # ✅ Internal Server Error
            
            print(f"✅ Prato excluído: ID={ID}")
            
            return {
                'message': 'Prato removido com sucesso.',
                'id': ID
            }, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao excluir prato: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao excluir prato.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/restaurante/<int:restaurante_id>')
class PratosDoRestaurante(Resource):
    @api.marshal_with(prato_fields, as_list=True)
    def get(self, restaurante_id):
        """Lista todos os pratos de um restaurante específico"""
        try:
            # ✅ Verificar se o restaurante existe
            restaurante = restauranteModel.find_restaurante(restaurante_id)
            if not restaurante:
                return {
                    'message': 'Restaurante não encontrado.',
                    'tipo_erro': 'restaurant_not_found',
                    'restaurante_id': restaurante_id
                }, 404  # ✅ Not Found
            
            pratos = pratoModel.find_by_restaurante(restaurante_id)
            return pratos, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar pratos do restaurante: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar pratos.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/search/<string:Nome>')
class PratoSearch(Resource):
    @api.marshal_with(prato_fields, as_list=True)
    def get(self, Nome):
        """Filtra pratos pelo nome (contains)"""
        try:
            # ✅ Validar nome
            if len(Nome.strip()) < 2:
                return {
                    'message': 'Nome de busca deve ter pelo menos 2 caracteres.',
                    'tipo_erro': 'invalid_search_term',
                    'tamanho_minimo': 2
                }, 422  # ✅ Unprocessable Entity
            
            pratos = pratoModel.find_by_name(Nome)
            return pratos, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar pratos por nome: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar pratos.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/<int:ID>/upload')
class PratoUpload(Resource):
    @jwt_required()
    @restaurante_required
    @api.expect(upload_parser)
    def post(self, ID):
        """
        Faz upload de uma imagem para o prato ID usando Firebase Storage
        com fallback para armazenamento local
        """
        try:
            # ✅ Verificar se o prato existe
            prato_obj = pratoModel.query.get(ID)
            if not prato_obj:
                return {
                    'message': 'Prato não encontrado.',
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
            
            if prato_obj.restaurante_id != usuario_logado_int:
                return {
                    'message': 'Você só pode fazer upload de imagens para pratos do seu próprio restaurante.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # ✅ Validar arquivo
            args = upload_parser.parse_args()
            arquivo = args.get('file')
            
            if not arquivo or not arquivo.filename:
                return {
                    'message': 'Nenhum arquivo foi enviado.',
                    'tipo_erro': 'no_file'
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Validar extensão
            extensao = arquivo.filename.lower().split('.')[-1]
            extensoes_validas = ['png', 'jpg', 'jpeg', 'gif', 'webp']
            if extensao not in extensoes_validas:
                return {
                    'message': f'Formato de arquivo não suportado. Use: {", ".join(extensoes_validas)}',
                    'tipo_erro': 'invalid_file_format',
                    'extensao_recebida': extensao,
                    'extensoes_validas': extensoes_validas
                }, 422  # ✅ Unprocessable Entity
            
            # Deletar imagem anterior se existir
            if prato_obj.imagem_url:
                try:
                    delete_image(prato_obj.imagem_url)
                except Exception as e:
                    print(f"⚠️ Erro ao deletar imagem anterior: {e}")
            
            # Gerar nome de arquivo único
            filename = secure_filename(f"prato_{ID}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{arquivo.filename}")
            
            # Fazer upload
            imagem_url = upload_image(arquivo, folder="pratos", filename=filename, use_local_fallback=True)
            
            if not imagem_url:
                return {
                    'message': 'Erro ao fazer upload da imagem.',
                    'tipo_erro': 'upload_failed'
                }, 500  # ✅ Internal Server Error
            
            # Atualizar URL da imagem no banco de dados
            prato_obj.imagem_url = imagem_url
            banco.session.commit()
            
            print(f"✅ Imagem do prato atualizada: ID={ID}")
            
            return {
                'ID': ID,
                'message': 'Imagem enviada com sucesso.',
                'imagem_url': imagem_url
            }, 200  # ✅ OK
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro no upload da imagem do prato: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao processar imagem.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/destaques/<int:restaurante_id>')
class PratosDestaques(Resource):
    @api.doc(params={
        'limit': 'Quantidade máxima (default 3)',
        'min': 'Mínimo de avaliações para entrar (default 1)'
    })
    def get(self, restaurante_id):
        """Retorna os pratos em destaque de um restaurante"""
        try:
            # ✅ Verificar se o restaurante existe
            restaurante = restauranteModel.find_restaurante(restaurante_id)
            if not restaurante:
                return {
                    'message': 'Restaurante não encontrado.',
                    'tipo_erro': 'restaurant_not_found',
                    'restaurante_id': restaurante_id
                }, 404  # ✅ Not Found
            
            # ✅ Validar parâmetros
            try:
                limit = int(request.args.get('limit', 3))
                min_av = int(request.args.get('min', 1))
                
                if limit < 1 or limit > 20:
                    return {
                        'message': 'Limite deve estar entre 1 e 20.',
                        'tipo_erro': 'invalid_limit'
                    }, 422  # ✅ Unprocessable Entity
                
                if min_av < 0:
                    return {
                        'message': 'Mínimo de avaliações não pode ser negativo.',
                        'tipo_erro': 'invalid_min'
                    }, 422  # ✅ Unprocessable Entity
                    
            except ValueError:
                limit, min_av = 3, 1
            
            destaques = pratoModel.top_rated(restaurante_id, limit=limit, min_avaliacoes=min_av)
            return destaques, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar pratos em destaque: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar pratos em destaque.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/restaurante/<int:id>/estatisticas-mensais')
class EstatisticasMensais(Resource):
    def get(self, id):
        """Retorna estatísticas mensais de avaliações de pratos"""
        try:
            # ✅ Verificar se o restaurante existe
            restaurante = restauranteModel.find_restaurante(id)
            if not restaurante:
                return {
                    'message': 'Restaurante não encontrado.',
                    'tipo_erro': 'restaurant_not_found',
                    'restaurante_id': id
                }, 404  # ✅ Not Found
            
            # ✅ Validar parâmetro
            try:
                meses = int(request.args.get('meses', 6))
                if meses < 1 or meses > 24:
                    return {
                        'message': 'Parâmetro "meses" deve estar entre 1 e 24.',
                        'tipo_erro': 'invalid_months_param'
                    }, 422  # ✅ Unprocessable Entity
            except ValueError:
                meses = 6
            
            # Calcular a data limite
            data_limite = datetime.now() - timedelta(days=30*meses)
            
            # SQL personalizado
            sql = """
            SELECT 
                DATE_FORMAT(ap.created_at, '%Y-%m') as mes,
                COUNT(ap.ID) as total_avaliacoes,
                AVG(ap.Nota) as media_nota
            FROM AvaliacaoPrato ap
            JOIN Prato p ON ap.ID_Prato = p.ID
            WHERE p.restaurante_id = :restaurante_id 
            AND ap.created_at >= :data_limite
            GROUP BY DATE_FORMAT(ap.created_at, '%Y-%m')
            ORDER BY mes ASC
            """
            
            result = banco.session.execute(text(sql), {
                "restaurante_id": id, 
                "data_limite": data_limite.strftime('%Y-%m-%d')
            })
            
            # Estruturar dados por mês
            estatisticas_meses = {}
            for row in result:
                mes = row[0]
                estatisticas_meses[mes] = {
                    "total": row[1],
                    "media": float(row[2]) if row[2] else 0
                }
            
            # Preencher meses faltantes
            hoje = datetime.now()
            for i in range(meses):
                data = hoje - timedelta(days=30*i)
                mes_chave = data.strftime('%Y-%m')
                if mes_chave not in estatisticas_meses:
                    estatisticas_meses[mes_chave] = {"total": 0, "media": 0}
            
            # Calcular estatísticas agregadas
            total_geral = sum(mes["total"] for mes in estatisticas_meses.values())
            media_ponderada = 0
            
            if total_geral > 0:
                soma_ponderada = sum(mes["media"] * mes["total"] for mes in estatisticas_meses.values())
                media_ponderada = soma_ponderada / total_geral
            
            return {
                "meses": estatisticas_meses,
                "total_geral": total_geral,
                "media_geral": float(media_ponderada)
            }, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar estatísticas mensais: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar estatísticas.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/restaurante/<int:id>/melhores')
class PratosMelhores(Resource):
    def get(self, id):
        """Retorna os pratos mais bem avaliados do restaurante"""
        try:
            # ✅ Verificar se o restaurante existe
            restaurante = restauranteModel.find_restaurante(id)
            if not restaurante:
                return {
                    'message': 'Restaurante não encontrado.',
                    'tipo_erro': 'restaurant_not_found',
                    'restaurante_id': id
                }, 404  # ✅ Not Found
            
            # ✅ Validar parâmetro
            try:
                limite = int(request.args.get('limite', 5))
                if limite < 1 or limite > 50:
                    return {
                        'message': 'Parâmetro "limite" deve estar entre 1 e 50.',
                        'tipo_erro': 'invalid_limit'
                    }, 422  # ✅ Unprocessable Entity
            except ValueError:
                limite = 5
            
            sql = """
            SELECT p.ID, p.Nome, p.descricao, p.preco, p.imagem_url,
                   COALESCE(AVG(ap.Nota), 0) as mediaAvaliacao,
                   COUNT(ap.ID) as totalAvaliacoes
            FROM Prato p
            LEFT JOIN AvaliacaoPrato ap ON p.ID = ap.ID_Prato
            WHERE p.restaurante_id = :restaurante_id
            GROUP BY p.ID
            HAVING COUNT(ap.ID) > 0
            ORDER BY mediaAvaliacao DESC, totalAvaliacoes DESC
            LIMIT :limite
            """
            
            result = banco.session.execute(text(sql), {"restaurante_id": id, "limite": limite})
            
            pratos = [{
                "ID": row[0],
                "nomePrato": row[1],
                "descricao": row[2],
                "preco": float(row[3]),
                "imagem_url": row[4],
                "mediaAvaliacao": float(row[5]),
                "totalAvaliacoes": row[6]
            } for row in result]
            
            return pratos, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar melhores pratos: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar melhores pratos.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error