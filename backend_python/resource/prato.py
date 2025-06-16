from flask import request, current_app, url_for
from flask_restx import Resource, Namespace, fields, reqparse
from flask_jwt_extended import jwt_required
from models.prato import pratoModel
from werkzeug.utils import secure_filename
from werkzeug.datastructures import FileStorage
import os
from sql_alchemy import banco


api = Namespace('prato', description='Operações com pratos do cardápio')

prato_fields = api.model('Prato', {
    'ID': fields.Integer(readOnly=True),
    'Nome': fields.String(required=True, description='Nome do prato'),
    'descricao': fields.String(description='Descrição do prato'),
    'preco': fields.Float(required=True, description='Preço do prato'),
    'restaurante_id': fields.Integer(required=True, description='ID do restaurante'),
    'imagem_url': fields.String(description='URL da imagem do prato')
})
upload_parser = reqparse.RequestParser()
upload_parser.add_argument(
    'file',
    location='files',
    type=FileStorage,
    required=True,
    help='Arquivo de imagem do prato'
)



@api.route('')
@api.route('/<int:ID>')
class PratoResource(Resource):
    @jwt_required(optional=True)
    @api.marshal_with(prato_fields, as_list=True)
    def get(self, ID=None):
        """Lista todos os pratos ou retorna um prato específico por ID"""
        if ID is None:
            return pratoModel.find_all(), 200
        resultado = pratoModel.find_by_id(ID)
        if resultado:
            return resultado, 200
        api.abort(404, "Prato não encontrado.")

    @jwt_required()
    @api.expect(prato_fields, validate=True)
    @api.marshal_with(prato_fields, code=201)
    def post(self):
        """Cria um novo prato ligado a um restaurante existente"""
        dados = request.json
        novo = pratoModel(**dados)
        novo.save_prato()
        return novo.json(), 201

    @jwt_required()
    @api.expect(prato_fields, validate=True)
    @api.marshal_with(prato_fields)
    def put(self, ID):
        """Atualiza os dados de um prato existente"""
        dados = request.json
        dados.pop('ID', None)
        atualizado = pratoModel.update_prato(ID, **dados)
        if atualizado:
            return atualizado.json(), 200
        api.abort(404, "Prato não encontrado para atualização.")

    @jwt_required()
    def delete(self, ID):
        """Exclui um prato"""
        sucesso = pratoModel.delete_prato(ID)
        if sucesso:
            return {"message": "Prato removido."}, 200
        api.abort(404, "Prato não encontrado para exclusão.")

@api.route('/restaurante/<int:restaurante_id>')
class PratosDoRestaurante(Resource):
    @api.marshal_with(prato_fields, as_list=True)
    def get(self, restaurante_id):
        """Lista todos os pratos de um restaurante específico"""
        return pratoModel.find_by_restaurante(restaurante_id), 200

@api.route('/search/<string:Nome>')
class PratoSearch(Resource):
    @api.marshal_with(prato_fields, as_list=True)
    def get(self, Nome):
        """Filtra pratos pelo nome (contains)"""
        return pratoModel.find_by_name(Nome), 200

@api.route('/<int:ID>/upload')
class PratoUpload(Resource):
    @jwt_required()
    @api.expect(upload_parser)
    def post(self, ID):
        """
        Faz upload de uma imagem para o prato ID,
        salva no disco e atualiza prato.imagem_url
        """
        args = upload_parser.parse_args()
        arquivo: FileStorage = args['file']

        # Sanitiza nome de arquivo e define destino
        filename = secure_filename(f"prato_{ID}_" + arquivo.filename)
        upload_folder = current_app.config['UPLOAD_FOLDER']
        destino = os.path.join(upload_folder, filename)

        # Salva no disco
        arquivo.save(destino)

        # Gera URL pública (ajuste o prefixo conforme seu static path)
        imagem_url = url_for(
            'static',
            filename='uploads/' + filename,
            _external=True
        )

        # Atualiza modelo
        prato = pratoModel.query.get(ID)
        if not prato:
            api.abort(404, "Prato não encontrado.")
        # ...no método de upload...
        prato.imagem_url = imagem_url  # <-- troque imagem_blob por imagem_url
        banco.session.commit()  
        return { "ID": ID, "imagem_url": imagem_url }, 200
