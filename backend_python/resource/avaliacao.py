from utils.decorators import cliente_required, restaurante_required, any_authenticated
from resource.content_filter import ContentFilter
from flask import request, current_app, jsonify, send_file, make_response
from sql_alchemy import banco  # certifique-se de importar!
from flask_restx import Resource, reqparse, abort, Namespace, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from flask_mail import Message
from resource.nlp_client import analisar_sentimento
from sql_alchemy import banco
from services.email_service import email_service
from services.notification_service import notification_service
from services.pontos_service import PontosService  # ✅ NOVO: Sistema de pontos
from sqlalchemy import func, and_, extract
import traceback  # ✅ CORRIGIDO: Importar traceback
from models.avaliacao import avaliacaoModel
import traceback
from models.restaurante import restauranteModel
from models.prato import pratoModel
from models.usuario import UsuarioModel
from collections import defaultdict
from datetime import datetime, timedelta
from resource.notificacoes_api import criar_notificacao
from werkzeug.datastructures import FileStorage
from resource.firebase_storage import upload_image, delete_image
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import io
import os
import traceback
from wordcloud import WordCloud, STOPWORDS
import numpy as np



api = Namespace('avaliacoes', description='Operações de Avaliações')

# Modelo para documentação Swagger
avaliacao_schema = api.model('Avaliacao', {
    'ID':             fields.Integer(readOnly=True),
    'ID_Cliente':     fields.Integer(required=True, description='ID do cliente'),
    'ID_Restaurante': fields.Integer(required=True, description='ID do restaurante'),
    'Nota':           fields.Integer(required=True, min=1, max=5, description='Nota de 1 a 5'),
    'Comentario':     fields.String(required=True, description='Comentario do cliente'),
    'data_avaliacao': fields.String(description='Data da avaliação'),
    'imagens':     fields.List(fields.String, description='URLs das imagens da avaliação'),
})



# Parser para POST e PUT
parser = reqparse.RequestParser()
parser.add_argument('ID_Cliente',     type=int,   required=True, help="ID do cliente é obrigatório")
parser.add_argument('ID_Restaurante', type=int,   required=True, help="ID do restaurante é obrigatório")
parser.add_argument('Nota',           type=int,   required=True, help="Nota é obrigatória")
parser.add_argument('Comentario',     type=str,   required=True, help="Comentário é obrigatório")

upload_parser = reqparse.RequestParser()
upload_parser.add_argument('imagens', type=FileStorage, location='files', action='append', required=True, help='Imagens da avaliação')

def _isoformat_if_datetime(value):
    from datetime import datetime
    if isinstance(value, datetime):
        return value.isoformat()
    return value

