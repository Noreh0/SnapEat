from resource.content_filter import ContentFilter
from resource.nlp_client import analisar_sentimento
from flask_restx import Namespace, Resource, fields, abort
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from datetime import datetime
from sql_alchemy import banco
from models.denuncia import denunciaModel
from models.avaliacao import avaliacaoModel
from models.restaurante import restauranteModel
import traceback  # ✅ ADICIONAR

api = Namespace('denuncias', description='Denúncias de avaliações')

denuncia_payload = api.model('DenunciaCreate', {
    'avaliacao_id': fields.Integer(required=True),
    'motivo': fields.String(required=True, min_length=5, max_length=500)
})

decisao_payload = api.model('DecisaoDenuncia', {
    'acao': fields.String(required=True, description='Ação a ser tomada (aceitar/rejeitar)'),
    'motivo': fields.String(required=False, description='Motivo da decisão (opcional)')
})

denuncia_out = api.model('Denuncia', {
    'ID': fields.Integer,
    'avaliacao_id': fields.Integer,
    'restaurante_id': fields.Integer,
    'cliente_id': fields.Integer,
    'motivo': fields.String,
    'status': fields.String,
    'created_at': fields.String,
    'resolved_at': fields.String,
    'resolved_by': fields.Integer,
    'observacao_admin': fields.String
})

