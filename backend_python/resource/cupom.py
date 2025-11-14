from flask import request, current_app
from flask_restx import Resource, Namespace, fields, reqparse
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.cupom import cupomModel
from models.pontos_usuario import pontosUsuarioModel, historicoModel
from models.restaurante import restauranteModel
from models.usuario import UsuarioModel
from datetime import datetime, timedelta
from sql_alchemy import banco
from sqlalchemy import text  # ✅ ADICIONADO: Para consultas SQL em texto
from utils.decorators import restaurante_required, cliente_required
import traceback

api = Namespace('cupons', description='Sistema de cupons e pontos de fidelidade')

# Modelo para criação de cupom (apenas campos de entrada)
cupom_create_fields = api.model('CupomCreate', {
    'titulo': fields.String(required=True, description='Título do cupom'),
    'descricao': fields.String(description='Descrição do cupom'),
    'desconto_percentual': fields.Float(description='Desconto em percentual'),
    'desconto_valor': fields.Float(description='Desconto em valor fixo'),
    'valor_minimo': fields.Float(description='Valor mínimo para usar o cupom'),
    'pontos_necessarios': fields.Integer(required=True, description='Pontos necessários para resgatar'),
    'restaurante_id': fields.Integer(required=True, description='ID do restaurante'),
    'data_validade': fields.DateTime(required=True, description='Data de validade do cupom'),
    'ativo': fields.Boolean(description='Se o cupom está ativo'),
    'max_usos': fields.Integer(description='Máximo de usos permitidos')
})

# Modelo completo para resposta
cupom_fields = api.model('Cupom', {
    'ID': fields.Integer(readOnly=True),
    'codigo': fields.String(description='Código único do cupom'),
    'titulo': fields.String(required=True, description='Título do cupom'),
    'descricao': fields.String(description='Descrição do cupom'),
    'desconto_percentual': fields.Float(description='Desconto em percentual'),
    'desconto_valor': fields.Float(description='Desconto em valor fixo'),
    'valor_minimo': fields.Float(description='Valor mínimo para usar o cupom'),
    'pontos_necessarios': fields.Integer(required=True, description='Pontos necessários para resgatar'),
    'restaurante_id': fields.Integer(required=True, description='ID do restaurante'),
    'data_validade': fields.DateTime(required=True, description='Data de validade do cupom'),
    'ativo': fields.Boolean(description='Se o cupom está ativo'),
    'max_usos': fields.Integer(description='Máximo de usos permitidos'),
    'usos_restantes': fields.Integer(readOnly=True, description='Usos restantes'),
    'expirado': fields.Boolean(readOnly=True, description='Se o cupom expirou'),
    'disponivel': fields.Boolean(readOnly=True, description='Se o cupom está disponível'),
    'created_at': fields.String(readOnly=True, description='Data de criação'),
    'updated_at': fields.String(readOnly=True, description='Data de atualização')
})

pontos_fields = api.model('Pontos', {
    'cliente_id': fields.Integer(description='ID do cliente'),
    'restaurante_id': fields.Integer(description='ID do restaurante'),
    'pontos_totais': fields.Integer(description='Total de pontos ganhos'),
    'pontos_utilizados': fields.Integer(description='Total de pontos utilizados'),
    'pontos_disponiveis': fields.Integer(description='Pontos disponíveis para uso'),
    'cliente_nome': fields.String(description='Nome do cliente'),
    'restaurante_nome': fields.String(description='Nome do restaurante')
})

