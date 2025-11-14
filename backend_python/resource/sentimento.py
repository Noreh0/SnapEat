from flask_restx import Namespace, Resource, fields
from flask import request
from resource.nlp_client import analisar_sentimento

api = Namespace('nlp', description='Recursos de NLP')

entrada = api.model('SentimentoIn', {
    'texto': fields.String(required=True)
})
saida = api.model('SentimentoOut', {
    'sentimento': fields.String,
    'label_id': fields.Integer
})

@api.route('/sentimento')
class SentimentoResource(Resource):
    @api.expect(entrada)
    @api.marshal_with(saida, code=200)
    def post(self):
        dados = request.get_json() or {}
        texto = dados.get("texto","").strip()
        if not texto:
            return {"message": "Texto vazio"}, 400
        r = analisar_sentimento(texto)
        if not r:
            return {"message": "Serviço NLP indisponível"}, 503
        return r, 200