@api.route('')
class CriarDenuncia(Resource):
    @jwt_required()
    @api.expect(denuncia_payload)
    @api.marshal_with(denuncia_out, code=201)
    def post(self):
        """Cria uma nova denúncia de avaliação"""
        try:
            claims = get_jwt()
            identity = get_jwt_identity()
            
            print(f"🔍 Nova denúncia - Cliente: {identity}, Payload: {api.payload}")
            
            # ✅ Validar tipo de usuário
            if claims.get('tipo') != 'cliente':
                return {
                    'message': 'Somente clientes podem criar denúncias.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # ✅ Validar dados de entrada
            dados = api.payload or {}
            if not dados:
                return {
                    'message': 'Dados da denúncia não fornecidos.',
                    'tipo_erro': 'empty_body'
                }, 422  # ✅ Unprocessable Entity
            
            avaliacao_id = dados.get('avaliacao_id')
            motivo = dados.get('motivo', '').strip()
            
            print(f"📝 Dados recebidos - Avaliação ID: {avaliacao_id}, Motivo: '{motivo}' (len: {len(motivo)})")
            
            if not avaliacao_id:
                return {
                    'message': 'ID da avaliação é obrigatório.',
                    'tipo_erro': 'missing_field',
                    'campo': 'avaliacao_id'
                }, 422  # ✅ Unprocessable Entity
            
            # Validar se é um número válido
            try:
                avaliacao_id = int(avaliacao_id)
            except (ValueError, TypeError):
                return {
                    'message': 'ID da avaliação deve ser um número válido.',
                    'tipo_erro': 'invalid_id',
                    'valor_recebido': avaliacao_id
                }, 400  # ✅ Bad Request
            
            if not motivo or len(motivo) < 5:
                return {
                    'message': 'Motivo da denúncia deve ter pelo menos 5 caracteres.',
                    'tipo_erro': 'invalid_motivo',
                    'tamanho_minimo': 5,
                    'tamanho_atual': len(motivo)
                }, 422  # ✅ Unprocessable Entity
            
            if len(motivo) > 500:
                return {
                    'message': 'Motivo da denúncia não pode exceder 500 caracteres.',
                    'tipo_erro': 'motivo_too_long',
                    'tamanho_maximo': 500,
                    'tamanho_atual': len(motivo)
                }, 422  # ✅ Unprocessable Entity
            
            # ✅ Verificar se a avaliação existe
            aval = avaliacaoModel.query.get(avaliacao_id)
            if not aval:
                print(f"❌ Avaliação {avaliacao_id} não encontrada")
                return {
                    'message': 'Avaliação não encontrada.',
                    'tipo_erro': 'evaluation_not_found',
                    'avaliacao_id': avaliacao_id
                }, 404  # ✅ Not Found
            
            print(f"✅ Avaliação encontrada - ID: {aval.ID}, Cliente: {aval.ID_Cliente}, Visível: {aval.visivel}")
            
            if not aval.visivel:
                print(f"❌ Avaliação {avaliacao_id} não está visível")
                return {
                    'message': 'Esta avaliação não está mais visível.',
                    'tipo_erro': 'evaluation_hidden'
                }, 404  # ✅ Not Found
            
            # ✅ Verificar auto-denúncia
            try:
                identity_int = int(identity)
            except (ValueError, TypeError):
                print(f"❌ Token inválido - identity: {identity}, tipo: {type(identity)}")
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            print(f"🔍 Verificando auto-denúncia - Cliente logado: {identity_int}, Autor da avaliação: {aval.ID_Cliente}")
            
            if identity_int == aval.ID_Cliente:
                print(f"❌ Tentativa de auto-denúncia - Cliente {identity_int} tentou denunciar própria avaliação")
                return {
                    'message': 'Você não pode denunciar sua própria avaliação.',
                    'tipo_erro': 'self_report'
                }, 400  # ✅ Bad Request
            
            # ✅ Verificar denúncia duplicada
            existente = denunciaModel.query.filter_by(
                avaliacao_id=aval.ID,
                cliente_id=identity_int,
                status='PENDENTE'
            ).first()
            
            if existente:
                return {
                    'message': 'Você já denunciou esta avaliação.',
                    'tipo_erro': 'duplicate_report',
                    'denuncia_existente_id': existente.ID
                }, 409  # ✅ Conflict
            
            # Criar denúncia
            dn = denunciaModel(
                avaliacao_id=aval.ID,
                restaurante_id=aval.ID_Restaurante,
                cliente_id=identity_int,
                motivo=motivo
            )
            banco.session.add(dn)
            banco.session.flush()
            
            print(f"✅ Denúncia criada: ID={dn.ID}, Avaliação={aval.ID}")
            
            # Analisar automaticamente usando IA
            try:
                from resource.nlp_client import analisar_denuncia
                
                resultado_analise = analisar_denuncia(
                    comentario=aval.Comentario,
                    motivo_denuncia=motivo,
                    nota_avaliacao=aval.Nota
                )
                
                print(f"🤖 Análise automática: {resultado_analise}")
                
                # Decisão automática se houver elementos claros
                if resultado_analise and resultado_analise.get('aceitar_denuncia'):
                    dn.status = 'ACEITA'
                    dn.resolved_at = datetime.utcnow()
                    dn.resolved_by = 0  # 0 = sistema
                    dn.observacao_admin = f"Denúncia aceita automaticamente. Motivo: {resultado_analise.get('explicacao')}"
                    
                    # Ocultar avaliação
                    aval.visivel = False
                    
                    print(f"✅ Denúncia aceita automaticamente")
                    
                    # Notificar restaurante
                    try:
                        restaurante = restauranteModel.find_restaurante(aval.ID_Restaurante)
                        if restaurante:
                            from resource.notificacoes_api import criar_notificacao
                            criar_notificacao(
                                destinatario_id=aval.ID_Restaurante,
                                tipo_destinatario='restaurante',
                                titulo='Denúncia aceita automaticamente',
                                mensagem='Uma denúncia foi aceita automaticamente pelo sistema.',
                                tipo='denuncia',
                                link_destino=f'/restaurante-dashboard/{aval.ID_Restaurante}/denuncias',
                                dados_adicionais={
                                    'denuncia_id': dn.ID,
                                    'avaliacao_id': aval.ID,
                                    'aceita_automaticamente': True,
                                    'motivo': resultado_analise.get('explicacao')
                                }
                            )
                    except Exception as e:
                        print(f"⚠️ Erro ao notificar restaurante: {e}")
                    
                    # Notificar cliente autor da avaliação
                    try:
                        from resource.notificacoes_api import criar_notificacao
                        criar_notificacao(
                            destinatario_id=aval.ID_Cliente,
                            tipo_destinatario='cliente',
                            titulo='Sua avaliação foi removida',
                            mensagem=f"Sua avaliação foi removida por violar os termos de uso.",
                            tipo='avaliacao_removida',
                            link_destino=f'/restaurante/{aval.ID_Restaurante}',
                            dados_adicionais={
                                'avaliacao_id': aval.ID,
                                'restaurante_id': aval.ID_Restaurante,
                                'motivo': 'Conteúdo inadequado detectado'
                            }
                        )
                    except Exception as e:
                        print(f"⚠️ Erro ao notificar cliente: {e}")
                else:
                    # Deixar pendente com observação
                    observacao = "Análise automática: Sem elementos claros para decisão automática."
                    if resultado_analise:
                        motivos = resultado_analise.get('motivos', {})
                        if motivos.get('inconsistencia_nota_sentimento'):
                            observacao += " Possível inconsistência entre nota e sentimento."
                        if motivos.get('sentimento_negativo'):
                            observacao += " Comentário com sentimento negativo."
                    
                    dn.observacao_admin = observacao
                    print(f"⚠️ Denúncia pendente - análise manual necessária")
                    
            except Exception as e:
                print(f"⚠️ Erro na análise automática: {e}")
                traceback.print_exc()
                # Continua sem bloquear a criação
            
            banco.session.commit()
            
            # Retornar resposta simples
            return {
                'message': 'Denúncia criada com sucesso!',
                'denuncia_id': dn.ID,
                'status': dn.status
            }, 201  # ✅ Created
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro ao criar denúncia: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao processar denúncia.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/restaurante/<int:id>/pendentes')
class DenunciasPendentes(Resource):
    @jwt_required()
    @api.marshal_list_with(denuncia_out)
    def get(self, id):
        """Lista denúncias pendentes de um restaurante"""
        try:
            usuario_atual = get_jwt_identity()
            claims = get_jwt()
            
            print(f"🔍 Acesso a denúncias do restaurante {id} por: {usuario_atual}")
            
            # ✅ Converter para int
            try:
                usuario_id = int(usuario_atual)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            # ✅ Verificar permissão
            if usuario_id != id or claims.get('tipo') != 'restaurante':
                return {
                    'message': 'Você não tem permissão para acessar estas denúncias.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # Buscar denúncias pendentes
            denuncias = denunciaModel.query.filter_by(
                restaurante_id=id,
                status='PENDENTE'
            ).order_by(denunciaModel.created_at.asc()).all()
            
            return denuncias, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar denúncias: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar denúncias.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/restaurante/<int:id>/indicadores')
class IndicadoresDenunciaRestaurante(Resource):
    @jwt_required()
    def get(self, id):
        """Retorna indicadores de denúncias para um restaurante"""
        try:
            usuario_atual = get_jwt_identity()
            claims = get_jwt()
            tipo_usuario = claims.get('tipo')
            
            print(f"🔍 Acesso a indicadores do restaurante {id} por: {usuario_atual}")
            
            # ✅ Converter para int
            try:
                usuario_id = int(usuario_atual)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            # ✅ Verificar se é o próprio restaurante
            if tipo_usuario == 'restaurante' and usuario_id == id:
                pendentes = denunciaModel.query.filter_by(
                    restaurante_id=id,
                    status='PENDENTE'
                ).count()
                
                total = denunciaModel.query.filter_by(restaurante_id=id).count()
                
                return {
                    'pendentes': pendentes,
                    'total': total,
                    'resolvidas': total - pendentes
                }, 200  # ✅ OK
            
            # ✅ Se for cliente, verificar se tem avaliações
            elif tipo_usuario == 'cliente':
                avaliacao = avaliacaoModel.query.filter_by(
                    ID_Cliente=usuario_id,
                    ID_Restaurante=id
                ).first()
                
                if avaliacao:
                    return {
                        'pendentes': 0,
                        'pode_denunciar': True
                    }, 200  # ✅ OK
            
            # ✅ Sem permissão
            return {
                'message': 'Você não tem permissão para acessar estes indicadores.',
                'tipo_erro': 'forbidden'
            }, 403  # ✅ Forbidden
            
        except Exception as e:
            print(f"❌ Erro ao buscar indicadores: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar indicadores.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/dashboard/metricas')
class DenunciasDashboard(Resource):
    @jwt_required()
    def get(self):
        """Retorna métricas globais para dashboard administrativo"""
        try:
            claims = get_jwt()
            
            # ✅ Verificar se é admin
            if not claims.get('is_admin', False):
                return {
                    'message': 'Acesso restrito a administradores.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # Total por status
            pendentes = denunciaModel.query.filter_by(status='PENDENTE').count()
            aceitas = denunciaModel.query.filter_by(status='ACEITA').count()
            recusadas = denunciaModel.query.filter_by(status='RECUSADA').count()
            total = pendentes + aceitas + recusadas
            
            # Evolução temporal (últimos 7 dias)
            from sqlalchemy import func, cast, Date
            import datetime
            
            hoje = datetime.date.today()
            sete_dias_atras = hoje - datetime.timedelta(days=7)
            
            evolucao = (
                banco.session.query(
                    cast(denunciaModel.created_at, Date).label('dia'),
                    func.count(denunciaModel.ID).label('total')
                )
                .filter(denunciaModel.created_at >= sete_dias_atras)
                .group_by(cast(denunciaModel.created_at, Date))
                .order_by(cast(denunciaModel.created_at, Date))
                .all()
            )
            
            evolucao_dict = {
                dia.strftime('%Y-%m-%d'): total
                for dia, total in evolucao
            }
            
            # Top restaurantes com denúncias
            top_restaurantes = (
                banco.session.query(
                    denunciaModel.restaurante_id,
                    func.count(denunciaModel.ID).label('total')
                )
                .group_by(denunciaModel.restaurante_id)
                .order_by(func.count(denunciaModel.ID).desc())
                .limit(5)
                .all()
            )
            
            top_restaurantes_info = []
            for rest_id, total in top_restaurantes:
                restaurante = restauranteModel.find_restaurante(rest_id)
                if restaurante:
                    nome = restaurante.get('Nome', f'Restaurante #{rest_id}')
                    top_restaurantes_info.append({
                        'id': rest_id,
                        'nome': nome,
                        'total': total
                    })
            
            return {
                'totais': {
                    'pendentes': pendentes,
                    'aceitas': aceitas,
                    'recusadas': recusadas,
                    'total': total
                },
                'evolucao_semanal': evolucao_dict,
                'top_restaurantes': top_restaurantes_info
            }, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar métricas: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar métricas.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/<int:denuncia_id>/decisao')
class DecidirDenuncia(Resource):
    @jwt_required()
    @api.expect(decisao_payload)
    @api.marshal_with(denuncia_out)
    def put(self, denuncia_id):
        """Toma decisão sobre uma denúncia (aceitar/rejeitar)"""
        try:
            claims = get_jwt()
            usuario_id = get_jwt_identity()
            usuario_tipo = claims.get('tipo')
            is_admin = claims.get('is_admin', False)
            
            # ✅ Buscar denúncia
            dn = denunciaModel.query.get(denuncia_id)
            if not dn:
                return {
                    'message': 'Denúncia não encontrada.',
                    'tipo_erro': 'not_found',
                    'id': denuncia_id
                }, 404  # ✅ Not Found
            
            # ✅ Verificar permissão
            try:
                usuario_id_int = int(usuario_id)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            if not is_admin:
                if usuario_tipo != 'restaurante' or usuario_id_int != dn.restaurante_id:
                    return {
                        'message': 'Você não tem permissão para decidir sobre esta denúncia.',
                        'tipo_erro': 'forbidden'
                    }, 403  # ✅ Forbidden
            
            # ✅ Verificar se já foi decidida
            if dn.status != 'PENDENTE':
                return {
                    'message': 'Esta denúncia já foi processada.',
                    'tipo_erro': 'already_processed',
                    'status_atual': dn.status
                }, 400  # ✅ Bad Request
            
            # ✅ Validar dados
            dados = api.payload or {}
            acao = dados.get('acao', '').lower()
            
            if not acao:
                return {
                    'message': 'Ação é obrigatória.',
                    'tipo_erro': 'missing_field',
                    'campo': 'acao'
                }, 422  # ✅ Unprocessable Entity
            
            if acao not in ['aceitar', 'recusar', 'rejeitar']:
                return {
                    'message': 'Ação inválida. Use "aceitar" ou "rejeitar".',
                    'tipo_erro': 'invalid_action',
                    'acoes_validas': ['aceitar', 'rejeitar']
                }, 422  # ✅ Unprocessable Entity
            
            # Processar ação
            aval = avaliacaoModel.query.get(dn.avaliacao_id)
            
            if acao == 'aceitar':
                dn.status = 'ACEITA'
                dn.resolved_at = datetime.utcnow()
                dn.resolved_by = usuario_id_int
                dn.observacao_admin = dados.get('motivo', 'Denúncia aceita')
                
                # Ocultar avaliação
                if aval:
                    print(f"🔄 Ocultando avaliação {aval.ID} - Estado anterior: visível={aval.visivel}")
                    aval.visivel = False
                    print(f"✅ Avaliação {aval.ID} marcada como invisível")
                    
                    # Notificar cliente
                    try:
                        restaurante = restauranteModel.find_restaurante(dn.restaurante_id)
                        from resource.notificacoes_api import criar_notificacao
                        criar_notificacao(
                            destinatario_id=aval.ID_Cliente,
                            tipo_destinatario='cliente',
                            titulo='Sua avaliação foi removida',
                            mensagem=f"Sua avaliação foi removida.",
                            tipo='avaliacao_removida',
                            dados_adicionais={
                                'avaliacao_id': aval.ID,
                                'restaurante_id': dn.restaurante_id
                            }
                        )
                    except Exception as e:
                        print(f"⚠️ Erro ao notificar: {e}")
            else:
                dn.status = 'RECUSADA'
                dn.resolved_at = datetime.utcnow()
                dn.resolved_by = usuario_id_int
                dn.observacao_admin = dados.get('motivo', 'Denúncia recusada')
            
            banco.session.commit()
            print(f"✅ Decisão: {acao} para denúncia {denuncia_id}")
            
            # Verificar se a avaliação foi realmente ocultada
            if acao == 'aceitar' and aval:
                aval_verificacao = avaliacaoModel.query.get(dn.avaliacao_id)
                print(f"🔍 Verificação pós-commit - Avaliação {aval_verificacao.ID} visível: {aval_verificacao.visivel}")
            
            return dn, 200  # ✅ OK
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro ao processar decisão: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao processar decisão.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/restaurante/<int:restaurante_id>/processar-pendentes')
class ProcessarDenunciasPorRestaurante(Resource):
    @jwt_required()
    def post(self, restaurante_id):
        """Processa todas as denúncias pendentes de um restaurante usando IA"""
        try:
            identity = get_jwt_identity()
            claims = get_jwt()
            
            # ✅ Converter e validar
            try:
                identity_int = int(identity)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            # ✅ Verificar permissão
            if identity_int != restaurante_id or claims.get('tipo') != 'restaurante':
                return {
                    'message': 'Apenas o proprietário do restaurante pode processar suas denúncias.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            # Buscar denúncias pendentes
            denuncias = denunciaModel.query.filter_by(
                status='PENDENTE',
                restaurante_id=restaurante_id
            ).all()
            
            if not denuncias:
                return {
                    'message': 'Não há denúncias pendentes para este restaurante.'
                }, 200  # ✅ OK
            
            resultados = {
                'total': len(denuncias),
                'aceitas': 0,
                'para_revisao': 0,
                'detalhes': []
            }
            
            filtro = ContentFilter()
            
            for denuncia in denuncias:
                avaliacao = avaliacaoModel.query.get(denuncia.avaliacao_id)
                if not avaliacao:
                    resultados['detalhes'].append({
                        'denuncia_id': denuncia.ID,
                        'status': 'ERRO',
                        'mensagem': 'Avaliação não encontrada'
                    })
                    continue
                
                # Análise automática
                contem_ofensa = filtro.contem_conteudo_ofensivo(avaliacao.Comentario)
                motivos_graves = ['ofensa', 'assédio', 'discriminação', 'ameaça', 'ilegal']
                motivo_grave = any(motivo in denuncia.motivo.lower() for motivo in motivos_graves)
                
                aceitar_denuncia = contem_ofensa or motivo_grave
                
                if aceitar_denuncia:
                    denuncia.status = 'ACEITA'
                    denuncia.observacao_admin = f"Aceita automaticamente. Motivos: {', '.join(filter(None, ['Conteúdo ofensivo' if contem_ofensa else None, 'Motivo grave' if motivo_grave else None]))}"
                    denuncia.resolved_at = datetime.utcnow()
                    denuncia.resolved_by = 0
                    avaliacao.visivel = False
                    resultados['aceitas'] += 1
                else:
                    resultados['para_revisao'] += 1
                
                resultados['detalhes'].append({
                    'denuncia_id': denuncia.ID,
                    'status': 'ACEITA' if aceitar_denuncia else 'PENDENTE'
                })
            
            banco.session.commit()
            return resultados, 200  # ✅ OK
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro ao processar denúncias: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao processar denúncias.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/<int:id>/analisar-automaticamente')
class AnaliseDenuncia(Resource):
    @jwt_required()
    def post(self, id):
        """Analisa uma denúncia usando IA"""
        try:
            claims = get_jwt()
            usuario_id = get_jwt_identity()
            usuario_tipo = claims.get('tipo')
            
            # ✅ Buscar denúncia
            denuncia = denunciaModel.query.get(id)
            if not denuncia:
                return {
                    'message': 'Denúncia não encontrada.',
                    'tipo_erro': 'not_found',
                    'id': id
                }, 404  # ✅ Not Found
            
            # ✅ Verificar permissão
            try:
                usuario_id_int = int(usuario_id)
            except (ValueError, TypeError):
                return {
                    'message': 'Token inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            if not claims.get('is_admin', False):
                if usuario_tipo != 'restaurante' or usuario_id_int != denuncia.restaurante_id:
                    return {
                        'message': 'Sem permissão para analisar esta denúncia.',
                        'tipo_erro': 'forbidden'
                    }, 403  # ✅ Forbidden
            
            # ✅ Verificar status
            if denuncia.status != 'PENDENTE':
                return {
                    'message': 'Esta denúncia já foi processada.',
                    'tipo_erro': 'already_processed',
                    'status': denuncia.status
                }, 400  # ✅ Bad Request
            
            # Buscar avaliação
            avaliacao = avaliacaoModel.query.get(denuncia.avaliacao_id)
            if not avaliacao:
                return {
                    'message': 'Avaliação relacionada não encontrada.',
                    'tipo_erro': 'evaluation_not_found'
                }, 404  # ✅ Not Found
            
            # Análise automática
            filtro = ContentFilter()
            contem_ofensa = filtro.contem_conteudo_ofensivo(avaliacao.Comentario)
            
            motivos_graves = ['ofensa', 'assédio', 'discriminação', 'ameaça', 'ilegal']
            motivo_grave = any(motivo in denuncia.motivo.lower() for motivo in motivos_graves)
            
            aceitar_denuncia = contem_ofensa or motivo_grave
            
            if aceitar_denuncia:
                denuncia.status = 'ACEITA'
                denuncia.observacao_admin = f"Aceita automaticamente. Motivos: {', '.join(filter(None, ['Conteúdo ofensivo' if contem_ofensa else None, 'Motivo grave' if motivo_grave else None]))}"
                denuncia.resolved_at = datetime.utcnow()
                denuncia.resolved_by = usuario_id_int
                avaliacao.visivel = False
                banco.session.commit()
                
                return {
                    'message': 'Denúncia aceita automaticamente.',
                    'status': 'ACEITA',
                    'motivos': {
                        'conteudo_ofensivo': contem_ofensa,
                        'motivo_grave': motivo_grave
                    }
                }, 200  # ✅ OK
            else:
                denuncia.observacao_admin = "Análise automática: Sem motivos claros para aceitar."
                banco.session.commit()
                
                return {
                    'message': 'Denúncia necessita revisão manual.',
                    'status': 'PENDENTE',
                    'motivos': {
                        'conteudo_ofensivo': contem_ofensa,
                        'motivo_grave': motivo_grave
                    }
                }, 200  # ✅ OK
                
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro ao analisar denúncia: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao analisar denúncia.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error

@api.route('/processar-pendentes')
class ProcessarDenuncias(Resource):
    @jwt_required()
    def post(self):
        """Processa todas as denúncias pendentes (apenas admin)"""
        try:
            claims = get_jwt()
            
            # ✅ Verificar se é admin
            if not claims.get('is_admin', False):
                return {
                    'message': 'Apenas administradores podem usar esta funcionalidade.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
            
            denuncias = denunciaModel.query.filter_by(status='PENDENTE').all()
            
            if not denuncias:
                return {
                    'message': 'Não há denúncias pendentes.'
                }, 200  # ✅ OK
            
            resultados = {
                'total': len(denuncias),
                'aceitas': 0,
                'para_revisao': 0,
                'detalhes': []
            }
            
            filtro = ContentFilter()
            
            for denuncia in denuncias:
                avaliacao = avaliacaoModel.query.get(denuncia.avaliacao_id)
                if not avaliacao:
                    continue
                
                contem_ofensa = filtro.contem_conteudo_ofensivo(avaliacao.Comentario)
                motivos_graves = ['ofensa', 'assédio', 'discriminação', 'ameaça', 'ilegal']
                motivo_grave = any(motivo in denuncia.motivo.lower() for motivo in motivos_graves)
                
                if contem_ofensa or motivo_grave:
                    denuncia.status = 'ACEITA'
                    denuncia.resolved_at = datetime.utcnow()
                    denuncia.resolved_by = get_jwt_identity()
                    avaliacao.visivel = False
                    resultados['aceitas'] += 1
                else:
                    resultados['para_revisao'] += 1
            
            banco.session.commit()
            return resultados, 200  # ✅ OK
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno.',
                'tipo_erro': 'internal_error'
            }, 500  # ✅ Internal Server Error