@api.route('')
class CupomList(Resource):
    @jwt_required(optional=True)
    @api.marshal_list_with(cupom_fields)
    def get(self):
        """Lista todos os cupons"""
        try:
            cupons = cupomModel.find_all()
            return cupons, 200
        except Exception as e:
            print(f"❌ Erro ao listar cupons: {str(e)}")
            traceback.print_exc()
            return {"message": "Erro interno do servidor"}, 500

    @jwt_required()
    @restaurante_required
    @api.expect(cupom_create_fields, validate=True)
    @api.marshal_with(cupom_fields, code=201)
    def post(self):
        """Cria um novo cupom"""
        try:
            dados = request.json or {}
            print(f"🔍 Dados recebidos para criação do cupom: {dados}")
            
            # Validações
            campos_obrigatorios = ['titulo', 'pontos_necessarios', 'restaurante_id', 'data_validade']
            campos_faltando = [campo for campo in campos_obrigatorios if not dados.get(campo)]
            print(f"🔍 Campos obrigatórios: {campos_obrigatorios}")
            print(f"🔍 Campos faltando: {campos_faltando}")
            
            if campos_faltando:
                return {
                    "message": f"Campos obrigatórios faltando: {', '.join(campos_faltando)}"
                }, 400
            
            # Verificar se tem pelo menos um tipo de desconto
            if not dados.get('desconto_percentual') and not dados.get('desconto_valor'):
                return {
                    "message": "É necessário definir desconto_percentual OU desconto_valor"
                }, 400
            
            # Validar desconto percentual
            if dados.get('desconto_percentual'):
                if not (0 < dados['desconto_percentual'] <= 100):
                    return {"message": "Desconto percentual deve estar entre 0.1 e 100"}, 400
            
            # Validar pontos necessários
            if dados['pontos_necessarios'] < 10:
                return {"message": "Pontos necessários deve ser pelo menos 10"}, 400
            
            # Verificar se o restaurante existe
            restaurante_id = dados['restaurante_id']
            restaurante = restauranteModel.find_restaurante(restaurante_id)
            if not restaurante:
                return {"message": "Restaurante não encontrado"}, 404
            
            # Verificar ownership
            usuario_logado = get_jwt_identity()
            try:
                usuario_logado_int = int(usuario_logado)
            except (ValueError, TypeError):
                return {"message": "Token inválido"}, 401
            
            if usuario_logado_int != restaurante_id:
                return {"message": "Você só pode criar cupons para seu próprio restaurante"}, 403
            
            # Gerar código único se não fornecido
            if not dados.get('codigo'):
                dados['codigo'] = cupomModel.gerar_codigo_unico()
            
            # Verificar se código já existe
            if cupomModel.find_by_codigo(dados['codigo']):
                return {"message": "Código de cupom já existe"}, 400
            
            # Processar data de validade
            try:
                print(f"🔍 Data de validade recebida: {dados['data_validade']} (tipo: {type(dados['data_validade'])})")
                if isinstance(dados['data_validade'], str):
                    # Remove 'Z' e milissegundos se existirem
                    data_str = dados['data_validade'].replace('Z', '').split('.')[0]
                    dados['data_validade'] = datetime.fromisoformat(data_str)
                
                print(f"🔍 Data processada: {dados['data_validade']}")
                if dados['data_validade'] <= datetime.utcnow():
                    return {"message": "Data de validade deve ser futura"}, 400
                    
            except ValueError as e:
                print(f"❌ Erro ao processar data: {e}")
                return {"message": f"Formato de data inválido: {str(e)}"}, 400
            
            # Filtrar apenas os campos necessários para criação
            dados_cupom = {
                'codigo': dados['codigo'],
                'titulo': dados['titulo'],
                'descricao': dados.get('descricao', ''),
                'pontos_necessarios': dados['pontos_necessarios'],
                'restaurante_id': dados['restaurante_id'],
                'data_validade': dados['data_validade'],
                'desconto_percentual': dados.get('desconto_percentual'),
                'desconto_valor': dados.get('desconto_valor'),
                'valor_minimo': dados.get('valor_minimo', 0),
                'max_usos': dados.get('max_usos', 1),
                'ativo': dados.get('ativo', True)
            }
            
            print(f"🔍 Dados finais para criação: {dados_cupom}")
            
            # Criar cupom
            novo_cupom = cupomModel(**dados_cupom)
            novo_cupom.save()
            
            print(f"✅ Cupom criado: ID={novo_cupom.ID}, Código={novo_cupom.codigo}")
            
            return novo_cupom.json(), 201
            
        except Exception as e:
            print(f"❌ Erro ao criar cupom: {str(e)}")
            traceback.print_exc()
            return {"message": "Erro interno do servidor"}, 500