@api.route('')
@api.route('/encontraAvaliacaoCliente/<int:id>')
class AvaliacoesPorCliente(Resource):
    @jwt_required()
    @cliente_required
    @api.marshal_list_with(avaliacao_schema)
    def get(self, id):
        """Lista todas as avaliações QUE eu (cliente) criei"""
        try:
            # Headers para debug
            print(f"Headers recebidos: {dict(request.headers)}")
            
            # Obter o ID do usuário autenticado
            usuario_atual = get_jwt_identity()
            print(f"ID do usuário autenticado (bruto): {usuario_atual}, Tipo: {type(usuario_atual)}")
            
            # Converter para int para comparação
            try:
                usuario_atual_id = int(usuario_atual) if usuario_atual is not None else None
            except (ValueError, TypeError):
                return {
                    'message': 'Token de autenticação inválido.',
                    'tipo_erro': 'invalid_token'
                }, 401  # ✅ Unauthorized
            
            print(f"ID do usuário convertido: {usuario_atual_id}")
            
            if usuario_atual_id is None:
                print("Usuário não autenticado")
                return {
                    'message': 'Autenticação necessária.',
                    'tipo_erro': 'not_authenticated'
                }, 401  # ✅ Unauthorized
                
            # Verificação de permissão
            if usuario_atual_id != id:
                print(f"Acesso negado: usuário {usuario_atual_id} tentando acessar avaliações do cliente {id}")
                return {
                    'message': 'Você não tem permissão para acessar estas avaliações.',
                    'tipo_erro': 'forbidden'
                }, 403  # ✅ Forbidden
                
            # Buscar avaliações
            avaliacoes = avaliacaoModel.findAllCliente(id)
            print(f"Encontradas {len(avaliacoes)} avaliações")
            
            return avaliacoes, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar avaliações do cliente: {str(e)}")
            traceback.print_exc()
            return {
                'message': 'Erro interno ao buscar avaliações.',
                'tipo_erro': 'internal_error',
                'detalhes': str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/<int:id>/upload-imagens')
class AvaliacaoUploadImagens(Resource):
    @jwt_required()
    @cliente_required  # ✅ Adicionar decorator de permissão
    @api.expect(upload_parser)
    def post(self, id):
        """Faz upload de imagens para uma avaliação existente"""
        try:
            avaliacao = avaliacaoModel.query.get(id)
            if not avaliacao:
                return {
                    "message": "Avaliação não encontrada.",
                    "tipo_erro": "not_found"
                }, 404  # ✅ Not Found
            
            # Verificar se o usuário é dono da avaliação
            identity = get_jwt_identity()
            try:
                identity_int = int(identity)
            except (ValueError, TypeError):
                return {
                    "message": "Token inválido.",
                    "tipo_erro": "invalid_token"
                }, 401  # ✅ Unauthorized
            
            if identity_int != avaliacao.ID_Cliente:
                return {
                    "message": "Você não tem permissão para adicionar imagens a esta avaliação.",
                    "tipo_erro": "forbidden"
                }, 403  # ✅ Forbidden
            
            args = upload_parser.parse_args()
            imagens = args.get('imagens') or []
            
            if not imagens:
                return {
                    "message": "Nenhuma imagem foi enviada.",
                    "tipo_erro": "no_images"
                }, 422  # ✅ Unprocessable Entity
            
            # Limitar número de imagens (máximo 5 por avaliação)
            imagens_atuais = len(avaliacao.imagens_urls or [])
            if imagens_atuais + len(imagens) > 5:
                return {
                    "message": f"Máximo de 5 imagens por avaliação. Você já tem {imagens_atuais} imagem(ns).",
                    "tipo_erro": "limit_exceeded"
                }, 422  # ✅ Unprocessable Entity
            
            # Upload das imagens
            imagens_urls = avaliacao.imagens_urls or []
            erros_upload = []
            
            for idx, imagem in enumerate(imagens):
                if imagem:
                    # Validar tipo de arquivo
                    if not imagem.filename.lower().endswith(('.png', '.jpg', '.jpeg', '.gif', '.webp')):
                        erros_upload.append(f"{imagem.filename}: formato não suportado")
                        continue
                    
                    # Fazer upload para o Firebase
                    try:
                        imagem_url = upload_image(
                            imagem, 
                            folder=f"avaliacoes/restaurante_{avaliacao.ID_Restaurante}",
                            filename=f"aval_{id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{len(imagens_urls)}"
                        )
                        
                        if imagem_url:
                            imagens_urls.append(imagem_url)
                        else:
                            erros_upload.append(f"{imagem.filename}: falha no upload")
                    except Exception as e:
                        print(f"❌ Erro no upload da imagem: {e}")
                        erros_upload.append(f"{imagem.filename}: {str(e)}")
            
            # Verificar se pelo menos uma imagem foi enviada
            if not imagens_urls and len(avaliacao.imagens_urls or []) == 0:
                return {
                    "message": "Nenhuma imagem foi enviada com sucesso.",
                    "tipo_erro": "upload_failed",
                    "erros": erros_upload
                }, 500  # ✅ Internal Server Error
            
            # Atualizar avaliação
            avaliacaoModel.updateAvaliacao(id, imagens_urls=imagens_urls, tem_imagens=bool(imagens_urls))
            
            response = {
                "message": f"{len(imagens_urls) - len(avaliacao.imagens_urls or [])} imagem(ns) adicionada(s) com sucesso.",
                "total_imagens": len(imagens_urls),
                "novas_urls": imagens_urls
            }
            
            if erros_upload:
                response["avisos"] = erros_upload
            
            return response, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao fazer upload de imagens: {str(e)}")
            traceback.print_exc()
            return {
                "message": "Erro interno ao processar imagens.",
                "tipo_erro": "internal_error",
                "detalhes": str(e)
            }, 500  # ✅ Internal Server Error
        
@api.route('/<int:id>/remover-imagem')
class AvaliacaoRemoverImagem(Resource):
    @jwt_required()
    @cliente_required  # ✅ Adicionar decorator
    def delete(self, id):
        """Remove uma imagem específica de uma avaliação"""
        try:
            avaliacao = avaliacaoModel.query.get(id)
            if not avaliacao:
                return {
                    "message": "Avaliação não encontrada.",
                    "tipo_erro": "not_found"
                }, 404  # ✅ Not Found
            
            # Verificar se o usuário é dono da avaliação
            identity = get_jwt_identity()
            try:
                identity_int = int(identity)
            except (ValueError, TypeError):
                return {
                    "message": "Token inválido.",
                    "tipo_erro": "invalid_token"
                }, 401  # ✅ Unauthorized
            
            if identity_int != avaliacao.ID_Cliente:
                return {
                    "message": "Você não tem permissão para remover imagens desta avaliação.",
                    "tipo_erro": "forbidden"
                }, 403  # ✅ Forbidden
            
            # Obter URL da imagem a ser removida do corpo da requisição
            dados = request.get_json()
            if not dados:
                return {
                    "message": "Corpo da requisição vazio.",
                    "tipo_erro": "empty_body"
                }, 422  # ✅ Unprocessable Entity
            
            imagem_url = dados.get('imagem_url')
            
            if not imagem_url:
                return {
                    "message": "URL da imagem não fornecida.",
                    "tipo_erro": "missing_field",
                    "campo": "imagem_url"
                }, 422  # ✅ Unprocessable Entity
            
            if not avaliacao.imagens_urls or imagem_url not in avaliacao.imagens_urls:
                return {
                    "message": "Imagem não encontrada nesta avaliação.",
                    "tipo_erro": "image_not_found"
                }, 404  # ✅ Not Found
            
            # Remover do Firebase/storage
            try:
                delete_image(imagem_url)
            except Exception as e:
                print(f"⚠️ Erro ao deletar imagem do storage: {e}")
                # Continua mesmo se falhar no storage
            
            # Remover da lista
            avaliacao.imagens_urls.remove(imagem_url)
            avaliacao.tem_imagens = bool(avaliacao.imagens_urls)
            
            try:
                banco.session.commit()
            except Exception as e:
                banco.session.rollback()
                print(f"❌ Erro ao salvar alterações: {e}")
                return {
                    "message": "Erro ao salvar alterações no banco de dados.",
                    "tipo_erro": "database_error"
                }, 500  # ✅ Internal Server Error
            
            return {
                "message": "Imagem removida com sucesso.",
                "imagens_restantes": len(avaliacao.imagens_urls or [])
            }, 200  # ✅ OK
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro ao remover imagem: {str(e)}")
            traceback.print_exc()
            return {
                "message": "Erro interno ao remover imagem.",
                "tipo_erro": "internal_error",
                "detalhes": str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/restaurante/<int:id>')
class AvaliacoesPorRestaurante(Resource):
    def get(self, id):
        """Lista todas as avaliações de um restaurante"""
        try:
            # Verificar se o restaurante existe
            restaurante = restauranteModel.find_restaurante(id)
            if not restaurante:
                return {
                    "message": "Restaurante não encontrado.",
                    "tipo_erro": "not_found"
                }, 404  # ✅ Not Found
            
            # Adicionar filtro de visibilidade
            avaliacoes = avaliacaoModel.query.filter_by(ID_Restaurante=id, visivel=True).all()
            
            # Debug: Verificar total de avaliações (incluindo ocultas)
            total_avaliacoes = avaliacaoModel.query.filter_by(ID_Restaurante=id).count()
            avaliacoes_ocultas = avaliacaoModel.query.filter_by(ID_Restaurante=id, visivel=False).count()
            print(f"🔍 Restaurante {id}: {len(avaliacoes)} visíveis, {avaliacoes_ocultas} ocultas, {total_avaliacoes} total")
            
            # Modificar para incluir o nome do cliente e converter datetime para string
            resultado = []
            for a in avaliacoes:
                try:
                    cliente = UsuarioModel.find_by_id(a.ID_Cliente)
                    
                    # Converter data para string ISO se for um objeto datetime
                    data_avaliacao = a.data_avaliacao
                    if isinstance(data_avaliacao, datetime):
                        data_avaliacao = data_avaliacao.isoformat()
                        
                    resultado.append({
                        "ID": a.ID,
                        "ID_Cliente": a.ID_Cliente,
                        "ID_Restaurante": a.ID_Restaurante,
                        "Nota": a.Nota,
                        "Comentario": a.Comentario,
                        "data_avaliacao": data_avaliacao,
                        "sentimento_auto": a.sentimento_auto,
                        "Nome_Cliente": cliente.Nome if cliente else "Usuário Anônimo",
                        "imagens_urls": a.imagens_urls or [],
                        "tem_imagens": a.tem_imagens
                    })
                except Exception as e:
                    print(f"⚠️ Erro ao processar avaliação {a.ID}: {e}")
                    continue
            
            return resultado, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar avaliações do restaurante: {str(e)}")
            traceback.print_exc()
            return {
                "message": "Erro interno ao buscar avaliações.",
                "tipo_erro": "internal_error",
                "detalhes": str(e)
            }, 500  # ✅ Internal Server Error

class AvaliacaoList(Resource):
    @jwt_required()
    @api.marshal_list_with(avaliacao_schema)
    def get(self):
        return avaliacaoModel.query.all()

    @jwt_required()
    @api.expect(parser)
    @api.marshal_with(avaliacao_schema, code=201)
    def post(self):
        dados = api.payload or {}
        aval = avaliacaoModel(**dados)
        try:
            banco.session.add(aval)
            banco.session.commit()
            # Análise de sentimento (não quebra se serviço NLP indisponível)
            try:
                analise = analisar_sentimento(nova.Comentario)
                if analise and 'sentimento' in analise:
                    sentimento_nlp = analise['sentimento']
                    sentimento = verificar_consistencia_sentimento(sentimento_nlp, nova.Nota)
                    
                    # Atualizar o sentimento no banco
                    nova.sentimento_auto = sentimento
                    banco.session.commit()
                else:
                    sentimento = "neutro"  # valor padrão
            except Exception as e:
                print(f"[NLP] Falha análise: {e}")
                sentimento = "neutro"
        except Exception as e:
            banco.session.rollback()
            return {'message': f'Erro ao salvar avaliação: {str(e)}'}, 500
        # Notificação e retorno (mantido)
        return {
            'ID': aval.ID,
            'ID_Cliente': aval.ID_Cliente,
            'ID_Restaurante': aval.ID_Restaurante,
            'Nota': aval.Nota,
            'Comentario': aval.Comentario,
            'data_avaliacao': aval.data_avaliacao,
            'sentimento_auto': aval.sentimento_auto
        }, 201
@api.route('/restaurante/<int:id>/sentimento-metricas')
class SentimentoMetricas(Resource):
    def get(self, id):
        # conta por sentimento_auto (ignora NULL)
        rows = (
            banco.session.query(avaliacaoModel.sentimento_auto, func.count(avaliacaoModel.ID))
            .filter(avaliacaoModel.ID_Restaurante == id, avaliacaoModel.visivel == True,
                    avaliacaoModel.sentimento_auto.isnot(None))
            .group_by(avaliacaoModel.sentimento_auto)
            .all()
        )
        counts = {r[0]: r[1] for r in rows}
        total = sum(counts.values()) or 1
        return {
            "positivo": counts.get("positivo", 0),
            "neutro": counts.get("neutro", 0),
            "negativo": counts.get("negativo", 0),
            "total": total,
            "percentuais": {
                "positivo": round(100 * counts.get("positivo", 0) / total, 2),
                "neutro": round(100 * counts.get("neutro", 0) / total, 2),
                "negativo": round(100 * counts.get("negativo", 0) / total, 2),
            }
        }, 200
        
        
    

# Adicione após a classe SentimentoMetricas
@api.route('/restaurante/<int:id>/processar-avaliacoes')
class ProcessarAvaliacoes(Resource):
    def post(self, id):
        """Processa todas as avaliações de um restaurante com o serviço NLP"""
        avaliacoes = avaliacaoModel.query.filter_by(ID_Restaurante=id, visivel=True).all()
        
        processadas = 0
        for a in avaliacoes:
            if a.Comentario:
                try:
                    analise = analisar_sentimento(a.Comentario)
                    
                    if analise and 'sentimento' in analise:
                        sentimento_nlp = analise['sentimento']
                        
                        # Verificar consistência com a nota
                        sentimento_final = verificar_consistencia_sentimento(sentimento_nlp, a.Nota)
                        
                        # Atualizar o sentimento no banco
                        a.sentimento_auto = sentimento_final
                        processadas += 1
                        print(f"Avaliação {a.ID} processada: '{a.Comentario[:30]}...' → {sentimento_final}")
                        
                except Exception as e:
                    print(f"[NLP] Falha ao analisar avaliação {a.ID}: {str(e)}")
        
        try:
            banco.session.commit()
        except Exception as e:
            banco.session.rollback()
            print(f"Erro ao salvar alterações no banco: {str(e)}")
            return {"message": f"Erro ao processar avaliações: {str(e)}"}, 500
        
        return {"message": f"Processadas {processadas} avaliações", 
                "total": len(avaliacoes),
                "processadas": processadas}, 200
           
           
           
# Em resource/avaliacao.py, adicione esta função
def verificar_consistencia_sentimento(sentimento_nlp, nota):
    """
    Verifica se o sentimento detectado pela IA é consistente com a nota
    e retorna o sentimento mais adequado.
    
    Notas 4-5: normalmente positivas
    Nota 3: normalmente neutras
    Notas 1-2: normalmente negativas
    """
    # Mapeamento de nota para sentimento esperado
    if nota >= 4:
        sentimento_esperado = "positivo"
    elif nota <= 2:
        sentimento_esperado = "negativo"
    else:
        sentimento_esperado = "neutro"
    
    # Se houver inconsistência significativa entre o sentimento detectado e a nota
    if (sentimento_nlp == "positivo" and nota <= 2) or (sentimento_nlp == "negativo" and nota >= 4):
        # Dar maior peso à nota em caso de forte inconsistência
        return sentimento_esperado
    
    # Para inconsistências menores, considerar ambos
    if sentimento_nlp == "neutro" and sentimento_esperado != "neutro":
        # Se o texto for neutro mas a nota não, usar 70% da nota como influência
        return sentimento_esperado
    
    # Nos demais casos, confiar no modelo NLP
    return sentimento_nlp



@api.route('/restaurante/<int:id>/insights-report')
class InsightsReport(Resource):
    def get(self, id):
        """Gera relatório de insights baseado nas avaliações"""
        print(f"Gerando insights para restaurante {id}")
        
        # Remova o filtro sentimento_auto.isnot(None) para incluir todas as avaliações
        avaliacoes = (
            avaliacaoModel.query
            .filter_by(ID_Restaurante=id, visivel=True)
            .all()
        )
        print(f"Encontradas {len(avaliacoes)} avaliações")
        
        if not avaliacoes:
            return {"message": "Não há avaliações suficientes para gerar insights"}, 404
            
        # Processar avaliações sem sentimento na hora
        dados = []
        for a in avaliacoes:
            sentimento = a.sentimento_auto
            if not sentimento and a.Comentario:
                try:
                    analise = analisar_sentimento(a.Comentario)
                    if analise and 'sentimento' in analise:
                        sentimento = analise['sentimento']
                        a.sentimento_auto = sentimento
                        banco.session.commit()
                except Exception as e:
                    print(f"[NLP] Falha análise: {e}")
                    
            dados.append({
                "ID": a.ID,
                "Comentario": a.Comentario,
                "Nota": a.Nota,
                "sentimento": sentimento or "neutro",  # Default para neutro se não processado
                "data": a.data_avaliacao
            })
            
        import pandas as pd
        import os
        import io
        import traceback
        import matplotlib.pyplot as plt
        import matplotlib
        
        df = pd.DataFrame(dados)
        
        # Salvar no arquivo CSV para treino futuro do modelo
        try:
            csv_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 
                                "IA-Backend", "data", "processed")
            os.makedirs(csv_dir, exist_ok=True)
            
            # Formato para treino: comment, sentiment
            treino_df = pd.DataFrame({
                "comment": df["Comentario"],
                "sentiment": df["sentimento"]
            })
            treino_df.to_csv(os.path.join(csv_dir, f"feedback_{id}_{datetime.now().strftime('%Y%m%d')}.csv"), 
                           index=False, encoding='utf-8')
        except Exception as e:
            print(f"Erro ao salvar arquivo CSV para treino: {e}")
        
        # Gerar PDF com insights
        try:
            matplotlib.use('Agg')  # Non-interactive backend
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image, Table, TableStyle
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from reportlab.lib.units import inch
            from reportlab.lib.enums import TA_CENTER, TA_LEFT
            
            # Criar buffer para PDF
            buffer = io.BytesIO()
            
            # Configurar documento
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            styles = getSampleStyleSheet()
            title_style = styles['Title']
            heading_style = styles['Heading2']
            normal_style = styles['Normal']
            
            # Elementos do relatório
            elements = []
            
            # Título
            restaurante = restauranteModel.find_restaurante(id)
            # CORREÇÃO: Acesse o atributo diretamente em vez de usar notação de dicionário
            nome_restaurante = restaurante.Nome if restaurante else f"Restaurante #{id}"
            elements.append(Paragraph(f"Relatório de Insights - {nome_restaurante}", title_style))
            elements.append(Spacer(1, 0.25*inch))
            
            # Resumo geral
            elements.append(Paragraph("Resumo Geral", heading_style))
            total = len(dados)
            positivos = sum(1 for d in dados if d['sentimento'] == 'positivo')
            neutros = sum(1 for d in dados if d['sentimento'] == 'neutro')
            negativos = sum(1 for d in dados if d['sentimento'] == 'negativo')
            
            elements.append(Paragraph(f"Total de avaliações analisadas: {total}", normal_style))
            elements.append(Paragraph(f"Avaliações positivas: {positivos} ({round(positivos/total*100, 1) if total > 0 else 0}%)", normal_style))
            elements.append(Paragraph(f"Avaliações neutras: {neutros} ({round(neutros/total*100, 1) if total > 0 else 0}%)", normal_style))
            elements.append(Paragraph(f"Avaliações negativas: {negativos} ({round(negativos/total*100, 1) if total > 0 else 0}%)", normal_style))
            elements.append(Spacer(1, 0.25*inch))
            
            # Gráfico de distribuição de sentimento
            plt.figure(figsize=(6, 4))
            counts = df['sentimento'].value_counts()
            plt.bar(counts.index, counts.values, color=['green', 'gray', 'red'])
            plt.title('Distribuição de Sentimentos')
            plt.ylabel('Número de Avaliações')
            plt.tight_layout()
            
            # Salvar gráfico
            img_sentimento = io.BytesIO()
            plt.savefig(img_sentimento, format='png')
            img_sentimento.seek(0)
            plt.close()
            
            # Adicionar gráfico ao PDF
            elements.append(Image(img_sentimento, width=6*inch, height=3*inch))
            elements.append(Spacer(1, 0.25*inch))
            
            # Análise de pontos fortes e fracos
            elements.append(Paragraph("Pontos Fortes", heading_style))
            
            # Extração de palavras-chave dos comentários positivos
            pos_comments = ' '.join([d['Comentario'] for d in dados if d['sentimento'] == 'positivo'])
            if pos_comments:
                # Lista de pontos fortes baseada em palavras-chave
                pontos_fortes = extrair_temas(pos_comments)
                
                for i, (tema, exemplos) in enumerate(pontos_fortes[:5]):  # Top 5 pontos fortes
                    elements.append(Paragraph(f"{i+1}. {tema.title()}", styles['Heading4']))
                    for ex in exemplos[:2]:  # Limita a 2 exemplos por tema
                        elements.append(Paragraph(f"• \"{ex}\"", normal_style))
                    
                elements.append(Spacer(1, 0.1*inch))
            else:
                elements.append(Paragraph("Não há comentários positivos suficientes para análise.", normal_style))
            
            elements.append(Spacer(1, 0.25*inch))
            
            # Pontos fracos
            elements.append(Paragraph("Pontos a Melhorar", heading_style))
            
            # Extração de palavras-chave dos comentários negativos
            neg_comments = ' '.join([d['Comentario'] for d in dados if d['sentimento'] == 'negativo'])
            if neg_comments:
                # Lista de pontos fracos baseada em palavras-chave
                pontos_fracos = extrair_temas(neg_comments)
                
                for i, (tema, exemplos) in enumerate(pontos_fracos[:5]):  # Top 5 pontos fracos
                    elements.append(Paragraph(f"{i+1}. {tema.title()}", styles['Heading4']))
                    for ex in exemplos[:2]:  # Limita a 2 exemplos por tema
                        elements.append(Paragraph(f"• \"{ex}\"", normal_style))
                        
                elements.append(Spacer(1, 0.1*inch))
            else:
                elements.append(Paragraph("Não há comentários negativos suficientes para análise.", normal_style))
            
            elements.append(Spacer(1, 0.25*inch))
            
            # Tendência temporal
            elements.append(Paragraph("Tendência de Avaliações", heading_style))
            
            # Converter datas e agrupar por mês
            df['data_dt'] = pd.to_datetime(df['data'], errors='coerce')
            df['mes'] = df['data_dt'].dt.strftime('%Y-%m')
            
            # Agrupar por mês e sentimento
            tendencia = df.groupby(['mes', 'sentimento']).size().unstack(fill_value=0)
            
            if not tendencia.empty and len(tendencia) > 1:  # Se tiver dados suficientes
                plt.figure(figsize=(8, 4))
                tendencia.plot(kind='line', marker='o')
                plt.title('Tendência de Sentimentos ao Longo do Tempo')
                plt.xlabel('Mês')
                plt.ylabel('Número de Avaliações')
                plt.grid(True, linestyle='--', alpha=0.7)
                plt.tight_layout()
                
                # Salvar gráfico
                img_tendencia = io.BytesIO()
                plt.savefig(img_tendencia, format='png')
                img_tendencia.seek(0)
                plt.close()
                
                # Adicionar gráfico ao PDF
                elements.append(Image(img_tendencia, width=7*inch, height=3*inch))
                elements.append(Spacer(1, 0.25*inch))
            else:
                elements.append(Paragraph("Dados insuficientes para análise de tendência temporal.", normal_style))
            
            # Conclusão e recomendações
            elements.append(Paragraph("Recomendações", heading_style))
            
            # Gerar recomendações com base na análise
            recomendacoes = gerar_recomendacoes(pontos_fortes[:3] if 'pontos_fortes' in locals() else [], 
                                             pontos_fracos[:3] if 'pontos_fracos' in locals() else [])
            
            for i, rec in enumerate(recomendacoes):
                elements.append(Paragraph(f"{i+1}. {rec}", normal_style))
                elements.append(Spacer(1, 0.1*inch))
            
            
            # IMPORTANTE: Tratar os imports necessários
            import matplotlib.pyplot as plt
            import nltk
            # Construir o PDF
            doc.build(elements)
            
            # Preparar o PDF para download
            buffer.seek(0)
            
            response = make_response(send_file(
                buffer,
                mimetype='application/pdf',
                as_attachment=True,
                download_name=f'insights_{nome_restaurante}_{datetime.now().strftime("%Y%m%d")}.pdf'
            ))
            return response
            
        except Exception as e:
            print(f"Erro ao gerar relatório PDF: {e}")
            traceback.print_exc()
            return {"message": f"Erro ao gerar relatório: {str(e)}"}, 500


# Funções auxiliares para análise de texto
def extrair_temas(texto):
    """Extrai temas/tópicos baseados em palavras-chave e agrupamentos"""
    from sklearn.feature_extraction.text import TfidfVectorizer, CountVectorizer
    from sklearn.cluster import KMeans
    import nltk
    try:
        nltk.data.find('tokenizers/punkt')
    except LookupError:
        nltk.download('punkt', quiet=True)
    
    try:
        nltk.data.find('corpora/stopwords')
    except LookupError:
        nltk.download('stopwords', quiet=True)
    
    from nltk.corpus import stopwords
    from nltk.tokenize import sent_tokenize
    
    # Stopwords em português
    stop_words = set(stopwords.words('portuguese'))
    
    # Dividir em sentenças
    sentences = sent_tokenize(texto)
    if len(sentences) < 3:  # Se tiver poucas sentenças, retorna elas diretamente
        return [("comentário", sentences)]
    
    # Dicionários temáticos para categorização
    temas_dict = {
        'atendimento': ['atendimento', 'atendeu', 'atencioso', 'educado', 'gentil', 'cortês', 'rápido', 'demorado', 'espera', 'garçom', 'garçonete', 'recepção', 'recepcionista'],
        'comida': ['comida', 'prato', 'gostoso', 'delicioso', 'saboroso', 'tempero', 'temperado', 'sabor', 'qualidade', 'fresco'],
        'ambiente': ['ambiente', 'local', 'espaço', 'decoração', 'música', 'barulho', 'barulhento', 'confortável', 'limpo', 'sujo', 'higiene'],
        'preço': ['preço', 'caro', 'barato', 'valor', 'custo', 'benefício', 'custo-benefício', 'vale', 'compensa'],
        'localização': ['localização', 'lugar', 'estacionamento', 'acesso', 'acessível']
    }
    
    # Classificar sentenças por tema
    classificados = {}
    for tema, palavras in temas_dict.items():
        classificados[tema] = []
        for sentenca in sentences:
            tokens = sentenca.lower().split()
            if any(palavra in tokens for palavra in palavras):
                classificados[tema].append(sentenca)
    
    # Filtrar temas sem sentenças e ordenar por quantidade
    temas_com_exemplos = [(tema, exemplos) for tema, exemplos in classificados.items() if exemplos]
    temas_com_exemplos.sort(key=lambda x: len(x[1]), reverse=True)
    
    # Se não encontrar temas específicos, usar clustering
    if not temas_com_exemplos:
        vectorizer = TfidfVectorizer(
            min_df=1, stop_words=list(stop_words), ngram_range=(1, 2)
        )
        X = vectorizer.fit_transform(sentences)
        
        # Determine o número de clusters (temas)
        n_clusters = min(3, len(sentences))
        kmeans = KMeans(n_clusters=n_clusters)
        kmeans.fit(X)
        
        # Ordenar sentenças por cluster
        cluster_sentences = [[] for _ in range(n_clusters)]
        for i, label in enumerate(kmeans.labels_):
            cluster_sentences[label].append(sentences[i])
        
        # Obter palavras-chave para cada cluster
        ordem_clusters = sorted(range(n_clusters), 
                            key=lambda i: len(cluster_sentences[i]), 
                            reverse=True)
        
        # Criar temas com as palavras mais representativas
        for i in ordem_clusters:
            if cluster_sentences[i]:
                # Usar o primeiro substantivo/adjetivo da primeira sentença como tema
                primeiro_termo = cluster_sentences[i][0].split()[0].lower()
                temas_com_exemplos.append((primeiro_termo, cluster_sentences[i]))
    
    return temas_com_exemplos

def gerar_recomendacoes(pontos_fortes, pontos_fracos):
    """Gera recomendações com base nos pontos fortes e fracos"""
    recomendacoes = []
    
    # Recomendações baseadas em pontos fracos
    for tema, _ in pontos_fracos:
        if tema == 'atendimento':
            recomendacoes.append("Considere investir em treinamento para a equipe de atendimento para melhorar a experiência do cliente.")
        elif tema == 'comida':
            recomendacoes.append("Revise o preparo e apresentação dos pratos, considerando feedback específico sobre sabor e qualidade.")
        elif tema == 'ambiente':
            recomendacoes.append("Avalie melhorias no ambiente físico do estabelecimento, como conforto, limpeza e nível de ruído.")
        elif tema == 'preço':
            recomendacoes.append("Reavalie a relação custo-benefício dos pratos. Considere ajustar porções ou preços conforme necessário.")
        elif tema == 'localização':
            recomendacoes.append("Forneça informações mais claras sobre localização, estacionamento e acesso ao estabelecimento.")
    
    # Recomendações gerais se não houver pontos específicos
    if not recomendacoes:
        recomendacoes = [
            "Continue monitorando as avaliações para identificar tendências e oportunidades de melhoria.",
            "Implemente um programa de fidelidade para incentivar clientes satisfeitos a retornar.",
            "Responda ativamente às avaliações negativas, mostrando seu compromisso com a satisfação do cliente."
        ]
    
    # Recomendações baseadas em pontos fortes
    for tema, _ in pontos_fortes:
        if tema == 'atendimento':
            recomendacoes.append("Continue incentivando sua excelente equipe de atendimento. Considere reconhecimento ou bonificações para manter o alto padrão.")
        elif tema == 'comida':
            recomendacoes.append("Destaque os pratos mais elogiados em seu menu ou mídias sociais como especialidades da casa.")
        elif tema == 'ambiente':
            recomendacoes.append("Aproveite o ambiente bem avaliado em suas campanhas de marketing.")
            
    return recomendacoes[:5]  # Limitar a 5 recomendações


@api.route('/avaliando')
class CriarAvaliacao(Resource):
    @jwt_required()
    @any_authenticated
    @api.expect(parser)
    @api.marshal_with(avaliacao_schema, code=201)
    def post(self):
        """Cria nova avaliação com suporte a imagens"""
        try:
            # Obter dados do formulário (não JSON, pois vamos receber FormData)
            id_cliente = request.form.get('ID_Cliente', type=int)
            id_restaurante = request.form.get('ID_Restaurante', type=int)
            nota = request.form.get('Nota', type=int)
            comentario = request.form.get('Comentario', '')
            
            print(f"Recebendo avaliação: Cliente={id_cliente}, Restaurante={id_restaurante}, Nota={nota}")
            print(f"Comentário: {comentario[:50]}...")
            
            # Validações
            if not all([id_cliente, id_restaurante, nota]):
                return {"message": "Campos obrigatórios faltando"}, 400
            
            if not (1 <= nota <= 5):
                return {"message": "Nota deve estar entre 1 e 5"}, 400
            
            if not comentario or len(comentario.strip()) < 10:
                return {"message": "Comentário deve ter pelo menos 10 caracteres"}, 400
            
            # Filtro de conteúdo - CORREÇÃO AQUI
            filtro = ContentFilter()
            comentario_filtrado, contem_ofensa = filtro.verificar_e_censurar(comentario)
            
            if contem_ofensa:
                print(f"⚠️ Conteúdo ofensivo detectado e censurado")
                comentario = comentario_filtrado  # Usar versão censurada
            
            # Criar avaliação
            nova_avaliacao = avaliacaoModel(
                Nota=nota,
                Comentario=comentario,
                ID_Cliente=id_cliente,
                ID_Restaurante=id_restaurante,
                visivel=True
            )
            
            banco.session.add(nova_avaliacao)
            banco.session.flush()  # Para obter o ID antes do commit
            
            print(f"✓ Avaliação criada com ID: {nova_avaliacao.ID}")
            
            # Processar imagens (se houver)
            imagens_urls = []
            if 'imagens' in request.files:
                imagens = request.files.getlist('imagens')
                print(f"📷 Processando {len(imagens)} imagem(ns)...")
                
                # Limitar a 5 imagens
                if len(imagens) > 5:
                    banco.session.rollback()
                    return {"message": "Máximo de 5 imagens por avaliação"}, 400
                
                for idx, imagem in enumerate(imagens):
                    if imagem and imagem.filename:
                        # Validar extensão
                        extensao = imagem.filename.lower().split('.')[-1]
                        if extensao not in ['png', 'jpg', 'jpeg', 'gif', 'webp']:
                            print(f"⚠️ Extensão inválida: {extensao}")
                            continue
                        
                        try:
                            imagem_url = upload_image(
                                imagem,
                                folder=f"avaliacoes/restaurante_{id_restaurante}",
                                filename=f"aval_{nova_avaliacao.ID}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{idx}"
                            )
                            
                            if imagem_url:
                                imagens_urls.append(imagem_url)
                                print(f"✓ Imagem {idx + 1} enviada: {imagem_url}")
                        except Exception as e:
                            print(f"❌ Erro ao fazer upload da imagem {idx}: {e}")
                            continue
            
            # Atualizar avaliação com URLs das imagens
            nova_avaliacao.imagens_urls = imagens_urls
            nova_avaliacao.tem_imagens = bool(imagens_urls)
            
            print(f"📊 Total de imagens: {len(imagens_urls)}")
            
            # Análise de sentimento
            sentimento = None
            try:
                resultado_nlp = analisar_sentimento(comentario)
                if resultado_nlp and 'sentimento' in resultado_nlp:
                    sentimento_nlp = resultado_nlp['sentimento']
                    # Verificar consistência com a nota
                    sentimento = verificar_consistencia_sentimento(sentimento_nlp, nota)
                    nova_avaliacao.sentimento_auto = sentimento
                    print(f"🤖 Sentimento analisado: {sentimento}")
            except Exception as e:
                print(f"⚠️ Erro na análise de sentimento: {e}")
                nova_avaliacao.sentimento_auto = 'neutro'
                sentimento = 'neutro'
            
            banco.session.commit()
            print("✓ Avaliação salva no banco de dados")
            
            # ✅ NOVO: Sistema de Pontos - Processar pontos para avaliação
            try:
                resultado_pontos = PontosService.processar_pontos_avaliacao_restaurante(
                    cliente_id=id_cliente,
                    restaurante_id=id_restaurante,
                    nota=nota,
                    comentario=comentario,
                    tem_imagens=bool(imagens_urls),
                    avaliacao_id=nova_avaliacao.ID
                )
                print(f"🎁 Pontos concedidos: {resultado_pontos['pontos_ganhos']}")
            except Exception as e:
                print(f"⚠️ Erro ao processar pontos: {e}")
                # Não falhar a avaliação por erro nos pontos
            
            # Buscar informações para notificação e e-mail
            try:
                restaurante = restauranteModel.find_restaurante(id_restaurante)
                cliente = UsuarioModel.find_by_id(id_cliente)
                
                if restaurante and cliente:
                    print(f"📧 Preparando notificações para {restaurante.Nome}")
                    
                    # Criar notificação
                    try:
                        # Preparar dados para a notificação
                        comentario_resumido = comentario[:100] + "..." if len(comentario) > 100 else comentario
                        
                        criar_notificacao(
                            destinatario_id=id_restaurante,
                            tipo_destinatario='restaurante',
                            titulo='Nova avaliação recebida',
                            mensagem=f'Cliente {cliente.Nome} avaliou seu restaurante com nota {nota}/5: "{comentario_resumido}"',
                            tipo='avaliacao',
                            link_destino=f'/restaurante-dashboard/{id_restaurante}/avaliacoes',
                            dados_adicionais={
                                'nota': nota,
                                'sentimento': sentimento or 'neutro',
                                'avaliacao_id': nova_avaliacao.ID,
                                'conteudo_filtrado': contem_ofensa,
                                'tem_imagens': nova_avaliacao.tem_imagens,
                                'total_imagens': len(imagens_urls),
                                'cliente_nome': cliente.Nome
                            }
                        )
                        print("✓ Notificação criada")
                    except Exception as e:
                        print(f"⚠️ Erro ao criar notificação: {e}")
                    
                    # Enviar e-mail ao restaurante
                    try:
                        print(f"🔄 Iniciando envio de e-mail para {restaurante.email}")
                        
                        # Determinar emoji com base no sentimento
                        emoji_sentimento = {
                            'positivo': '😊',
                            'neutro': '😐',
                            'negativo': '😟'
                        }.get(sentimento or 'neutro', '😐')
                        
                        # HTML do e-mail
                        html_content = f"""
                        <html>
                        <head>
                            <style>
                                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9f6f2; margin: 0; padding: 20px; }}
                                .container {{ max-width: 600px; margin: 0 auto; background-color: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }}
                                .header {{ background: linear-gradient(135deg, #d97746 0%, #c0653a 100%); padding: 30px; text-align: center; color: white; }}
                                .header h1 {{ margin: 0; font-size: 24px; font-weight: 600; }}
                                .content {{ padding: 30px; }}
                                .rating {{ font-size: 32px; color: #ffc72c; text-align: center; margin: 20px 0; }}
                                .sentiment {{ text-align: center; font-size: 48px; margin: 20px 0; }}
                                .comment {{ background-color: #faf9f7; padding: 20px; border-radius: 8px; border-left: 4px solid #d97746; margin: 20px 0; }}
                                .info {{ color: #7a736d; font-size: 14px; margin: 10px 0; }}
                                .images-section {{ margin: 20px 0; padding: 15px; background: #f0f7f4; border-radius: 8px; text-align: center; }}
                                .images-section h3 {{ color: #1a5653; font-size: 16px; margin-bottom: 10px; }}
                                .cta {{ text-align: center; margin: 30px 0; }}
                                .btn {{ background-color: #6a9c89; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; }}
                                .footer {{ background-color: #f9f6f2; padding: 20px; text-align: center; color: #7a736d; font-size: 12px; }}
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <div class="header">
                                    <h1>🎉 Nova Avaliação Recebida!</h1>
                                </div>
                                <div class="content">
                                    <div class="sentiment">{emoji_sentimento}</div>
                                    <p class="info"><strong>{cliente.Nome}</strong> avaliou seu restaurante</p>
                                    
                                    <div class="rating">
                                        {"⭐" * nota}
                                    </div>
                                    
                                    <div class="comment">
                                        <p><strong>Comentário:</strong></p>
                                        <p>{comentario}</p>
                                    </div>
                                    
                                    {f"<div class='images-section'><h3>📸 Esta avaliação inclui {len(imagens_urls)} foto(s)</h3><p style='font-size: 12px; color: #666;'>Acesse o dashboard para visualizar as imagens</p></div>" if imagens_urls else ""}
                                    
                                    <p class="info">
                                        <strong>Sentimento detectado:</strong> {(sentimento or 'Neutro').title()}<br>
                                        <strong>Data:</strong> {nova_avaliacao.data_avaliacao}
                                    </p>
                                    
                                    <div class="cta">
                                        <a href="http://localhost:4200/dashboard-restaurante/{id_restaurante}" class="btn">
                                            Ver no Dashboard
                                        </a>
                                    </div>
                                </div>
                                <div class="footer">
                                    <p>SnapEats - Sistema de Gestão de Avaliações</p>
                                    <p>Este é um e-mail automático, não responda.</p>
                                </div>
                            </div>
                        </body>
                        </html>
                        """
                        
                        texto_simples = f"""
                        Nova avaliação recebida!
                        
                        Cliente: {cliente.Nome}
                        Nota: {nota} estrelas
                        Sentimento: {(sentimento or 'Neutro').title()} {emoji_sentimento}
                        
                        Comentário:
                        {comentario}
                        
                        {f"Esta avaliação inclui {len(imagens_urls)} foto(s)" if imagens_urls else ""}
                        
                        Acesse seu dashboard para ver mais detalhes:
                        http://localhost:4200/dashboard-restaurante/{id_restaurante}
                        """
                        
                        resultado_email = email_service.send_email(
                            recipient=restaurante.email,
                            subject=f"Nova avaliação de {nota} estrelas - SnapEats",
                            html_content=html_content,
                            text_content=texto_simples
                        )
                        
                        if resultado_email:
                            print(f"✓ E-mail enviado com sucesso para {restaurante.email}")
                        else:
                            print(f"⚠️ Falha no envio de e-mail para {restaurante.email}")
                    except Exception as e:
                        print(f"⚠️ Erro ao enviar e-mail: {e}")
                        import traceback
                        traceback.print_exc()
            except Exception as e:
                print(f"⚠️ Erro ao processar notificações: {e}")
                import traceback
                traceback.print_exc()
            
            return {
                'ID': nova_avaliacao.ID,
                'ID_Cliente': nova_avaliacao.ID_Cliente,
                'ID_Restaurante': nova_avaliacao.ID_Restaurante,
                'Nota': nova_avaliacao.Nota,
                'Comentario': nova_avaliacao.Comentario,
                'data_avaliacao': nova_avaliacao.data_avaliacao,
                'sentimento_auto': nova_avaliacao.sentimento_auto,
                'imagens_urls': nova_avaliacao.imagens_urls,
                'tem_imagens': nova_avaliacao.tem_imagens,
                'total_imagens': len(imagens_urls)
            }, 201
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro ao criar avaliação: {e}")
            import traceback
            traceback.print_exc()
            return {"message": f"Erro ao salvar avaliação: {str(e)}"}, 500



@api.route('/avaliacoes/<int:id_restaurante>')
class AvaliacoesRestaurante(Resource):
    def get(self, id_restaurante):
        # Adicionar filtro de visibilidade
        avaliacoes = avaliacaoModel.query.filter_by(ID_Restaurante=id_restaurante, visivel=True).all()
        return [
            {
                "ID": a.ID,
                "ID_Cliente": a.ID_Cliente,
                "ID_Restaurante": a.ID_Restaurante,
                "Nota": a.Nota,
                "Comentario": a.Comentario,
                "data_avaliacao": a.data_avaliacao.isoformat() if isinstance(a.data_avaliacao, datetime) else a.data_avaliacao,
                "Nome_Cliente": UsuarioModel.find_by_id(a.ID_Cliente).Nome if UsuarioModel.find_by_id(a.ID_Cliente) else "Usuário Anônimo",
                "sentimento_auto": a.sentimento_auto
            }
            for a in avaliacoes
        ], 200

# Adicionar ao resource/avaliacao.py
@api.route('/avaliando-com-tags')
class CriarAvaliacaoComTags(Resource):
    @jwt_required()
    @cliente_required
    def post(self):
        """Cria nova avaliação com suporte a tags e imagens"""
        try:
            # Dados da avaliação principal
            id_cliente = request.form.get('ID_Cliente', type=int)
            id_restaurante = request.form.get('ID_Restaurante', type=int)
            nota = request.form.get('Nota', type=int)
            comentario = request.form.get('Comentario', '')
            
            # Processar tags do FormData
            tags_notas = {}
            for key in request.form.keys():
                if key.startswith('tag_'):
                    try:
                        tag_id = int(key.split('_')[1])
                        nota_tag = int(request.form.get(key))
                        if 1 <= nota_tag <= 5:
                            tags_notas[tag_id] = nota_tag
                    except (ValueError, IndexError):
                        continue
            
            print(f"📝 CRIANDO NOVA AVALIAÇÃO COM TAGS")
            print(f"   Cliente: {id_cliente}, Restaurante: {id_restaurante}, Nota: {nota}")
            print(f"   Comentário: {comentario[:50]}...")
            print(f"   Tags recebidas: {tags_notas}")
            
            # ✅ Debug: Verificar se avaliação já existe
            total_avaliacoes = avaliacaoModel.query.filter_by(
                ID_Cliente=id_cliente,
                ID_Restaurante=id_restaurante
            ).count()
            print(f"   Total de avaliações existentes (incluindo invisíveis): {total_avaliacoes}")
            
            # ✅ Validações com códigos HTTP apropriados
            if not all([id_cliente, id_restaurante, nota]):
                return {
                    "message": "Campos obrigatórios faltando.",
                    "tipo_erro": "missing_fields",
                    "campos_obrigatorios": ["ID_Cliente", "ID_Restaurante", "Nota"]
                }, 422  # ✅ Unprocessable Entity
            
            if not (1 <= nota <= 5):
                return {
                    "message": "Nota deve estar entre 1 e 5.",
                    "tipo_erro": "invalid_rating",
                    "valor_recebido": nota
                }, 422  # ✅ Unprocessable Entity
            
            if not comentario or len(comentario.strip()) < 10:
                return {
                    "message": "Comentário deve ter pelo menos 10 caracteres.",
                    "tipo_erro": "invalid_comment",
                    "tamanho_minimo": 10,
                    "tamanho_atual": len(comentario.strip()) if comentario else 0
                }, 422  # ✅ Unprocessable Entity
            
            # Validar usuário e restaurante
            print(f"🔍 Validando usuário ID {id_cliente}...")
            usuario = UsuarioModel.find_by_id(id_cliente)
            if not usuario:
                print(f"❌ Cliente não encontrado: {id_cliente}")
                return {
                    "message": "Cliente não encontrado.",
                    "tipo_erro": "client_not_found",
                    "id_cliente": id_cliente
                }, 404  # ✅ Not Found
            
            # ✅ CORRIGIDO: UsuarioModel.find_by_id retorna objeto UsuarioModel
            nome_cliente = getattr(usuario, 'Nome', 'N/A')
            print(f"✅ Cliente encontrado: {nome_cliente}")
            
            print(f"🔍 Validando restaurante ID {id_restaurante}...")
            restaurante = restauranteModel.find_restaurante(id_restaurante)
            if not restaurante:
                print(f"❌ Restaurante não encontrado: {id_restaurante}")
                return {
                    "message": "Restaurante não encontrado.",
                    "tipo_erro": "restaurant_not_found",
                    "id_restaurante": id_restaurante
                }, 404  # ✅ Not Found
            
            # ✅ CORRIGIDO: restauranteModel.find_restaurante retorna objeto restauranteModel
            nome_restaurante = getattr(restaurante, 'Nome', 'N/A')
            print(f"✅ Restaurante encontrado: {nome_restaurante}")
            
            # ✅ Verificar se já existe avaliação VISÍVEL deste cliente neste restaurante
            print(f"🔍 Verificando avaliação duplicada...")
            
            # Verificar todas as avaliações deste cliente neste restaurante (para debug)
            todas_avaliacoes = avaliacaoModel.query.filter_by(
                ID_Cliente=id_cliente,
                ID_Restaurante=id_restaurante
            ).all()
            
            print(f"📊 Total de avaliações do cliente {id_cliente} no restaurante {id_restaurante}: {len(todas_avaliacoes)}")
            
            for idx, aval in enumerate(todas_avaliacoes):
                print(f"   Avaliação #{idx + 1}:")
                print(f"     ID: {aval.ID}")
                print(f"     Visível: {aval.visivel}")
                print(f"     Nota: {aval.Nota}")
                print(f"     Data: {aval.data_avaliacao}")
            
            # Só bloquear se existir avaliação visível
            avaliacao_existente = avaliacaoModel.query.filter_by(
                ID_Cliente=id_cliente,
                ID_Restaurante=id_restaurante,
                visivel=True
            ).first()
            
            # ✅ TEMPORÁRIO PARA DEBUG: Permitir override com parâmetro force
            force_create = request.form.get('force_create', '').lower() == 'true'
            
            if avaliacao_existente and not force_create:
                print(f"❌ Avaliação duplicada encontrada (ID: {avaliacao_existente.ID})")
                
                # ✅ CORRIGIDO: Tratar data_avaliacao que pode ser string ou datetime
                data_avaliacao_str = avaliacao_existente.data_avaliacao
                if isinstance(data_avaliacao_str, datetime):
                    data_avaliacao_str = data_avaliacao_str.isoformat()
                elif data_avaliacao_str is None:
                    data_avaliacao_str = datetime.now().isoformat()
                # Se já for string, mantém como está
                
                return {
                    "message": "Você já avaliou este restaurante. Para modificar sua avaliação, edite a avaliação existente.",
                    "tipo_erro": "duplicate_review",
                    "avaliacao_existente": {
                        "id": avaliacao_existente.ID,
                        "nota": avaliacao_existente.Nota,
                        "data": str(data_avaliacao_str),  # ✅ Forçar conversão para string
                        "comentario": avaliacao_existente.Comentario[:100] if avaliacao_existente.Comentario else ""
                    },
                    "sugestao": "Utilize o endpoint de atualização para modificar sua avaliação ou adicione 'force_create=true' para teste"
                }, 409  # ✅ Conflict
            
            if force_create:
                print(f"⚠️ OVERRIDE: Criando avaliação mesmo com duplicada existente (force_create=true)")
            else:
                print(f"✅ Nenhuma avaliação duplicada encontrada")
            
            # Filtro de conteúdo
            filtro = ContentFilter()
            comentario_filtrado, contem_ofensa = filtro.verificar_e_censurar(comentario)
            
            if contem_ofensa:
                print(f"⚠️ Conteúdo ofensivo detectado e censurado")
                comentario = comentario_filtrado
            
            # Preparar dados da avaliação
            dados_avaliacao = {
                'Nota': nota,
                'Comentario': comentario,
                'ID_Cliente': id_cliente,
                'ID_Restaurante': id_restaurante,
                'visivel': True
            }
            
            # Criar avaliação com tags (se houver)
            try:
                print(f"📝 Iniciando criação da avaliação...")
                if tags_notas:
                    print(f"   Criando avaliação com tags: {tags_notas}")
                    nova_avaliacao = avaliacaoModel.criar_com_tags(dados_avaliacao, tags_notas)
                else:
                    print(f"   Criando avaliação sem tags")
                    nova_avaliacao = avaliacaoModel(**dados_avaliacao)
                    banco.session.add(nova_avaliacao)
                    banco.session.flush()
                
                print(f"✅ Avaliação criada com ID: {nova_avaliacao.ID}")
            except Exception as e:
                print(f"❌ Erro ao criar avaliação no banco: {str(e)}")
                banco.session.rollback()
                return {
                    "message": "Erro ao criar avaliação no banco de dados.",
                    "tipo_erro": "database_creation_error",
                    "detalhes": str(e)
                }, 500
            
            # Processar imagens
            imagens_urls = []
            if 'imagens' in request.files:
                imagens = request.files.getlist('imagens')
                print(f"📷 Processando {len(imagens)} imagem(ns)...")
                
                # Limitar a 5 imagens
                if len(imagens) > 5:
                    banco.session.rollback()
                    return {
                        "message": "Máximo de 5 imagens por avaliação.",
                        "tipo_erro": "too_many_images",
                        "maximo": 5,
                        "recebido": len(imagens)
                    }, 422  # ✅ Unprocessable Entity
                
                for idx, imagem in enumerate(imagens):
                    if imagem and imagem.filename:
                        extensao = imagem.filename.lower().split('.')[-1]
                        if extensao not in ['png', 'jpg', 'jpeg', 'gif', 'webp']:
                            print(f"⚠️ Extensão inválida: {extensao}")
                            continue
                        
                        try:
                            imagem_url = upload_image(
                                imagem,
                                folder=f"avaliacoes/restaurante_{id_restaurante}",
                                filename=f"aval_{nova_avaliacao.ID}_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{idx}"
                            )
                            
                            if imagem_url:
                                imagens_urls.append(imagem_url)
                                print(f"   ✅ Imagem {idx + 1} enviada")
                        except Exception as e:
                            print(f"   ❌ Erro no upload da imagem {idx}: {e}")
                            continue
                
                # Atualizar avaliação com imagens
                nova_avaliacao.imagens_urls = imagens_urls
                nova_avaliacao.tem_imagens = bool(imagens_urls)
            
            # Commit final
            try:
                banco.session.commit()
            except Exception as e:
                banco.session.rollback()
                print(f"❌ Erro ao salvar no banco: {e}")
                return {
                    "message": "Erro ao salvar avaliação no banco de dados.",
                    "tipo_erro": "database_error",
                    "detalhes": str(e)
                }, 500  # ✅ Internal Server Error
            
            # Recalcular rankings de tags
            if tags_notas:
                from models.tag_restaurante import RestauranteTagsConquistadasModel
                print(f"🔄 Recalculando rankings das tags...")
                
                for tag_id in tags_notas.keys():
                    try:
                        RestauranteTagsConquistadasModel.recalcular_pontuacao(
                            nova_avaliacao.ID_Restaurante,
                            tag_id
                        )
                    except Exception as e:
                        print(f"⚠️ Erro ao recalcular tag {tag_id}: {e}")
            
            # Análise de sentimento
            sentimento = 'neutro'
            try:
                resultado_nlp = analisar_sentimento(comentario)
                if resultado_nlp and 'sentimento' in resultado_nlp:
                    sentimento_nlp = resultado_nlp['sentimento']
                    sentimento = verificar_consistencia_sentimento(sentimento_nlp, nota)
                    nova_avaliacao.sentimento_auto = sentimento
                    banco.session.commit()
            except Exception as e:
                print(f"⚠️ Erro na análise de sentimento: {e}")

            # ✅ NOVO: Sistema de Pontos - Processar pontos para avaliação de restaurante
            print(f"🎁 Processando sistema de pontos...")
            try:
                resultado_pontos = PontosService.processar_pontos_avaliacao_restaurante(
                    cliente_id=id_cliente,
                    restaurante_id=id_restaurante,
                    nota=nota,
                    comentario=comentario,
                    tem_imagens=bool(imagens_urls),
                    avaliacao_id=nova_avaliacao.ID
                )
                print(f"🎁 Pontos concedidos: {resultado_pontos['pontos_ganhos']} pontos para avaliação de restaurante")
            except Exception as e:
                print(f"⚠️ Erro ao processar pontos: {e}")
                traceback.print_exc()
                # Não falhar a avaliação por erro nos pontos

            # Buscar tags criadas para retornar
            from models.tag_restaurante import AvaliacaoTagsModel
            tags_criadas = AvaliacaoTagsModel.find_by_avaliacao(nova_avaliacao.ID) if tags_notas else []
            
            # Notificações e Email (não bloqueia o retorno)
            try:
                restaurante = restauranteModel.find_restaurante(id_restaurante)
                cliente = UsuarioModel.find_by_id(id_cliente)
                
                if restaurante and cliente:
                    resumo_tags = [f"{tag['tag_nome']}: {tag['nota']}⭐" for tag in tags_criadas]
                    
                    # ✅ CORRIGIDO: UsuarioModel.find_by_id retorna objeto UsuarioModel
                    cliente_nome = getattr(cliente, 'Nome', 'Cliente')
                    
                    # Preparar mensagem com tags
                    tags_texto = ", ".join(resumo_tags[:3]) if resumo_tags else "sem tags específicas"
                    comentario_resumido = comentario[:100] + "..." if len(comentario) > 100 else comentario
                    
                    # 📧 ENVIAR EMAIL DE NOTIFICAÇÃO
                    try:
                        print(f"🔄 Iniciando envio de e-mail para {restaurante.email} (avaliação com tags)")
                        
                        # ✅ CORRIGIDO: Usar dados corretos do restaurante
                        nome_restaurante = getattr(restaurante, 'Nome', 'Restaurante')
                        
                        # Criar conteúdo do email com tags
                        html_content = f"""
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fff;">
                            <header style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
                                <h1 style="margin: 0; font-size: 24px;">Nova Avaliação Recebida!</h1>
                                <p style="margin: 5px 0 0 0; opacity: 0.9;">SnapEats - Plataforma de Avaliações</p>
                            </header>
                            
                            <main style="padding: 30px 20px;">
                                <div style="background: #f8f9fa; border-left: 4px solid #28a745; padding: 20px; margin-bottom: 25px;">
                                    <h2 style="margin: 0 0 10px 0; color: #28a745;">Parabéns, {nome_restaurante}!</h2>
                                    <p style="margin: 0; font-size: 16px;">Você recebeu uma nova avaliação de <strong>{nota} estrela{'s' if nota != 1 else ''}</strong> com tags específicas!</p>
                                </div>
                                
                                <div style="margin-bottom: 25px;">
                                    <h3 style="color: #333; border-bottom: 2px solid #eee; padding-bottom: 10px;">Detalhes da Avaliação</h3>
                                    <div style="background: #fff; border: 1px solid #ddd; border-radius: 8px; padding: 20px;">
                                        <p><strong>Cliente:</strong> {cliente_nome}</p>
                                        <p><strong>Nota Geral:</strong> {'⭐' * nota} ({nota}/5)</p>
                                        <p><strong>Comentário:</strong></p>
                                        <blockquote style="background: #f8f9fa; border-left: 3px solid #007bff; margin: 10px 0; padding: 15px; font-style: italic;">
                                            {comentario}
                                        </blockquote>
                                        {f'<p><strong>Tags Avaliadas:</strong> {", ".join(resumo_tags)}</p>' if resumo_tags else ''}
                                        {f"<p><strong>Imagens:</strong> Esta avaliação inclui {len(imagens_urls)} foto(s)</p>" if imagens_urls else ""}
                                    </div>
                                </div>
                                
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="http://localhost:4200/dashboard-restaurante/{id_restaurante}" 
                                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 25px; display: inline-block; font-weight: bold; box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                                        Ver Detalhes no Dashboard
                                    </a>
                                </div>
                            </main>
                            
                            <footer style="background: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #eee;">
                                <p style="margin: 0; color: #666; font-size: 14px;">Continue oferecendo uma excelente experiência!</p>
                                <p style="margin: 5px 0 0 0; color: #999; font-size: 12px;">SnapEats - Conectando sabores e experiências</p>
                            </footer>
                        </div>
                        """
                        
                        texto_simples = f"""
                        NOVA AVALIAÇÃO RECEBIDA - SNAPEATS
                        
                        Parabéns, {nome_restaurante}!
                        Você recebeu uma nova avaliação de {nota} estrela{'s' if nota != 1 else ''}!
                        
                        Detalhes:
                        Cliente: {cliente_nome}
                        Nota: {nota}/5
                        Comentário: {comentario}
                        {f"Tags: {', '.join(resumo_tags)}" if resumo_tags else ""}
                        {f"Esta avaliação inclui {len(imagens_urls)} foto(s)" if imagens_urls else ""}
                        
                        Acesse seu dashboard para ver mais detalhes:
                        http://localhost:4200/dashboard-restaurante/{id_restaurante}
                        """
                        
                        resultado_email = email_service.send_email(
                            recipient=restaurante.email,
                            subject=f"Nova avaliação de {nota} estrelas com tags - SnapEats",
                            html_content=html_content,
                            text_content=texto_simples
                        )
                        
                        if resultado_email:
                            print(f"✅ E-mail enviado com sucesso para {restaurante.email} (avaliação com tags)")
                        else:
                            print(f"❌ Falha no envio de e-mail para {restaurante.email} (avaliação com tags)")
                    except Exception as e:
                        print(f"❌ Erro ao enviar email: {str(e)}")
                        import traceback
                        traceback.print_exc()
                    
                    criar_notificacao(
                        destinatario_id=id_restaurante,
                        tipo_destinatario='restaurante',
                        titulo='Nova avaliação com tags recebida',
                        mensagem=f'Cliente {cliente_nome} avaliou seu restaurante com nota {nota}/5 e tags ({tags_texto}): "{comentario_resumido}"',
                        tipo='avaliacao',
                        link_destino=f'/restaurante-dashboard/{id_restaurante}/avaliacoes',
                        dados_adicionais={
                            'id_avaliacao': nova_avaliacao.ID,
                            'nota_geral': nota,
                            'comentario': comentario[:100],
                            'tags_resumo': resumo_tags,
                            'tem_imagens': nova_avaliacao.tem_imagens,
                            'cliente_nome': cliente_nome,
                            'sentimento': sentimento
                        }
                    )
            except Exception as e:
                print(f"⚠️ Erro ao enviar notificações: {e}")
            
            resultado = {
                'ID': nova_avaliacao.ID,
                'ID_Cliente': nova_avaliacao.ID_Cliente,
                'ID_Restaurante': nova_avaliacao.ID_Restaurante,
                'Nota': nova_avaliacao.Nota,
                'Comentario': nova_avaliacao.Comentario,
                'data_avaliacao': nova_avaliacao.data_avaliacao.isoformat() if isinstance(nova_avaliacao.data_avaliacao, datetime) else nova_avaliacao.data_avaliacao,
                'sentimento_auto': nova_avaliacao.sentimento_auto,
                'imagens_urls': nova_avaliacao.imagens_urls,
                'tem_imagens': nova_avaliacao.tem_imagens,
                'tags_notas': tags_criadas,
                'total_imagens': len(imagens_urls),
                'tags_avaliadas': len(tags_criadas)
            }
            
            return resultado, 201  # ✅ Created
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ ERRO AO CRIAR AVALIAÇÃO: {str(e)}")
            traceback.print_exc()
            return {
                "message": "Erro interno ao salvar avaliação.",
                "tipo_erro": "internal_error",
                "detalhes": str(e)
            }, 500  # ✅ Internal Server Error

# Em resource/avaliacao.py, complete o método CorrigirSentimentos
@api.route('/corrigir-sentimentos')
class CorrigirSentimentos(Resource):
    def post(self):
        """Corrige sentimentos inconsistentes com base nas notas e comentários"""
        try:
            avaliacoes = avaliacaoModel.query.all()
            total = len(avaliacoes)
            corrigidas = 0
            
            for a in avaliacoes:
                if a.Comentario and a.Nota is not None:
                    # Analisar comentário
                    analise = analisar_sentimento(a.Comentario)
                    if analise and 'sentimento' in analise:
                        sentimento_nlp = analise['sentimento']
                        sentimento_final = verificar_consistencia_sentimento(sentimento_nlp, a.Nota)
                        
                        # Se o sentimento mudou, atualizar
                        if a.sentimento_auto != sentimento_final:
                            print(f"Corrigindo avaliação {a.ID}: {a.sentimento_auto} → {sentimento_final}")
                            a.sentimento_auto = sentimento_final
                            corrigidas += 1
            
            if corrigidas > 0:
                banco.session.commit()
                
            return {
                "message": f"{corrigidas} avaliações corrigidas",
                "total": total,
                "corrigidas": corrigidas,
                "porcentagem": round((corrigidas / total) * 100, 1) if total > 0 else 0
            }, 200
            
        except Exception as e:
            banco.session.rollback()
            return {"error": f"Erro ao corrigir sentimentos: {str(e)}"}, 500
@api.route('/<int:id>')
class Avaliacao(Resource):
    @jwt_required()
    @any_authenticated
    @api.marshal_with(avaliacao_schema)
    def get(self, id):
        """Retorna uma avaliação por ID"""
        try:
            aval = avaliacaoModel.query.get(id)
            if not aval:
                return {
                    "message": "Avaliação não encontrada.",
                    "tipo_erro": "not_found",
                    "id": id
                }, 404  # ✅ Not Found
            return aval, 200  # ✅ OK
            
        except Exception as e:
            print(f"❌ Erro ao buscar avaliação: {str(e)}")
            traceback.print_exc()
            return {
                "message": "Erro interno ao buscar avaliação.",
                "tipo_erro": "internal_error"
            }, 500  # ✅ Internal Server Error

    @jwt_required()
    @cliente_required
    @api.expect(parser)
    @api.marshal_with(avaliacao_schema)
    def put(self, id):
        """Edita uma avaliação existente"""
        try:
            aval = avaliacaoModel.query.get(id)
            if not aval:
                return {
                    "message": "Avaliação não encontrada.",
                    "tipo_erro": "not_found",
                    "id": id
                }, 404  # ✅ Not Found
                
            # Obter e converter o ID do usuário
            usuario_id = get_jwt_identity()
            try:
                usuario_id_int = int(usuario_id)
            except (ValueError, TypeError):
                return {
                    "message": "Token inválido.",
                    "tipo_erro": "invalid_token"
                }, 401  # ✅ Unauthorized
            
            if usuario_id_int != aval.ID_Cliente:
                return {
                    "message": "Você não pode editar esta avaliação.",
                    "tipo_erro": "forbidden"
                }, 403  # ✅ Forbidden

            dados = parser.parse_args()
            # Não permite trocar o cliente
            dados.pop('ID_Cliente', None)
            
            # Validar nota
            if 'Nota' in dados and not (1 <= dados['Nota'] <= 5):
                return {
                    "message": "Nota deve estar entre 1 e 5.",
                    "tipo_erro": "invalid_rating"
                }, 422  # ✅ Unprocessable Entity
            
            # Validar comentário
            if 'Comentario' in dados and len(dados['Comentario'].strip()) < 10:
                return {
                    "message": "Comentário deve ter pelo menos 10 caracteres.",
                    "tipo_erro": "invalid_comment"
                }, 422  # ✅ Unprocessable Entity
            
            comentario_antigo = aval.Comentario
            if dados['Comentario'] != comentario_antigo:
                filtro = ContentFilter()
                comentario_filtrado, contem_ofensa = filtro.verificar_e_censurar(dados['Comentario'])
                dados['Comentario'] = comentario_filtrado
            
            # Atualizar a avaliação
            aval.updateAvaliacao(id, **dados)
            
            # Se o comentário mudou, atualizar análise de sentimento
            if comentario_antigo != aval.Comentario:
                try:
                    analise = analisar_sentimento(aval.Comentario)
                    if analise and 'sentimento' in analise:
                        sentimento_nlp = analise['sentimento']
                        sentimento_final = verificar_consistencia_sentimento(sentimento_nlp, aval.Nota)
                        
                        aval.sentimento_auto = sentimento_final
                        banco.session.commit()
                except Exception as e:
                    print(f"⚠️ Falha ao atualizar análise de sentimento: {e}")
            
            aval_atualizada = avaliacaoModel.query.get(id)
            return aval_atualizada, 200  # ✅ OK
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro ao editar avaliação: {str(e)}")
            traceback.print_exc()
            return {
                "message": "Erro interno ao editar avaliação.",
                "tipo_erro": "internal_error",
                "detalhes": str(e)
            }, 500  # ✅ Internal Server Error

    @jwt_required()
    @cliente_required
    def delete(self, id):
        """Remove uma avaliação"""
        try:
            aval = avaliacaoModel.query.get(id)
            if not aval:
                return {
                    "message": "Avaliação não encontrada.",
                    "tipo_erro": "not_found",
                    "id": id
                }, 404  # ✅ Not Found
                
            # Obter e converter o ID do token
            usuario_id = get_jwt_identity()
            try:
                usuario_id_int = int(usuario_id)
            except (ValueError, TypeError):
                return {
                    "message": "Token inválido.",
                    "tipo_erro": "invalid_token"
                }, 401  # ✅ Unauthorized
            
            if usuario_id_int != aval.ID_Cliente:
                return {
                    "message": "Você não pode remover esta avaliação.",
                    "tipo_erro": "forbidden"
                }, 403  # ✅ Forbidden
                
            # Remover avaliação
            try:
                # Remover imagens do storage
                if aval.imagens_urls:
                    for img_url in aval.imagens_urls:
                        try:
                            delete_image(img_url)
                        except Exception as e:
                            print(f"⚠️ Erro ao deletar imagem: {e}")
                
                banco.session.delete(aval)
                banco.session.commit()
                
                return {
                    "message": "Avaliação removida com sucesso.",
                    "id": id
                }, 200  # ✅ OK
                
            except Exception as e:
                banco.session.rollback()
                print(f"❌ Erro ao remover do banco: {e}")
                return {
                    "message": "Erro ao remover avaliação do banco de dados.",
                    "tipo_erro": "database_error",
                    "detalhes": str(e)
                }, 500  # ✅ Internal Server Error
                
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro ao remover avaliação: {str(e)}")
            traceback.print_exc()
            return {
                "message": "Erro interno ao remover avaliação.",
                "tipo_erro": "internal_error",
                "detalhes": str(e)
            }, 500  # ✅ Internal Server Error

@api.route('/restaurante/<int:id>/analise-periodo')
class AnalisePeriodoAvaliacao(Resource):
    def get(self, id):
        """
        Analisa as avaliações de um restaurante em um período específico.
        Query params: data_inicio, data_fim (ISO strings)
        """
        data_inicio = request.args.get('data_inicio')
        data_fim = request.args.get('data_fim')
        
        if not data_inicio or not data_fim:
            return {"message": "Parâmetros data_inicio e data_fim são obrigatórios"}, 400

        # Parse flexível das datas
        formatos = ['%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d']
        
        def parse_iso(s):
            s = s.rstrip('Z')
            for fmt in formatos:
                try:
                    return datetime.strptime(s, fmt)
                except ValueError:
                    pass
            return None

        data_inicio_dt = parse_iso(data_inicio)
        data_fim_dt = parse_iso(data_fim)
        
        if not data_inicio_dt or not data_fim_dt:
            return {"message": "Formato de data inválido"}, 400
        
        try:
            print(f"Analisando período: {data_inicio_dt.strftime('%Y-%m-%d')} a {data_fim_dt.strftime('%Y-%m-%d')} para restaurante {id}")
            
            # Query usando datetimes
            avaliacoes = (
                avaliacaoModel.query
                .filter(
                    avaliacaoModel.ID_Restaurante == id,
                    avaliacaoModel.visivel == True,
                    avaliacaoModel.data_avaliacao >= data_inicio_dt,
                    avaliacaoModel.data_avaliacao <= data_fim_dt
                )
                .all()
            )
            
            print(f"Encontradas {len(avaliacoes)} avaliações no período")

            total_avaliacoes = len(avaliacoes)
            
            # Se não houver avaliações
            if total_avaliacoes == 0:
                return {
                    "periodo": {
                        "inicio": data_inicio_dt.isoformat(), 
                        "fim": data_fim_dt.isoformat()
                    },
                    "total_avaliacoes": 0,
                    "media_notas": 0,
                    "distribuicao_notas": {str(k): 0 for k in range(1, 6)},
                    "sentimentos": {"positivo": 0, "neutro": 0, "negativo": 0},
                    "avaliacoes_por_data": [],
                    "avaliacoes_recentes": []
                }, 200

            # Calcular média
            soma_notas = sum((a.Nota or 0) for a in avaliacoes)
            media_notas = round(soma_notas / total_avaliacoes, 2) if total_avaliacoes > 0 else 0

            # Distribuição de notas
            distribuicao = {str(i): 0 for i in range(1, 6)}
            for a in avaliacoes:
                nota = a.Nota or 0
                if nota and str(nota) in distribuicao:
                    distribuicao[str(nota)] += 1

            # Distribuição de sentimentos
            sentimentos = {"positivo": 0, "neutro": 0, "negativo": 0}
            for a in avaliacoes:
                sentimento = getattr(a, 'sentimento_auto', None) or "neutro"
                if sentimento in sentimentos:
                    sentimentos[sentimento] += 1

            # Agrupar por data para visualizar tendência
            from collections import defaultdict
            aval_por_data = defaultdict(lambda: {"total": 0, "soma_notas": 0})

            for a in avaliacoes:
                # Normalizar data
                if isinstance(a.data_avaliacao, str):
                    data_key = a.data_avaliacao.split('T')[0]
                else:
                    data_key = a.data_avaliacao.strftime('%Y-%m-%d')
                
                nota = a.Nota or 0
                aval_por_data[data_key]["total"] += 1
                aval_por_data[data_key]["soma_notas"] += nota

            # AGORA criar avaliacoes_detalhadas DEPOIS que aval_por_data foi populado
            avaliacoes_detalhadas = []
            for data_key in sorted(aval_por_data.keys()):
                entry = aval_por_data[data_key]
                media = round(entry["soma_notas"] / entry["total"], 2) if entry["total"] else 0
                
                # Calcular distribuição de notas para esta data
                distribuicao_data = {str(i): 0 for i in range(1, 6)}
                for a in avaliacoes:
                    if isinstance(a.data_avaliacao, str):
                        a_data_key = a.data_avaliacao.split('T')[0]
                    else:
                        a_data_key = a.data_avaliacao.strftime('%Y-%m-%d')
                    
                    if a_data_key == data_key and a.Nota:
                        distribuicao_data[str(a.Nota)] += 1
                
                avaliacoes_detalhadas.append({
                    "data": data_key,
                    "total": entry["total"],
                    "media": media,
                    "distribuicao": distribuicao_data
                })

            # Avaliações recentes (serializar datas)
            recentes = sorted(
                avaliacoes, 
                key=lambda x: x.data_avaliacao if isinstance(x.data_avaliacao, datetime) else datetime.fromisoformat(x.data_avaliacao), 
                reverse=True
            )[:5]
            
            avaliacoes_recentes = []
            for a in recentes:
                cliente = UsuarioModel.find_by_id(a.ID_Cliente)
                avaliacoes_recentes.append({
                    "ID": a.ID,
                    "Nota": a.Nota,
                    "Comentario": a.Comentario,
                    "data_avaliacao": _isoformat_if_datetime(a.data_avaliacao),
                    "sentimento_auto": a.sentimento_auto,
                    "Nome_Cliente": cliente.Nome if cliente else "Usuário Anônimo"
                })

            # Retornar resultado completo com avaliacoes_detalhadas
            return {
                "periodo": {
                    "inicio": data_inicio_dt.isoformat(), 
                    "fim": data_fim_dt.isoformat()
                },
                "total_avaliacoes": total_avaliacoes,
                "media_notas": media_notas,
                "distribuicao_notas": distribuicao,
                "sentimentos": sentimentos,
                "avaliacoes_por_data": avaliacoes_detalhadas,  # Usar dados detalhados
                "avaliacoes_recentes": avaliacoes_recentes
            }, 200

        except Exception as e:
            print(f"Erro na análise de período: {str(e)}")
            traceback.print_exc()
            return {"message": f"Erro ao analisar período: {str(e)}"}, 500
# Adicione estes novos endpoints à classe de recursos

@api.route('/restaurante/<int:id>/evolucao-avaliacoes')
class EvolucaoAvaliacoes(Resource):
    @api.doc(params={
        'data_inicio': 'Data inicial (ISO format)',
        'data_fim': 'Data final (ISO format)',
        'tipo_comparacao': 'comentarios|pratos|ambos',
        'intervalo': 'dia|semana|mes'
    })
    def get(self, id):
        """
        Retorna a evolução comparativa entre avaliações de restaurante e pratos
        """
        try:
            data_inicio = request.args.get('data_inicio')
            data_fim = request.args.get('data_fim')
            tipo_comparacao = request.args.get('tipo_comparacao', 'ambos')
            intervalo = request.args.get('intervalo', 'dia')
            
            if not data_inicio or not data_fim:
                return {"message": "data_inicio e data_fim são obrigatórios"}, 400
            
            # Parse das datas
            formatos = ['%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d']
            def parse_iso(s):
                s = s.rstrip('Z')
                for fmt in formatos:
                    try:
                        return datetime.strptime(s, fmt)
                    except ValueError:
                        pass
                return None
            
            dt_inicio = parse_iso(data_inicio)
            dt_fim = parse_iso(data_fim)
            
            if not dt_inicio or not dt_fim:
                return {"message": "Formato de data inválido"}, 400
            
            series = []
            
            # Avaliações de comentários (restaurante)
            if tipo_comparacao in ['comentarios', 'ambos']:
                avaliacoes_rest = (
                    avaliacaoModel.query
                    .filter(
                        avaliacaoModel.ID_Restaurante == id,
                        avaliacaoModel.visivel == True,
                        avaliacaoModel.data_avaliacao >= dt_inicio,
                        avaliacaoModel.data_avaliacao <= dt_fim
                    )
                    .all()
                )
                
                dados_rest = self._processar_serie_temporal(
                    avaliacoes_rest, intervalo, dt_inicio, dt_fim
                )
                
                series.append({
                    "tipo": "comentarios",
                    "nome": "Avaliações Gerais",
                    "dados": dados_rest
                })
            
            # Avaliações de pratos
            if tipo_comparacao in ['pratos', 'ambos']:
                from models.avaliacao_prato import avaliacaoPratoModel
                
                # Buscar pratos do restaurante
                pratos_ids = [p.ID for p in pratoModel.query.filter_by(restaurante_id=id).all()]
                
                if pratos_ids:
                    # Usar query específica para evitar colunas que não existem no banco
                    avaliacoes_pratos = (
                        banco.session.query(
                            avaliacaoPratoModel.ID,
                            avaliacaoPratoModel.Nota,
                            avaliacaoPratoModel.created_at,
                            avaliacaoPratoModel.ID_Prato
                        )
                        .filter(
                            avaliacaoPratoModel.ID_Prato.in_(pratos_ids),
                            avaliacaoPratoModel.created_at >= dt_inicio,
                            avaliacaoPratoModel.created_at <= dt_fim
                        )
                        .all()
                    )
                    
                    # Converter para formato compatível
                    avaliacoes_pratos_formatadas = []
                    for ap in avaliacoes_pratos:
                        avaliacoes_pratos_formatadas.append({
                            'Nota': ap[1],  # avaliacaoPratoModel.Nota
                            'data_avaliacao': ap[2],  # avaliacaoPratoModel.created_at
                            'sentimento_auto': 'neutro'  # Default até implementar
                        })
                    
                    dados_pratos = self._processar_serie_temporal(
                        avaliacoes_pratos_formatadas, intervalo, dt_inicio, dt_fim, tipo='prato'
                    )
                    
                    series.append({
                        "tipo": "pratos",
                        "nome": "Avaliações de Pratos",
                        "dados": dados_pratos
                    })
            
            return {
                "periodo": {
                    "inicio": dt_inicio.isoformat(),
                    "fim": dt_fim.isoformat()
                },
                "intervalo": intervalo,
                "series": series
            }, 200
            
        except Exception as e:
            print(f"Erro em evolucao-avaliacoes: {str(e)}")
            traceback.print_exc()
            return {"message": f"Erro ao processar: {str(e)}"}, 500
    
    def _processar_serie_temporal(self, avaliacoes, intervalo, dt_inicio, dt_fim, tipo='restaurante'):
        """Processa avaliações agrupando por intervalo de tempo"""
        from collections import defaultdict
        
        dados_agrupados = defaultdict(lambda: {"total": 0, "soma": 0, "sentimentos": {"positivo": 0, "neutro": 0, "negativo": 0}})
        
        for aval in avaliacoes:
            # Obter data da avaliação
            if isinstance(aval, dict):
                data = aval['data_avaliacao']
                nota = aval['Nota']
                sentimento = aval.get('sentimento_auto', 'neutro')
            else:
                data = aval.data_avaliacao
                nota = aval.Nota
                sentimento = getattr(aval, 'sentimento_auto', 'neutro')
            
            # Converter string para datetime se necessário
            if isinstance(data, str):
                data = datetime.fromisoformat(data.replace('Z', ''))
            
            # Determinar chave do período
            if intervalo == 'dia':
                chave = data.strftime('%Y-%m-%d')
            elif intervalo == 'semana':
                # Semana do ano
                chave = f"{data.year}-W{data.isocalendar()[1]:02d}"
            else:  # mes
                chave = data.strftime('%Y-%m')
            
            dados_agrupados[chave]["total"] += 1
            dados_agrupados[chave]["soma"] += nota or 0
            
            if sentimento in dados_agrupados[chave]["sentimentos"]:
                dados_agrupados[chave]["sentimentos"][sentimento] += 1
        
        # Criar lista ordenada de períodos
        resultado = []
        for periodo in sorted(dados_agrupados.keys()):
            dados = dados_agrupados[periodo]
            media = round(dados["soma"] / dados["total"], 2) if dados["total"] > 0 else 0
            
            resultado.append({
                "periodo": periodo,
                "media": media,
                "total": dados["total"],
                "sentimentos": dados["sentimentos"]
            })
        
        return resultado

@api.route('/restaurante/<int:id>/analise-mensal-comparativa')
class AnaliseMensalComparativa(Resource):
    @api.doc(params={
        'data_inicio': 'Data inicial (ISO format)',
        'data_fim': 'Data final (ISO format)',
        'restaurantes_comparacao': 'IDs dos restaurantes para comparar (separados por vírgula)'
    })
    def get(self, id):
        """
        Análise mensal comparativa entre restaurantes
        Retorna médias de restaurante, pratos e ponderada
        """
        try:
            data_inicio = request.args.get('data_inicio')
            data_fim = request.args.get('data_fim')
            ids_comparacao = request.args.get('restaurantes_comparacao', '')
            
            if not data_inicio or not data_fim:
                return {"message": "data_inicio e data_fim são obrigatórios"}, 400
            
            # Parse das datas
            formatos = ['%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d']
            def parse_iso(s):
                s = s.rstrip('Z')
                for fmt in formatos:
                    try:
                        return datetime.strptime(s, fmt)
                    except ValueError:
                        pass
                return None
            
            dt_inicio = parse_iso(data_inicio)
            dt_fim = parse_iso(data_fim)
            
            if not dt_inicio or not dt_fim:
                return {"message": "Formato de data inválido"}, 400
            
            # Lista de restaurantes a analisar (principal + comparações)
            restaurantes_ids = [id]
            if ids_comparacao:
                try:
                    restaurantes_ids.extend([int(x) for x in ids_comparacao.split(',') if x.strip()])
                except ValueError:
                    return {"message": "IDs de restaurantes inválidos"}, 400
            
            resultado_restaurantes = []
            
            for rest_id in restaurantes_ids:
                # Buscar informações do restaurante
                restaurante = restauranteModel.find_restaurante(rest_id)
                if not restaurante:
                    continue
                
                # Avaliações do restaurante
                avaliacoes_rest = (
                    avaliacaoModel.query
                    .filter(
                        avaliacaoModel.ID_Restaurante == rest_id,
                        avaliacaoModel.visivel == True,
                        avaliacaoModel.data_avaliacao >= dt_inicio,
                        avaliacaoModel.data_avaliacao <= dt_fim
                    )
                    .all()
                )
                
                # Avaliações de pratos
                from models.avaliacao_prato import avaliacaoPratoModel
                pratos_ids = [p.ID for p in pratoModel.query.filter_by(restaurante_id=rest_id).all()]
                
                avaliacoes_pratos = []
                if pratos_ids:
                    # Usar query específica para evitar colunas que não existem no banco
                    avaliacoes_pratos_raw = (
                        banco.session.query(
                            avaliacaoPratoModel.ID,
                            avaliacaoPratoModel.Nota,
                            avaliacaoPratoModel.created_at,
                            avaliacaoPratoModel.ID_Prato
                        )
                        .filter(
                            avaliacaoPratoModel.ID_Prato.in_(pratos_ids),
                            avaliacaoPratoModel.created_at >= dt_inicio,
                            avaliacaoPratoModel.created_at <= dt_fim
                        )
                        .all()
                    )
                    
                    # Criar objetos mock compatíveis
                    avaliacoes_pratos = []
                    for ap_raw in avaliacoes_pratos_raw:
                        class MockAvaliacaoPrato:
                            def __init__(self, id, nota, created_at, id_prato):
                                self.ID = id
                                self.Nota = nota
                                self.created_at = created_at
                                self.ID_Prato = id_prato
                        
                        avaliacoes_pratos.append(MockAvaliacaoPrato(ap_raw[0], ap_raw[1], ap_raw[2], ap_raw[3]))
                
                # Processar dados mensais
                dados_mensais = self._processar_dados_mensais(avaliacoes_rest, avaliacoes_pratos)
                
                resultado_restaurantes.append({
                    "restaurante_id": rest_id,
                    "restaurante_nome": restaurante.Nome,
                    "eh_principal": rest_id == id,
                    "dados_mensais": dados_mensais
                })
            
            return {
                "periodo": {
                    "inicio": dt_inicio.isoformat(),
                    "fim": dt_fim.isoformat()
                },
                "restaurantes": resultado_restaurantes
            }, 200
            
        except Exception as e:
            print(f"Erro em analise-mensal-comparativa: {str(e)}")
            traceback.print_exc()
            return {"message": f"Erro ao processar: {str(e)}"}, 500
    
    def _processar_dados_mensais(self, avaliacoes_rest, avaliacoes_pratos):
        """Processa dados mensais calculando médias"""
        from collections import defaultdict
        
        dados_por_mes = defaultdict(lambda: {
            "restaurante": {"total": 0, "soma": 0},
            "pratos": {"total": 0, "soma": 0}
        })
        
        # Processar avaliações de restaurante
        for aval in avaliacoes_rest:
            data = aval.data_avaliacao
            if isinstance(data, str):
                data = datetime.fromisoformat(data.replace('Z', ''))
            
            mes_chave = data.strftime('%Y-%m')
            dados_por_mes[mes_chave]["restaurante"]["total"] += 1
            dados_por_mes[mes_chave]["restaurante"]["soma"] += aval.Nota or 0
        
        # Processar avaliações de pratos
        for aval in avaliacoes_pratos:
            data = aval.created_at
            if isinstance(data, str):
                data = datetime.fromisoformat(data.replace('Z', ''))
            
            mes_chave = data.strftime('%Y-%m')
            dados_por_mes[mes_chave]["pratos"]["total"] += 1
            dados_por_mes[mes_chave]["pratos"]["soma"] += aval.Nota or 0
        
        # Calcular médias
        resultado = []
        for mes in sorted(dados_por_mes.keys()):
            dados = dados_por_mes[mes]
            
            media_rest = (dados["restaurante"]["soma"] / dados["restaurante"]["total"]) if dados["restaurante"]["total"] > 0 else 0
            media_pratos = (dados["pratos"]["soma"] / dados["pratos"]["total"]) if dados["pratos"]["total"] > 0 else 0
            
            # Média ponderada (60% restaurante, 40% pratos)
            if dados["restaurante"]["total"] > 0 or dados["pratos"]["total"] > 0:
                total_avaliacoes = dados["restaurante"]["total"] + dados["pratos"]["total"]
                peso_rest = dados["restaurante"]["total"] / total_avaliacoes
                peso_pratos = dados["pratos"]["total"] / total_avaliacoes
                media_ponderada = (media_rest * peso_rest) + (media_pratos * peso_pratos)
            else:
                media_ponderada = 0
            
            resultado.append({
                "mes": mes,
                "media_restaurante": round(media_rest, 2),
                "media_pratos": round(media_pratos, 2),
                "media_ponderada": round(media_ponderada, 2),
                "total_avaliacoes_restaurante": dados["restaurante"]["total"],
                "total_avaliacoes_pratos": dados["pratos"]["total"]
            })
        
        return resultado


@api.route('/restaurante/<int:id>/comparacao-pratos')
class ComparacaoPratos(Resource):
    @api.doc(params={
        'data_inicio': 'Data inicial (ISO format)',
        'data_fim': 'Data final (ISO format)',
        'pratos_ids': 'IDs dos pratos para comparar (separados por vírgula)',
        'metrica': 'media|total|evolucao'
    })
    def get(self, id):
        """
        Compara a evolução das avaliações de pratos específicos
        """
        try:
            data_inicio = request.args.get('data_inicio')
            data_fim = request.args.get('data_fim')
            pratos_ids_str = request.args.get('pratos_ids', '')
            metrica = request.args.get('metrica', 'media')
            
            if not data_inicio or not data_fim or not pratos_ids_str:
                return {"message": "data_inicio, data_fim e pratos_ids são obrigatórios"}, 400
            
            # Parse das datas
            formatos = ['%Y-%m-%dT%H:%M:%S.%f', '%Y-%m-%dT%H:%M:%S', '%Y-%m-%d']
            def parse_iso(s):
                s = s.rstrip('Z')
                for fmt in formatos:
                    try:
                        return datetime.strptime(s, fmt)
                    except ValueError:
                        pass
                return None
            
            dt_inicio = parse_iso(data_inicio)
            dt_fim = parse_iso(data_fim)
            
            if not dt_inicio or not dt_fim:
                return {"message": "Formato de data inválido"}, 400
            
            # Parse dos IDs de pratos
            try:
                pratos_ids = [int(x) for x in pratos_ids_str.split(',') if x.strip()]
            except ValueError:
                return {"message": "IDs de pratos inválidos"}, 400
            
            if not pratos_ids:
                return {"message": "Nenhum prato selecionado"}, 400
            
            from models.avaliacao_prato import avaliacaoPratoModel
            
            resultado_pratos = []
            
            for prato_id in pratos_ids:
                # Buscar informações do prato
                prato = pratoModel.find_by_id(prato_id)
                if not prato or prato['restaurante_id'] != id:
                    continue
                
                # Buscar avaliações do prato
                avaliacoes_raw = (
                    banco.session.query(
                        avaliacaoPratoModel.ID,
                        avaliacaoPratoModel.Nota,
                        avaliacaoPratoModel.created_at,
                        avaliacaoPratoModel.ID_Prato
                    )
                    .filter(
                        avaliacaoPratoModel.ID_Prato == prato_id,
                        avaliacaoPratoModel.created_at >= dt_inicio,
                        avaliacaoPratoModel.created_at <= dt_fim
                    )
                    .all()
                )
                
                if not avaliacoes_raw:
                    continue
                
                # Criar objetos mock compatíveis
                avaliacoes = []
                for ap_raw in avaliacoes_raw:
                    class MockAvaliacaoPrato:
                        def __init__(self, id, nota, created_at, id_prato):
                            self.ID = id
                            self.Nota = nota
                            self.created_at = created_at
                            self.ID_Prato = id_prato
                    
                    avaliacoes.append(MockAvaliacaoPrato(ap_raw[0], ap_raw[1], ap_raw[2], ap_raw[3]))
                
                # Processar série temporal
                serie_temporal = self._processar_serie_temporal_prato(avaliacoes, metrica)
                
                # Calcular métricas gerais
                notas = [a.Nota for a in avaliacoes]
                media_geral = round(sum(notas) / len(notas), 2) if notas else 0
                
                resultado_pratos.append({
                    "prato_id": prato_id,
                    "prato_nome": prato['Nome'],
                    "prato_descricao": prato.get('Descricao', ''),
                    "total_avaliacoes": len(avaliacoes),
                    "metricas": {
                        "media_geral": media_geral,
                        "nota_minima": min(notas) if notas else 0,
                        "nota_maxima": max(notas) if notas else 0
                    },
                    "serie_temporal": serie_temporal
                })
            
            return {
                "periodo": {
                    "inicio": dt_inicio.isoformat(),
                    "fim": dt_fim.isoformat()
                },
                "metrica": metrica,
                "pratos": resultado_pratos
            }, 200
            
        except Exception as e:
            print(f"Erro em comparacao-pratos: {str(e)}")
            traceback.print_exc()
            return {"message": f"Erro ao processar: {str(e)}"}, 500
    
    def _processar_serie_temporal_prato(self, avaliacoes, metrica):
        """Processa série temporal das avaliações de um prato"""
        from collections import defaultdict
        
        dados_por_data = defaultdict(lambda: {"total": 0, "soma": 0, "notas": []})
        
        for aval in avaliacoes:
            data = aval.created_at
            if isinstance(data, str):
                data = datetime.fromisoformat(data.replace('Z', ''))
            
            data_chave = data.strftime('%Y-%m-%d')
            dados_por_data[data_chave]["total"] += 1
            dados_por_data[data_chave]["soma"] += aval.Nota
            dados_por_data[data_chave]["notas"].append(aval.Nota)
        
        # Criar série temporal
        resultado = []
        for data in sorted(dados_por_data.keys()):
            dados = dados_por_data[data]
            
            if metrica == 'media':
                valor = round(dados["soma"] / dados["total"], 2) if dados["total"] > 0 else 0
            elif metrica == 'total':
                valor = dados["total"]
            else:  # evolucao
                valor = round(dados["soma"] / dados["total"], 2) if dados["total"] > 0 else 0
            
            resultado.append({
                "data": data,
                "media": round(dados["soma"] / dados["total"], 2) if dados["total"] > 0 else 0,
                "total": dados["total"],
                "min": min(dados["notas"]) if dados["notas"] else 0,
                "max": max(dados["notas"]) if dados["notas"] else 0
            })
        
        return resultado


@api.route('/<int:id>/completa')
class AvaliacaoCompletaUpdate(Resource):
    @jwt_required()
    def put(self, id):
        """Atualiza avaliação completa com imagens e tags via FormData"""
        try:
            print(f"\n{'='*60}")
            print(f"📝 ATUALIZANDO AVALIAÇÃO #{id} (COMPLETA)")
            print(f"{'='*60}")
            
            # Buscar avaliação existente
            avaliacao = avaliacaoModel.query.get(id)
            if not avaliacao:
                return {"message": "Avaliação não encontrada"}, 404
            
            # Verificar permissão
            usuario_id = get_jwt_identity()
            try:
                usuario_id_int = int(usuario_id)
                if usuario_id_int != avaliacao.ID_Cliente:
                    return {"message": "Você não pode editar esta avaliação"}, 403
            except ValueError:
                return {"message": "Formato de ID inválido"}, 403
            
            # Obter dados do formulário
            nota = request.form.get('Nota', type=int)
            comentario = request.form.get('Comentario', '')
            
            print(f"📊 Dados recebidos:")
            print(f"   Nota: {nota}")
            print(f"   Comentário: {comentario[:50]}..." if comentario else "   Comentário: (vazio)")
            
            # ✅ Processar tags do FormData
            tags_notas = {}
            for key in request.form.keys():
                if key.startswith('tag_'):
                    try:
                        tag_id = int(key.replace('tag_', ''))
                        nota_tag = int(request.form.get(key, 0))
                        if nota_tag > 0:
                            tags_notas[tag_id] = nota_tag
                            print(f"   Tag {tag_id}: {nota_tag} estrelas")
                    except ValueError:
                        continue
            
            print(f"🏷️ Total de tags a atualizar: {len(tags_notas)}")
            
            # Validações
            if nota is not None and not (1 <= nota <= 5):
                return {"message": "Nota deve estar entre 1 e 5"}, 400
            
            if comentario and len(comentario.strip()) < 10:
                return {"message": "Comentário deve ter pelo menos 10 caracteres"}, 400
            
            # Filtro de conteúdo
            comentario_original = comentario
            if comentario:
                filtro = ContentFilter()
                comentario_filtrado, contem_ofensa = filtro.verificar_e_censurar(comentario)
                
                if contem_ofensa:
                    print(f"⚠️ Conteúdo ofensivo detectado e censurado")
                    comentario = comentario_filtrado
            
            # Atualizar campos básicos
            if nota is not None:
                avaliacao.Nota = nota
            if comentario:
                avaliacao.Comentario = comentario
            
            # ✅ Processar imagens (se houver)
            imagens_urls = avaliacao.imagens_urls or []
            if 'imagens' in request.files:
                imagens = request.files.getlist('imagens')
                print(f"📷 Processando {len(imagens)} nova(s) imagem(ns)...")
                
                # Limitar total de imagens
                if len(imagens_urls) + len(imagens) > 5:
                    return {"message": "Máximo de 5 imagens por avaliação"}, 400
                
                for idx, imagem in enumerate(imagens):
                    if imagem and imagem.filename:
                        try:
                            # Upload para Firebase/Storage
                            imagem_url = upload_image(
                                imagem,
                                f"avaliacoes/{avaliacao.ID_Restaurante}/{avaliacao.ID}_{idx}_{imagem.filename}"
                            )
                            imagens_urls.append(imagem_url)
                            print(f"   ✅ Imagem {idx+1} enviada: {imagem_url}")
                        except Exception as e:
                            print(f"   ❌ Erro ao enviar imagem {idx+1}: {e}")
                
                avaliacao.imagens_urls = imagens_urls
                avaliacao.tem_imagens = bool(imagens_urls)
            
            # ✅ Atualizar tags
            if tags_notas:
                from models.tag_restaurante import AvaliacaoTagsModel, TagRestauranteModel
                
                print(f"🏷️ Atualizando tags...")
                
                # Remover tags antigas desta avaliação
                AvaliacaoTagsModel.query.filter_by(ID_Avaliacao=avaliacao.ID).delete()
                print(f"   🗑️ Tags antigas removidas")
                
                # Adicionar novas tags - REMOVER ID_Restaurante
                for tag_id, nota_tag in tags_notas.items():
                    # Verificar se a tag existe
                    tag = TagRestauranteModel.query.get(tag_id)
                    if not tag:
                        print(f"   ⚠️ Tag {tag_id} não encontrada, ignorando")
                        continue
                    
                    # ✅ CORREÇÃO: Remover ID_Restaurante do construtor
                    nova_tag = AvaliacaoTagsModel(
                        ID_Avaliacao=avaliacao.ID,
                        ID_Tag=tag_id,
                        nota=nota_tag
                    )
                    banco.session.add(nova_tag)
                    print(f"   ✅ Tag {tag.nome}: {nota_tag} estrelas")
                
                print(f"   Total: {len(tags_notas)} tags atualizadas")
            
            # Commit das alterações
            banco.session.commit()
            print(f"✅ Avaliação atualizada com sucesso")
            
            # Reanalisar sentimento se comentário mudou
            if comentario and comentario != comentario_original:
                try:
                    analise = analisar_sentimento(comentario)
                    if analise and 'sentimento' in analise:
                        sentimento_nlp = analise['sentimento']
                        sentimento = verificar_consistencia_sentimento(sentimento_nlp, avaliacao.Nota)
                        avaliacao.sentimento_auto = sentimento
                        banco.session.commit()
                        print(f"   🤖 Sentimento reanalisado: {sentimento}")
                except Exception as e:
                    print(f"   ⚠️ Erro na análise de sentimento: {e}")
            
            # Buscar tags criadas para retornar
            from models.tag_restaurante import AvaliacaoTagsModel
            tags_criadas = AvaliacaoTagsModel.find_by_avaliacao(avaliacao.ID)
            
            print(f"\n📤 RETORNANDO PARA FRONTEND:")
            resultado = {
                'ID': avaliacao.ID,
                'ID_Cliente': avaliacao.ID_Cliente,
                'ID_Restaurante': avaliacao.ID_Restaurante,
                'Nota': avaliacao.Nota,
                'Comentario': avaliacao.Comentario,
                'data_avaliacao': avaliacao.data_avaliacao.isoformat() if isinstance(avaliacao.data_avaliacao, datetime) else avaliacao.data_avaliacao,
                'sentimento_auto': avaliacao.sentimento_auto,
                'imagens_urls': avaliacao.imagens_urls,
                'tem_imagens': avaliacao.tem_imagens,
                'tags': tags_criadas,
                'total_imagens': len(imagens_urls),
                'tags_avaliadas': len(tags_criadas)
            }
            print(f"   ✅ Resultado completo")
            print(f"{'='*60}\n")
            
            return resultado, 200
            
        except Exception as e:
            banco.session.rollback()
            print(f"\n❌ ERRO AO ATUALIZAR AVALIAÇÃO:")
            print(f"   {str(e)}")
            traceback.print_exc()
            print(f"{'='*60}\n")
            return {"message": f"Erro ao atualizar avaliação: {str(e)}"}, 500
