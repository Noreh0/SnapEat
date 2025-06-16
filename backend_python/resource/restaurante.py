# resource/restaurante.py
from flask import request, current_app, send_from_directory
from werkzeug.utils import secure_filename
import os
from flask_restx import Resource, Namespace, fields
from flask_jwt_extended import jwt_required
from models.restaurante import restauranteModel
from models.avaliacao import avaliacaoModel
from sql_alchemy import banco

api = Namespace('restaurante', description='Operações com restaurantes')

# Definição do modelo para Swagger e para marshal
restaurante_fields = api.model('Restaurante', {
    'ID': fields.Integer(readOnly=True),
    'Nome': fields.String(required=True),
    'CNPJ': fields.String(required=True),
    'email': fields.String(required=True),
    'telefone': fields.String,
    'Endereco': fields.String,
    'Cidade': fields.String,
    'tipo_restaurante': fields.String,
    'descricao': fields.String,
})

@api.route('', '/<int:ID>')
class RestauranteResource(Resource):
    @jwt_required()
    @api.marshal_with(restaurante_fields, as_list=False)
    def get(self, ID=None):
        if ID is None:
            # lista todos
            return restauranteModel.find_all_restaurante()
        data = restauranteModel.find_restaurante(ID)
        if data:
            return data
        api.abort(404, "Restaurante não encontrado.")

    @api.expect(restaurante_fields)
    @jwt_required()
    def post(self):
        """Criação de restaurante (se ainda não tiver)"""
        dados = request.json
        # verifique duplicação de email, hash da senha, etc.
        # ...
        return {"message": "Não implementado."}, 501

    @api.expect(restaurante_fields)
    @jwt_required()
    def put(self, ID):
        dados = request.get_json() or {}
        dados.pop('ID', None)
        dados.pop('confirmasenha', None)
        atualizado = restauranteModel.update_restaurante(ID, **dados)
        if atualizado:
            return atualizado.json(), 200
        api.abort(404, "Restaurante não encontrado para edição.")

    @jwt_required()
    def delete(self, ID):
        # opcional: apagar avaliações antes
        avaliacaoModel.findandremove(ID)
        sucesso = restauranteModel.delete_restaurante(ID)
        if sucesso:
            return {"message": "Restaurante removido."}, 200
        api.abort(404, "Restaurante não encontrado para exclusão.")



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

class EditarRestaurante(Resource):
    @jwt_required()
    def put(self, ID):
        dados = request.get_json()
        restaurante = restauranteModel.update_restaurante(ID, **dados)
        if restaurante:
            return restaurante.json(), 200
        return {"message": "Restaurante não encontrado para edição."}, 404

class PesquisarRestaurante(Resource):
    def get(self, Nome):
        restaurantes = restauranteModel.find_name_restaurante(Nome)
        if restaurantes:
            return restaurantes, 200
        return {'message': 'Nenhum restaurante encontrado com esse nome.'}, 404
    
@api.route('/<int:ID>/upload-imagem')
class RestauranteImagemUpload(Resource):
    def post(self, ID):
        restaurante = restauranteModel.query.get(ID)
        if not restaurante:
            return {"message": "Restaurante não encontrado."}, 404

        if 'imagem' not in request.files:
            return {"message": "Nenhuma imagem enviada."}, 400

        file = request.files['imagem']
        if file.filename == '':
            return {"message": "Nome de arquivo vazio."}, 400

        filename = secure_filename(file.filename)
        upload_folder = current_app.config['UPLOAD_FOLDER']
        os.makedirs(upload_folder, exist_ok=True)
        filepath = os.path.join(upload_folder, filename)
        file.save(filepath)

        # Salva o caminho relativo
        restaurante.imagem_url = f'/static/uploads/{filename}'
        banco.session.commit()
        return {"imagem_url": restaurante.imagem_url}, 200