@api.route('/<int:cupom_id>')
class CupomResource(Resource):
    @jwt_required(optional=True)
    @api.marshal_with(cupom_fields)
    def get(self, cupom_id):
        """Busca um cupom por ID"""
        try:
            cupom = cupomModel.find_by_id(cupom_id)
            if not cupom:
                return {"message": "Cupom não encontrado"}, 404
            return cupom, 200
        except Exception as e:
            print(f"❌ Erro ao buscar cupom: {str(e)}")
            return {"message": "Erro interno do servidor"}, 500

    @jwt_required()
    @restaurante_required
    @api.expect(cupom_create_fields)
    @api.marshal_with(cupom_fields)
    def put(self, cupom_id):
        """Atualiza um cupom"""
        try:
            cupom = cupomModel.find_by_id(cupom_id)
            if not cupom:
                return {"message": "Cupom não encontrado"}, 404
            
            # Verificar ownership
            usuario_logado = get_jwt_identity()
            if int(usuario_logado) != cupom['restaurante_id']:
                return {"message": "Você só pode editar seus próprios cupons"}, 403
            
            dados = request.json or {}
            print(f"🔍 Dados recebidos para atualização: {dados}")
            
            # Processar data de validade se fornecida
            if 'data_validade' in dados and dados['data_validade']:
                try:
                    print(f"🔍 Data de validade recebida: {dados['data_validade']} (tipo: {type(dados['data_validade'])})")
                    if isinstance(dados['data_validade'], str):
                        # Remove 'Z' e milissegundos se existirem
                        data_str = dados['data_validade'].replace('Z', '').split('.')[0]
                        dados['data_validade'] = datetime.fromisoformat(data_str)
                    
                    print(f"🔍 Data processada: {dados['data_validade']}")
                    if dados['data_validade'] <= datetime.utcnow():
                        return {"message": "Data de validade deve ser futura"}, 400
                        
                except ValueError as e:
                    print(f"❌ Erro ao processar data: {e}")
                    return {"message": f"Formato de data inválido: {str(e)}"}, 400
            
            # Validações de desconto
            if 'desconto_percentual' in dados and dados['desconto_percentual']:
                if not (0 < dados['desconto_percentual'] <= 100):
                    return {"message": "Desconto percentual deve estar entre 0.1 e 100"}, 400
            
            # Validar pontos necessários
            if 'pontos_necessarios' in dados and dados['pontos_necessarios']:
                if dados['pontos_necessarios'] < 10:
                    return {"message": "Pontos necessários deve ser pelo menos 10"}, 400
            
            cupom_atualizado = cupomModel.update(cupom_id, **dados)
            if not cupom_atualizado:
                return {"message": "Erro ao atualizar cupom"}, 500
            
            return cupom_atualizado.json(), 200
            
        except Exception as e:
            print(f"❌ Erro ao atualizar cupom: {str(e)}")
            return {"message": "Erro interno do servidor"}, 500

    @jwt_required()
    @restaurante_required
    def delete(self, cupom_id):
        """Remove um cupom"""
        try:
            cupom = cupomModel.find_by_id(cupom_id)
            if not cupom:
                return {"message": "Cupom não encontrado"}, 404
            
            # Verificar ownership
            usuario_logado = get_jwt_identity()
            if int(usuario_logado) != cupom['restaurante_id']:
                return {"message": "Você só pode excluir seus próprios cupons"}, 403
            
            success = cupomModel.delete(cupom_id)
            if success:
                return {"message": "Cupom excluído com sucesso"}, 200
            else:
                return {"message": "Erro ao excluir cupom"}, 500
                
        except Exception as e:
            print(f"❌ Erro ao excluir cupom: {str(e)}")
            return {"message": "Erro interno do servidor"}, 500

@api.route('/restaurante/<int:restaurante_id>')
class CuponsRestaurante(Resource):
    @api.marshal_list_with(cupom_fields)
    def get(self, restaurante_id):
        """Lista cupons de um restaurante"""
        try:
            cupons = cupomModel.find_by_restaurante(restaurante_id)
            return cupons, 200
        except Exception as e:
            print(f"❌ Erro ao listar cupons do restaurante: {str(e)}")
            return {"message": "Erro interno do servidor"}, 500

@api.route('/codigo/<string:codigo>')
class CupomPorCodigo(Resource):
    @api.marshal_with(cupom_fields)
    def get(self, codigo):
        """Busca cupom por código"""
        try:
            cupom = cupomModel.find_by_codigo(codigo.upper())
            if not cupom:
                return {"message": "Cupom não encontrado"}, 404
            return cupom, 200
        except Exception as e:
            print(f"❌ Erro ao buscar cupom por código: {str(e)}")
            return {"message": "Erro interno do servidor"}, 500

@api.route('/disponiveis/<int:restaurante_id>/<int:cliente_id>')
class CuponsDisponiveis(Resource):
    @jwt_required()
    @cliente_required
    @api.marshal_list_with(cupom_fields)
    def get(self, restaurante_id, cliente_id):
        """Lista cupons que o cliente pode resgatar"""
        try:
            # Verificar se o cliente logado pode ver seus próprios cupons
            usuario_logado = get_jwt_identity()
            if int(usuario_logado) != cliente_id:
                return {"message": "Você só pode ver seus próprios cupons disponíveis"}, 403
            
            # Buscar pontos do cliente
            pontos_disponiveis = pontosUsuarioModel.get_pontos_cliente(cliente_id, restaurante_id)
            
            # Buscar cupons disponíveis
            cupons = cupomModel.find_disponivel_por_pontos(restaurante_id, pontos_disponiveis)
            
            return cupons, 200
            
        except Exception as e:
            print(f"❌ Erro ao buscar cupons disponíveis: {str(e)}")
            return {"message": "Erro interno do servidor"}, 500

