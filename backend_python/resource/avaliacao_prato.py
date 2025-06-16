from flask import request
from flask_restx import Resource, Namespace, fields, reqparse, abort
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.avaliacao_prato import avaliacaoPratoModel
from models.prato import pratoModel
from models.usuario import UsuarioModel

api = Namespace('avaliacoes-prato', description='Operações com avaliações de pratos')

# Swagger model
avaliacao_prato_fields = api.model('AvaliacaoPrato', {
    'ID':        fields.Integer(readOnly=True),
    'Comentario':fields.String(required=True, description='Comentário do cliente'),
    'Nota':      fields.Integer(required=True, description='Nota de 1 a 5'),
    'ID_Cliente':fields.Integer(required=True, description='ID do cliente'),
    'ID_Prato':  fields.Integer(required=True, description='ID do prato'),
})

# Parser para POST e PUT
parser = reqparse.RequestParser()
parser.add_argument('Comentario', type=str, required=True, help='Comentário é obrigatório')
parser.add_argument('Nota',       type=int, required=True, help='Nota é obrigatória')
parser.add_argument('ID_Cliente', type=int, required=True, help='ID do cliente é obrigatório')
parser.add_argument('ID_Prato',   type=int, required=True, help='ID do prato é obrigatório')

@api.route('/')
class AvaliacaoPratoList(Resource):
    @jwt_required(optional=True)
    @api.marshal_list_with(avaliacao_prato_fields)
    def get(self):
        """Lista todas as avaliações de pratos"""
        return avaliacaoPratoModel.find_all()

    @jwt_required()
    @api.expect(parser, validate=True)
    @api.marshal_with(avaliacao_prato_fields, code=201)
    def post(self):
        """Cria uma nova avaliação de prato"""
        dados = parser.parse_args()
        # valida existência de usuário e prato
        if not UsuarioModel.find_by_id(dados['ID_Cliente']):
            abort(404, "Cliente não encontrado.")
        if not pratoModel.find_by_id(dados['ID_Prato']):
            abort(404, "Prato não encontrado.")

        nova = avaliacaoPratoModel(**dados)
        try:
            nova.save()
        except Exception as e:
            abort(500, f"Erro ao salvar avaliação: {e}")
        return nova.json(), 201

@api.route('/cliente/<int:cliente_id>')
class AvaliacoesPorCliente(Resource):
    @jwt_required()
    @api.marshal_list_with(avaliacao_prato_fields)
    def get(self, cliente_id):
        """Lista avaliações feitas por um cliente (permitido para o próprio cliente)"""
        if get_jwt_identity() != cliente_id:
            abort(403, "Você só pode ver suas próprias avaliações.")
        return avaliacaoPratoModel.find_by_cliente(cliente_id)

@api.route('/prato/<int:prato_id>')
class AvaliacoesPorPrato(Resource):
    @api.marshal_list_with(avaliacao_prato_fields)
    def get(self, prato_id):
        """Lista todas as avaliações de um prato específico"""
        return avaliacaoPratoModel.find_by_prato(prato_id)

@api.route('/search/<string:nome>')
class AvaliacaoPratoSearch(Resource):
    @api.marshal_list_with(avaliacao_prato_fields)
    def get(self, nome):
        """Filtra avaliações pelo nome do prato (contains)"""
        return avaliacaoPratoModel.find_by_prato_name(nome)

@api.route('/<int:ID>')
class AvaliacaoPrato(Resource):
    @jwt_required(optional=True)
    @api.marshal_with(avaliacao_prato_fields)
    def get(self, ID):
        """Retorna uma avaliação de prato por ID"""
        resultado = avaliacaoPratoModel.find_by_id(ID)
        if not resultado:
            abort(404, "Avaliação não encontrada.")
        return resultado

    @jwt_required()
    @api.expect(parser, validate=True)
    @api.marshal_with(avaliacao_prato_fields)
    def put(self, ID):
        """Atualiza uma avaliação de prato existente"""
        aval = avaliacaoPratoModel.find_by_id(ID)
        if not aval:
            abort(404, "Avaliação não encontrada.")
        if aval['ID_Cliente'] != get_jwt_identity():
            abort(403, "Você não pode editar esta avaliação.")

        dados = parser.parse_args()
        dados.pop('ID_Cliente', None)  # cliente não pode ser trocado
        atualizado = avaliacaoPratoModel.update(ID, **dados)
        if not atualizado:
            abort(404, "Falha ao atualizar avaliação.")
        return atualizado.json()

    @jwt_required()
    def delete(self, ID):
        """Remove uma avaliação de prato"""
        aval = avaliacaoPratoModel.find_by_id(ID)
        if not aval:
            abort(404, "Avaliação não encontrada.")
        if aval['ID_Cliente'] != get_jwt_identity():
            abort(403, "Você não pode remover esta avaliação.")
        sucesso = avaliacaoPratoModel.delete(ID)
        if not sucesso:
            abort(500, "Falha ao remover avaliação.")
        return {"message": "Avaliação removida."}, 200
