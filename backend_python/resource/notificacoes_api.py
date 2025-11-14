from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime
from sql_alchemy import banco

# Modelo da tabela de notificações
class NotificacaoModel(banco.Model):
    __tablename__ = 'Notificacao'
    
    id = banco.Column(banco.Integer, primary_key=True)
    destinatario_id = banco.Column(banco.Integer, nullable=False)
    tipo_destinatario = banco.Column(banco.String(20), nullable=False)  # 'cliente' ou 'restaurante'
    titulo = banco.Column(banco.String(100), nullable=False)
    mensagem = banco.Column(banco.String(500), nullable=False)
    tipo = banco.Column(banco.String(50), nullable=False)  # 'avaliacao', 'recomendacao', etc
    link_destino = banco.Column(banco.String(255), nullable=True)
    data_hora = banco.Column(banco.DateTime, default=datetime.utcnow)
    lido = banco.Column(banco.Boolean, default=False)
    dados_adicionais = banco.Column(banco.JSON, nullable=True)

# Namespace para API
api = Namespace('notificacoes', description='Operações com notificações')

# Modelo para documentação
notificacao_schema = api.model('Notificacao', {
    'id': fields.Integer(readonly=True),
    'titulo': fields.String(required=True),
    'mensagem': fields.String(required=True),
    'tipo': fields.String(required=True),
    'link_destino': fields.String,
    'data_hora': fields.DateTime(readonly=True),
    'lido': fields.Boolean(readonly=True),
    'dados_adicionais': fields.Raw
})

@api.route('/cliente/<int:cliente_id>')
class NotificacoesCliente(Resource):
    @jwt_required()
    @api.marshal_list_with(notificacao_schema)
    def get(self, cliente_id):
        """Obtém notificações de um cliente"""
        # Verifica se é o próprio cliente acessando
        if get_jwt_identity() != cliente_id:
            return [], 403
            
        notificacoes = NotificacaoModel.query\
            .filter_by(destinatario_id=cliente_id, tipo_destinatario='cliente')\
            .order_by(NotificacaoModel.data_hora.desc())\
            .limit(50)\
            .all()
            
        return notificacoes

@api.route('/restaurante/<int:restaurante_id>')
class NotificacoesRestaurante(Resource):
    @jwt_required()
    @api.marshal_list_with(notificacao_schema)
    def get(self, restaurante_id):
        """Obtém notificações de um restaurante"""
        # Verifica se é o próprio restaurante acessando
        if get_jwt_identity() != restaurante_id:
            return [], 403
            
        notificacoes = NotificacaoModel.query\
            .filter_by(destinatario_id=restaurante_id, tipo_destinatario='restaurante')\
            .order_by(NotificacaoModel.data_hora.desc())\
            .limit(50)\
            .all()
            
        return notificacoes

@api.route('/<int:notificacao_id>/ler')
class MarcarComoLida(Resource):
    @jwt_required()
    def put(self, notificacao_id):
        """Marca uma notificação como lida"""
        notificacao = NotificacaoModel.query.get(notificacao_id)
        
        if not notificacao:
            return {'message': 'Notificação não encontrada'}, 404
            
        # Verifica se pertence ao usuário atual
        id_usuario = get_jwt_identity()
        if notificacao.destinatario_id != id_usuario:
            return {'message': 'Acesso negado'}, 403
            
        notificacao.lido = True
        banco.session.commit()
        
        return {'message': 'Notificação marcada como lida'}, 200

# Função auxiliar para criar notificações
def criar_notificacao(destinatario_id, tipo_destinatario, titulo, mensagem, tipo, link_destino=None, dados_adicionais=None):
    """
    Cria uma nova notificação no sistema
    
    Args:
        destinatario_id: ID do usuário ou restaurante que receberá a notificação
        tipo_destinatario: 'cliente' ou 'restaurante'
        titulo: Título da notificação
        mensagem: Texto da notificação
        tipo: Categoria da notificação ('avaliacao', 'recomendacao', etc)
        link_destino: Link opcional para onde a notificação deve redirecionar
        dados_adicionais: Dados adicionais em formato JSON
    """
    notificacao = NotificacaoModel(
        destinatario_id=destinatario_id,
        tipo_destinatario=tipo_destinatario,
        titulo=titulo,
        mensagem=mensagem,
        tipo=tipo,
        link_destino=link_destino,
        dados_adicionais=dados_adicionais
    )
    
    banco.session.add(notificacao)
    banco.session.commit()
    
    # Aqui você poderia enviar a notificação via WebSockets ou outra tecnologia push
    return notificacao