@api.route('/pontos/<int:cliente_id>/<int:restaurante_id>')
class PontosCliente(Resource):
    @jwt_required()
    @cliente_required
    @api.marshal_with(pontos_fields)
    def get(self, cliente_id, restaurante_id):
        """Consulta pontos do cliente em um restaurante"""
        try:
            # Verificar permissão
            usuario_logado = get_jwt_identity()
            if int(usuario_logado) != cliente_id:
                return {"message": "Você só pode consultar seus próprios pontos"}, 403
            
            registro = pontosUsuarioModel.find_or_create(cliente_id, restaurante_id)
            return registro.json(), 200
            
        except Exception as e:
            print(f"❌ Erro ao consultar pontos: {str(e)}")
            return {"message": "Erro interno do servidor"}, 500

@api.route('/resgatar')
class ResgatarCupom(Resource):
    @jwt_required()
    @cliente_required
    def post(self):
        """Resgata um cupom usando pontos"""
        try:
            dados = request.json or {}
            
            cliente_id = dados.get('cliente_id')
            cupom_id = dados.get('cupom_id')
            
            if not cliente_id or not cupom_id:
                return {"message": "cliente_id e cupom_id são obrigatórios"}, 400
            
            # Verificar permissão
            usuario_logado = get_jwt_identity()
            if int(usuario_logado) != cliente_id:
                return {"message": "Você só pode resgatar cupons para si mesmo"}, 403
            
            # Buscar cupom
            cupom = cupomModel.find_by_id(cupom_id)
            if not cupom:
                return {"message": "Cupom não encontrado"}, 404
            
            if not cupom['disponivel']:
                return {"message": "Cupom não está disponível para resgate"}, 400
            
            # Verificar se cliente tem pontos suficientes
            pontos_cliente = pontosUsuarioModel.get_pontos_cliente(
                cliente_id, cupom['restaurante_id']
            )
            
            if pontos_cliente < cupom['pontos_necessarios']:
                return {
                    "message": f"Pontos insuficientes. Necessário: {cupom['pontos_necessarios']}, Disponível: {pontos_cliente}"
                }, 400
            
            # Usar pontos (agora com cupom_id para registrar no histórico)
            sucesso, resultado = pontosUsuarioModel.usar_pontos(
                cliente_id=cliente_id,
                restaurante_id=cupom['restaurante_id'],
                pontos_usados=cupom['pontos_necessarios'],
                motivo=f"resgate_cupom_{cupom['codigo']}",
                cupom_id=cupom_id
            )
            
            if not sucesso:
                return {"message": resultado}, 400
            
            # Usar cupom
            cupomModel.usar_cupom(cupom_id)
            
            return {
                "message": "Cupom resgatado com sucesso!",
                "codigo": cupom['codigo'],
                "titulo": cupom['titulo'],
                "pontos_restantes": resultado.pontos_disponiveis if resultado else pontos_cliente - cupom['pontos_necessarios']
            }, 200
            
        except Exception as e:
            print(f"❌ Erro ao resgatar cupom: {str(e)}")
            traceback.print_exc()
            return {"message": "Erro interno do servidor"}, 500

@api.route('/historico/<int:cliente_id>/<int:restaurante_id>')
class HistoricoPontos(Resource):
    @jwt_required()
    @cliente_required
    def get(self, cliente_id, restaurante_id):
        """Consulta histórico de pontos do cliente"""
        try:
            # Verificar permissão
            usuario_logado = get_jwt_identity()
            if int(usuario_logado) != cliente_id:
                return {"message": "Você só pode consultar seu próprio histórico"}, 403
            
            historico = historicoModel.get_historico_cliente(cliente_id, restaurante_id)
            return {"historico": historico}, 200
            
        except Exception as e:
            print(f"❌ Erro ao consultar histórico: {str(e)}")
            return {"message": "Erro interno do servidor"}, 500

@api.route('/ranking/<int:restaurante_id>')
class RankingPontos(Resource):
    def get(self, restaurante_id):
        """Ranking de clientes por pontos em um restaurante"""
        try:
            limit = request.args.get('limit', 10, type=int)
            ranking = pontosUsuarioModel.get_ranking_clientes(restaurante_id, limit)
            
            resultado = []
            for posicao, cliente in enumerate(ranking, 1):
                resultado.append({
                    "posicao": posicao,
                    "cliente_nome": cliente.cliente.Nome if cliente.cliente else "N/A",
                    "pontos_totais": cliente.pontos_totais,
                    "pontos_disponiveis": cliente.pontos_disponiveis
                })
            
            return {"ranking": resultado}, 200
            
        except Exception as e:
            print(f"❌ Erro ao consultar ranking: {str(e)}")
            return {"message": "Erro interno do servidor"}, 500

