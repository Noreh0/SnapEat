from flask import request
from sql_alchemy import banco  # certifique-se de importar!
from flask_restx import Resource, reqparse, abort, Namespace, fields
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.avaliacao import avaliacaoModel
from models.restaurante import restauranteModel
from models.usuario import UsuarioModel


api = Namespace('avaliacoes', description='Operações de Avaliações')

# Modelo para documentação Swagger
avaliacao_schema = api.model('Avaliacao', {
    'ID':             fields.Integer(readOnly=True),
    'ID_Cliente':     fields.Integer(required=True, description='ID do cliente'),
    'ID_Restaurante': fields.Integer(required=True, description='ID do restaurante'),
    'Nota':           fields.Integer(required=True, min=1, max=5, description='Nota de 1 a 5'),
    'Comentario':     fields.String(required=True, description='Comentario do cliente'),
})

# Parser para POST e PUT
parser = reqparse.RequestParser()
parser.add_argument('ID_Cliente',     type=int,   required=True, help="ID do cliente é obrigatório")
parser.add_argument('ID_Restaurante', type=int,   required=True, help="ID do restaurante é obrigatório")
parser.add_argument('Nota',           type=int,   required=True, help="Nota é obrigatória")
parser.add_argument('Comentario',     type=str,   required=True, help="Comentário é obrigatório")


@api.route('')
@api.route('/encontraAvaliacaoCliente/<int:id>')
class AvaliacoesPorCliente(Resource):
    @jwt_required()
    @api.marshal_list_with(avaliacao_schema)
    def get(self, id):
        """Lista todas as avaliações QUE eu (cliente) criei"""
        # optional: só permita ao próprio cliente ou admin
        if get_jwt_identity() != id:
            abort(403, "Você só pode ver suas próprias avaliações.")
        return avaliacaoModel.findAllCliente(id)
@api.route('/restaurante/<int:id>')
class AvaliacoesPorRestaurante(Resource):
    @api.marshal_list_with(avaliacao_schema)
    def get(self, id):
        return avaliacaoModel.findAllAvaliacoes(id)


class AvaliacaoList(Resource):
    @jwt_required()
    @api.marshal_list_with(avaliacao_schema)
    def get(self):
        """Lista todas as avaliações"""
        return avaliacaoModel.query.all()

    @jwt_required()
    @api.expect(parser)
    @api.marshal_with(avaliacao_schema, code=201)
    def post(self):
        dados = parser.parse_args()

        # 1) Verifica se o restaurante existe
        if not restauranteModel.find_restaurante(dados['ID_Restaurante']):
            abort(404, "Restaurante não encontrado.")

        # 2) Verifica se o cliente existe
        if not UsuarioModel.find_by_id(dados['ID_Cliente']):
            abort(404, "Cliente não encontrado.")

        # 3) Cria a instância de avaliação e salva no banco
        nova = avaliacaoModel(
            Comentario     = dados['Comentario'],
            Nota           = dados['Nota'],
            ID_Cliente     = dados['ID_Cliente'],
            ID_Restaurante = dados['ID_Restaurante']
        )
        try:
            nova.save_avaliacoes()
        except Exception as e:
            abort(500, f"Erro ao salvar avaliação: {e}")

        # 4) Retorna JSON da avaliação criada e status HTTP 201
        return nova.json(), 201

@api.route('/avaliando')
class CriarAvaliacao(Resource):
    @jwt_required()
    @api.expect(parser)
    @api.marshal_with(avaliacao_schema, code=201)
    def post(self):
        dados = parser.parse_args()
        # … validar existência de restaurante/cliente …
        nova = avaliacaoModel(
            Comentario     = dados['Comentario'],
            Nota           = dados['Nota'],
            ID_Cliente     = dados['ID_Cliente'],
            ID_Restaurante = dados['ID_Restaurante']
        )
        try:
            nova.save_avaliacoes()
        except Exception as e:
            abort(500, f"Erro ao salvar avaliação: {e}")
        return nova.json(), 201

@api.route('/<int:id>')
class Avaliacao(Resource):
    @jwt_required()
    @api.marshal_with(avaliacao_schema)
    def get(self, id):
        """Retorna uma avaliação por ID"""
        aval = avaliacaoModel.query.get(id)
        if not aval:
            abort(404, "Avaliação não encontrada.")
        return aval

    @jwt_required()
    @api.expect(parser)
    @api.marshal_with(avaliacao_schema)
    def put(self, id):
        """Edita uma avaliação existente"""
        aval = avaliacaoModel.query.get(id)
        if not aval:
            abort(404, "Avaliação não encontrada.")
        if aval.ID_Cliente != get_jwt_identity():
            abort(403, "Você não pode editar esta avaliação.")

        dados = parser.parse_args()
        # não permite trocar o cliente
        dados.pop('ID_Cliente', None)

        aval.updateAvaliacao(id, **dados)
        return aval

    @jwt_required()
    def delete(self, id):
        aval = avaliacaoModel.query.get(id)
        if not aval:
            abort(404, "Avaliação não encontrada.")
        if aval.ID_Cliente != get_jwt_identity():
            abort(403, "Você não pode remover esta avaliação.")
        try:
            from sql_alchemy import banco  # adicione este import se ainda não estiver no topo
            banco.session.delete(aval)
            banco.session.commit()
        except Exception as e:
            abort(500, f"Erro ao remover avaliação: {e}")
        return {'message': 'Avaliação removida com sucesso.'}, 200
