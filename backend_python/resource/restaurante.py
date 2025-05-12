from flask import Flask, jsonify, request
from flask_restx import Resource, reqparse
from models.restaurante import restauranteModel
from models.avaliacao import avaliacaoModel
from flask_jwt_extended import create_access_token, jwt_required
from werkzeug.security import generate_password_hash, check_password_hash

# Parser para cadastro/edição
atributos = reqparse.RequestParser()
atributos.add_argument('Nome', type=str, required=True, location='json')
atributos.add_argument('CNPJ', type=str, required=True, location='json')
atributos.add_argument('email', type=str, required=True, location='json')
atributos.add_argument('senha', type=str, required=True, location='json')
atributos.add_argument('telefone', type=str, required=True, location='json')
atributos.add_argument('Endereco', type=str, required=True, location='json')
atributos.add_argument('Cidade', type=str, required=True, location='json')
atributos.add_argument('tipo_restaurante', type=str, required=True, location='json')
atributos.add_argument('descricao', type=str, required=True, location='json')


# Parser para login
login = reqparse.RequestParser()
login.add_argument('email', type=str, required=True)
login.add_argument('senha', type=str, required=True)

class Restaurante(Resource):
    def get(self, ID):
        restaurante = restauranteModel.find_restaurante(ID)
        if restaurante:
            return restaurante, 200
        return {'message': 'Restaurante não encontrado.'}, 404

class RemoverRestaurante(Resource):
    @jwt_required()
    def delete(self, ID):
        avaliacaoModel.findandremove(ID)
        restauranteModel.delete_restaurante(ID)
        return {"message": "Restaurante removido com sucesso."}, 200

class TipoRestaurante(Resource):
    def get(self, tipo_restaurante):
        restaurantes = restauranteModel.find_tipo_restaurante(tipo_restaurante)
        if restaurantes:
            return restaurantes, 200
        return {'message': 'Nenhum restaurante encontrado com esse tipo.'}, 404

class ListarRestaurantes(Resource):
    def get(self):
        listar = restauranteModel.find_all_restaurante()
        if listar:
            return listar, 200
        return {"message": "Nenhum restaurante encontrado."}, 404

class FiltrarRestaurante(Resource):
    def get(self, tipo_restaurante):
        if tipo_restaurante.lower() == "nenhum":
            return restauranteModel.find_all_restaurante(), 200
        return restauranteModel.find_tipo_restaurante(tipo_restaurante), 200

class BuscarRestaurante(Resource):
    def get(self, email):
        restaurante = restauranteModel.find_email_restaurante(email)
        if restaurante:
            return restaurante.json(), 200
        return {"message": "Restaurante não encontrado."}, 404

class EncontrarEmailRes(Resource):
    def get(self, email):
        return restauranteModel.buscar_email_restaurante(email), 200

class CadastroRestaurante(Resource): 
    def post(self):
        dados = request.get_json(silent=True)

        if not dados:
            return {'message': 'JSON inválido ou ausente no corpo da requisição.'}, 400

        campos_obrigatorios = ['Nome', 'CNPJ', 'email', 'senha', 'telefone', 'Endereco', 'Cidade', 'tipo_restaurante', 'descricao']
        for campo in campos_obrigatorios:
            if campo not in dados or not dados[campo]:
                return {'message': f"Campo obrigatório ausente ou vazio: {campo}"}, 400

        if restauranteModel.find_email_restaurante(dados['email']):
            return {"message": f"O email '{dados['email']}' já está em uso."}, 400

        dados['senha'] = generate_password_hash(dados['senha'])
        restaurante = restauranteModel(**dados)
        restaurante.save_restaurante()
        return {"message": "Restaurante criado com sucesso!"}, 201



class EditarRestaurante(Resource):
    @jwt_required()
    def put(self, ID):
        dados = request.get_json()
        restaurante = restauranteModel.updaterestaurante(ID, **dados)
        if restaurante:
            return restaurante.json(), 200
        return {"message": "Restaurante não encontrado para edição."}, 404


class LoginRestaurante(Resource):
    def post(self):
        dados = login.parse_args()
        restaurante = restauranteModel.find_email_restaurante(dados['email'])
        if restaurante and check_password_hash(restaurante.senha, dados['senha']):
            token = create_access_token(identity=restaurante.email)
            return {"access_token": token}, 200
        return {'message': 'Email ou senha incorretos.'}, 401

class LogoutRestaurante(Resource):
    @jwt_required()
    def post(self):
        return {'message': 'Você foi deslogado com sucesso!'}, 200

class PesquisarRestaurante(Resource):
    def get(self, Nome):
        restaurantes = restauranteModel.find_name_restaurante(Nome)
        if restaurantes:
            return restaurantes, 200
        return {'message': 'Nenhum restaurante encontrado com esse nome.'}, 404