@api.route('/pontos-disponiveis-hoje/<int:cliente_id>/<int:restaurante_id>')
class PontosDisponiveisHoje(Resource):
    @jwt_required()
    @cliente_required
    def get(self, cliente_id, restaurante_id):
        """Verifica se o cliente pode ganhar pontos hoje neste restaurante"""
        try:
            # Verificar permissão
            usuario_logado = get_jwt_identity()
            if int(usuario_logado) != cliente_id:
                return {"message": "Você só pode consultar seus próprios pontos"}, 403
            
            pode_avaliacao = historicoModel.pode_ganhar_pontos_hoje(
                cliente_id, restaurante_id, 'avaliacao'
            )
            pode_prato = historicoModel.pode_ganhar_pontos_hoje(
                cliente_id, restaurante_id, 'avaliacao_prato'
            )
            
            return {
                "pode_ganhar_avaliacao": pode_avaliacao,
                "pontos_avaliacao": 20 if pode_avaliacao else 0,
                "pode_ganhar_avaliacao_prato": pode_prato,
                "pontos_prato": 10 if pode_prato else 0,
                "total_possivel_hoje": (20 if pode_avaliacao else 0) + (10 if pode_prato else 0)
            }, 200
            
        except Exception as e:
            print(f"❌ Erro ao verificar pontos disponíveis: {str(e)}")
            return {"message": "Erro interno do servidor"}, 500

@api.route('/meus-cupons/<int:cliente_id>')
class MeusCuponsResgatados(Resource):
    @jwt_required()
    @cliente_required
    def get(self, cliente_id):
        """Lista todos os cupons resgatados pelo cliente"""
        try:
            # Verificar permissão
            usuario_logado = get_jwt_identity()
            if int(usuario_logado) != cliente_id:
                return {"message": "Você só pode consultar seus próprios cupons"}, 403
            
            # Buscar histórico de resgates (tipo = 'uso' e com cupom_id preenchido)
            query = text("""
                SELECT 
                    h.ID,
                    h.cupom_id,
                    h.cliente_id,
                    h.restaurante_id,
                    h.pontos as pontos_usados,
                    h.data_movimento as data_resgate,
                    c.codigo as codigo_resgate,
                    c.titulo as cupom_titulo,
                    c.descricao as cupom_descricao,
                    c.desconto_percentual,
                    c.desconto_valor,
                    c.valor_minimo,
                    c.data_validade,
                    r.Nome as restaurante_nome,
                    -- Verificar se o cupom foi usado (procurar por 'usado' no motivo)
                    CASE 
                        WHEN h.motivo LIKE '%usado%' THEN 1
                        ELSE 0 
                    END as usado,
                    -- Se foi usado, tentar extrair a data (será NULL por enquanto)
                    NULL as data_uso
                FROM historicopontos h
                JOIN cupom c ON h.cupom_id = c.ID
                JOIN restaurante r ON h.restaurante_id = r.ID
                WHERE h.cliente_id = :cliente_id 
                    AND h.tipo = 'uso' 
                    AND h.cupom_id IS NOT NULL
                    AND h.motivo LIKE 'resgate_cupom_%'
                ORDER BY h.data_movimento DESC
            """)
            
            result = banco.session.execute(query, {"cliente_id": cliente_id})
            cupons_resgatados = []
            
            for row in result:
                cupom_data = {
                    "ID": row[0],
                    "cupom_id": row[1],
                    "cliente_id": row[2], 
                    "restaurante_id": row[3],
                    "pontos_usados": row[4],
                    "data_resgate": row[5].isoformat() if row[5] else None,
                    "codigo_resgate": row[6],
                    "cupom_titulo": row[7],
                    "cupom_descricao": row[8],
                    "desconto_percentual": row[9],
                    "desconto_valor": row[10],
                    "valor_minimo": row[11],
                    "data_validade": row[12].isoformat() if row[12] else None,
                    "restaurante_nome": row[13],
                    "usado": bool(row[14]),
                    "data_uso": row[15].isoformat() if row[15] else None
                }
                cupons_resgatados.append(cupom_data)
            
            return cupons_resgatados, 200
            
        except Exception as e:
            print(f"❌ Erro ao consultar cupons resgatados: {str(e)}")
            traceback.print_exc()
            return {"message": "Erro interno do servidor"}, 500