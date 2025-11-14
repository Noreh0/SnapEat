from flask import request
from flask_restx import Resource, Namespace, fields
from flask_jwt_extended import jwt_required, get_jwt
from sql_alchemy import banco
from models.restaurante import restauranteModel
from models.avaliacao import avaliacaoModel
from sqlalchemy import func, desc
from math import radians, sin, cos, sqrt, atan2

api = Namespace('notificacoes', description='Notificações e recomendações')

recom_schema = api.model('RecomReq', {
    'latitude': fields.Float(required=False),
    'longitude': fields.Float(required=False),
    'tipo': fields.String(required=False, description='tipo_restaurante'),
    'raio_km': fields.Float(required=False, default=5.0)
})

@api.route('/recomendacoes')
class Recomendacoes(Resource):
    @api.doc(params={'latitude':'float','longitude':'float','tipo':'string','raio_km':'float'})
    @jwt_required(optional=True)
    def get(self):
        lat = request.args.get('latitude', type=float)
        lng = request.args.get('longitude', type=float)
        tipo = request.args.get('tipo', type=str)
        raio = request.args.get('raio_km', default=5.0, type=float)

        # ranking por média de nota
        q = (
            banco.session.query(
                restauranteModel,
                func.coalesce(func.avg(avaliacaoModel.Nota), 0).label('media')
            )
            .outerjoin(avaliacaoModel, avaliacaoModel.ID_Restaurante == restauranteModel.ID)
        )
        if tipo and tipo.lower() not in ('todos','nenhum'):
            q = q.filter(restauranteModel.tipo_restaurante == tipo)

        rows = q.group_by(restauranteModel.ID).all()

        def dist_km(a_lat, a_lng, b_lat, b_lng):
            if None in (a_lat, a_lng, b_lat, b_lng): return None
            R = 6371.0
            dlat = radians(b_lat - a_lat)
            dlon = radians(b_lng - a_lng)
            x = sin(dlat/2)**2 + cos(radians(a_lat))*cos(radians(b_lat))*sin(dlon/2)**2
            return 2*R*atan2(sqrt(x), sqrt(1-x))

        itens = []
        for r, media in rows:
            d = dist_km(lat, lng, r.latitude, r.longitude) if lat is not None and lng is not None else None
            if d is not None and d > raio:
                continue
            itens.append({**r.json(), 'mediaAvaliacoes': float(media), 'distancia_km': d})

        # ordena por distância (se houver), depois média desc
        itens.sort(key=lambda x: (x['distancia_km'] is None, x['distancia_km'] or 0, -x['mediaAvaliacoes']))
        return itens[:10], 200