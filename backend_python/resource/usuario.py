from flask import Flask, flash, session
from flask_restx import Resource, reqparse
from models.usuario import UsuarioModel
from flask_jwt_extended import create_access_token, jwt_required, get_jwt, get_jwt_identity
import hmac
from werkzeug.security import generate_password_hash
'''from blacklist import BLACKLIST
'''
def safe_str_cmp(email: str, senha: str) -> bool:
      return hmac.compare_digest(email, senha)
    
atributos = reqparse.RequestParser()
atributos.add_argument('Nome', type=str, required=True, help="O campo 'Nome' nao pode ser deixado em branco!")
atributos.add_argument('CPF', type=str, required=True, help="Não deixar o campo 'CPF' em branco.")
atributos.add_argument('email', type=str, required=True, help="Adicione um 'email'.")
atributos.add_argument('senha', type=str, required=True, help="O campo 'senha' deve ser preenchido.")
atributos.add_argument('telefone', type=str, required=True, help="Coloque seu 'telefone'.")
atributos.add_argument('Cidade', type=str, required=True, help="Adicione sua 'Cidade'.")


login = reqparse.RequestParser()
login.add_argument('email', type=str, required=True, help="Adicione um 'email'.")
login.add_argument('senha', type=str, required=True, help="O campo 'senha' deve ser preenchido.")


class Usuario(Resource):
  def get(self, ID):
    usuario = UsuarioModel.find_by_id(ID)
    if usuario:
      return usuario.json()
    return{'message': 'Usuario not found.'}, 404 # not found    

class removerUsuario(Resource):
    @jwt_required()
    def delete(self, ID):
        usuario_logado = get_jwt_identity()

        if int(usuario_logado) != ID:
            return {'message': 'Você não pode excluir outro usuário'}, 403

        usuario = UsuarioModel.find_by_id(ID)
        if not usuario:
            return {'message': 'Usuário não encontrado'}, 404

        try:
            UsuarioModel.delete(ID)
            return {'message': 'Usuário removido com sucesso'}, 200
        except Exception:
            return {'message': 'Erro ao remover o usuário'}, 500

class editarUsuario(Resource):
    @jwt_required()
    def put(self, ID):
        usuario_logado = get_jwt_identity()

        if int(usuario_logado) != ID:
            return {'message': 'Você não pode editar outro usuário'}, 403

        usuario = UsuarioModel.find_by_id(ID)
        if not usuario:
            return {'message': 'Usuário não encontrado'}, 404

        dados = atributos.parse_args()
        try:
            usuario.update(
                Nome=dados['Nome'],
                CPF=dados['CPF'],
                email=dados['email'],
                senha=dados['senha'],  # setter do model já aplica o hash
                telefone=dados['telefone'],
                Cidade=dados['Cidade']
            )
            return usuario.json(), 200
        except Exception:
            return {'message': 'Erro ao atualizar o usuário'}, 500

class buscarUsuario(Resource):
  def get(self, email):
    buscar = UsuarioModel.find_email_usuario(email)
    return buscar
  
class allClientes(Resource):
  def get(self):
    listar = UsuarioModel.findAll()
    return listar

class encontrarEmail(Resource):
  def get(self, email):
    buscarEmail = UsuarioModel.find_by_email(email)
    return buscarEmail
