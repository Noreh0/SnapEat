from flask import Flask, jsonify
from flask_restx import Resource, reqparse
from models.avaliacao import avaliacaoModel
from flask_jwt_extended import jwt_required, get_jwt_identity



class Avaliacoes(Resource):
  def get(self):
    return{'avaliacoes': [avaliacao.json() for avaliacao in avaliacaoModel.query.all()]}
class Avaliacao(Resource):
  argumentos = reqparse.RequestParser()
  argumentos.add_argument('Nota', type=str, required=True, help="O campo 'Nota' nao pode ser deixado em branco!")
  argumentos.add_argument('Comentario', type=str, required=True, help="Por favor adicione um 'Comentario'")
  argumentos.add_argument('ID_Restaurante', type=int, required=True)
  
  def get(self, ID):
    avaliacao = avaliacaoModel.find_avaliacoes(ID)
    if avaliacao:
      return avaliacao.json()
    return{'message': 'Avaliacao not found.'}, 404 # not found

class removerAvaliacao(Resource):
    @jwt_required()
    def delete(self, ID):
        usuario_id = get_jwt_identity()
        avaliacao = avaliacaoModel.find_avaliacoes(ID)

        if not avaliacao:
            return {'message': 'Avaliação não encontrada'}, 404

        if avaliacao.ID_Cliente != usuario_id:
            return {'message': 'Você não pode remover esta avaliação'}, 403

        try:
            avaliacao.avaliacoes_delete()
            return {'message': 'Avaliação removida com sucesso'}
        except:
            return {'message': 'Erro ao remover a avaliação'}, 500
 

class editarAvaliacao(Resource):
    @jwt_required()
    def put(self, ID):
        usuario_id = get_jwt_identity()
        avaliacao = avaliacaoModel.find_avaliacoes(ID)

        if not avaliacao:
            return {'message': 'Avaliação não encontrada'}, 404

        if avaliacao.ID_Cliente != usuario_id:
            return {'message': 'Você não pode editar esta avaliação'}, 403

        dados = Avaliacao.argumentos.parse_args()
        avaliacao.updateAvaliacao(ID, **dados)
        return avaliacao.json()

  
class criarAvaliacao(Resource):
    @jwt_required()
    def post(self):
        dados = Avaliacao.argumentos.parse_args()
        usuario_id = get_jwt_identity()
        
        # Substitui o ID_Cliente fornecido pelo ID do token
        dados['ID_Cliente'] = usuario_id

        avaliacao = avaliacaoModel(**dados)
        avaliacao.save_avaliacoes()
        return avaliacao.json(), 201

  
class encontrarAvaliacao(Resource):
  def get(self, ID_Restaurante):
    listar = avaliacaoModel.findAllAvaliacoes(ID_Restaurante)
    return listar

class allAvaliacoes(Resource):
  def get(self):
    listar = avaliacaoModel.findAll()
    return listar
   
class encontrarAvaliacaoCliente(Resource):
  def get(self, ID_Cliente):
    listar = avaliacaoModel.findAllCliente(ID_Cliente)
    return listar