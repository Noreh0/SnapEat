# resource/tags_api.py
from flask import request
from flask_restx import Resource, Namespace, fields
from flask_jwt_extended import jwt_required
from models.tag_restaurante import TagRestauranteModel, RestauranteTagsConquistadasModel
from models.avaliacao import avaliacaoModel
from sql_alchemy import banco
from sqlalchemy import func, desc, case

api = Namespace('tags', description='Operações com Tags de Restaurantes')

# Swagger models
tag_schema = api.model('Tag', {
    'ID': fields.Integer(readOnly=True),
    'nome': fields.String(required=True),
    'descricao': fields.String(),
    'icone': fields.String(),
    'cor': fields.String()
})
@api.route('/')
@api.route('')
class TagsList(Resource):
    def get(self):
        """Lista todas as tags disponíveis"""
        print("\n🏷️ Endpoint /tags chamado")
        
        try:
            # Buscar tags ativas
            tags = TagRestauranteModel.query.filter_by(ativo=True).all()
            print(f"   ✅ Encontradas {len(tags)} tags ativas")
            
            # ✅ CORREÇÃO: Serializar manualmente para garantir formato correto
            resultado = []
            for tag in tags:
                resultado.append({
                    'ID': tag.ID,
                    'nome': tag.nome,
                    'categoria': tag.categoria,
                    'descricao': tag.descricao,
                    'icone': tag.icone,
                    'cor': tag.cor or '#d97746',
                    'ativo': tag.ativo
                })
                print(f"      Tag: {tag.nome} | Categoria: {tag.categoria} | ID: {tag.ID}")
            
            print(f"   📤 Retornando {len(resultado)} tags")
            return resultado, 200
            
        except Exception as e:
            print(f"   ❌ Erro ao buscar tags: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"message": f"Erro ao buscar tags: {str(e)}"}, 500


@api.route('/categorias')
class TagsCategorias(Resource):
    @api.marshal_list_with(tag_schema)
    def get(self):
        """Lista todas as categorias de tags disponíveis"""
        return TagRestauranteModel.find_all()

@api.route('/restaurante/<int:restaurante_id>')
class TagsRestaurante(Resource):
    def get(self, restaurante_id):
        """Lista as tags conquistadas por um restaurante"""
        print(f"\n🏷️ Buscando tags do restaurante #{restaurante_id}")
        
        try:
            # ✅ DEBUG: Primeiro buscar TODAS as tags do restaurante
            todas_tags_conquistadas = RestauranteTagsConquistadasModel.query.filter_by(
                ID_Restaurante=restaurante_id, ativo=True
            ).all()
            print(f"   📊 Total de tags conquistadas (todas): {len(todas_tags_conquistadas)}")
            
            for tag in todas_tags_conquistadas:
                print(f"      Tag ID: {tag.ID_Tag}, Posição: {tag.posicao_ranking}, Média: {tag.media_categoria}")
            
            # ✅ CORREÇÃO TEMPORÁRIA: Buscar tags conquistadas (incluindo sem ranking por enquanto)
            tags_conquistadas = (
                RestauranteTagsConquistadasModel.query
                .filter_by(ID_Restaurante=restaurante_id, ativo=True)
                .filter(
                    # Aceitar tanto com ranking quanto sem ranking (para debug)
                    (RestauranteTagsConquistadasModel.posicao_ranking.isnot(None)) |
                    (RestauranteTagsConquistadasModel.posicao_ranking.is_(None))
                )
                .order_by(
                    # MySQL equivalente ao nullslast()
                    case(
                        (RestauranteTagsConquistadasModel.posicao_ranking.is_(None), 9999),
                        else_=RestauranteTagsConquistadasModel.posicao_ranking
                    ).asc()
                )
                .limit(5)  # Limitar para não sobrecarregar
                .all()
            )
            
            print(f"   ✅ Encontradas {len(tags_conquistadas)} tags conquistadas (top 3)")
            
            # Serializar manualmente
            resultado = []
            for tag_conquistada in tags_conquistadas:
                tag_info = {
                    'ID': tag_conquistada.ID,
                    'ID_Tag': tag_conquistada.ID_Tag,
                    'ID_Restaurante': tag_conquistada.ID_Restaurante,
                    'posicao_ranking': tag_conquistada.posicao_ranking,
                    'media_categoria': float(tag_conquistada.media_categoria) if tag_conquistada.media_categoria else 0,
                    'total_avaliacoes': tag_conquistada.total_avaliacoes,
                    'ativo': tag_conquistada.ativo
                }
                
                # Adicionar informações da tag
                if tag_conquistada.tag:
                    tag_info['nome'] = tag_conquistada.tag.nome
                    tag_info['categoria'] = tag_conquistada.tag.categoria
                    tag_info['icone'] = tag_conquistada.tag.icone
                    tag_info['descricao'] = tag_conquistada.tag.descricao
                    tag_info['cor'] = tag_conquistada.tag.cor
                
                resultado.append(tag_info)
                print(f"      Tag: {tag_info.get('nome')} | Ranking: #{tag_conquistada.posicao_ranking}")
            
            return {
                "restaurante_id": restaurante_id,
                "tags_conquistadas": resultado,
                "total_tags": len(resultado)
            }, 200
            
        except Exception as e:
            print(f"   ❌ Erro: {str(e)}")
            import traceback
            traceback.print_exc()
            return {"message": f"Erro ao buscar tags: {str(e)}"}, 500


@api.route('/ranking/<int:tag_id>')
class RankingTag(Resource):
    def get(self, tag_id):
        """Mostra o ranking de restaurantes para uma tag específica"""
        
        # Buscar top 10 restaurantes nesta categoria
        ranking = (
            banco.session.query(
                RestauranteTagsConquistadasModel,
            )
            .filter(
                RestauranteTagsConquistadasModel.ID_Tag == tag_id,
                RestauranteTagsConquistadasModel.ativo == True
            )
            .order_by(desc(RestauranteTagsConquistadasModel.media_categoria))
            .limit(10)
            .all()
        )
        
        # Buscar informações das tags e restaurantes
        from models.restaurante import restauranteModel
        
        resultado = []
        for idx, tag_conquistada in enumerate(ranking, 1):
            restaurante = restauranteModel.find_restaurante(tag_conquistada.ID_Restaurante)
            
            if restaurante:
                resultado.append({
                    "posicao": idx,
                    "restaurante": {
                        "ID": restaurante.ID,
                        "Nome": restaurante.Nome,
                        "endereco": restaurante.endereco
                    },
                    "pontuacao": {
                        "media": float(tag_conquistada.media_categoria),
                        "total_avaliacoes": tag_conquistada.total_avaliacoes,
                        "pontuacao_total": float(tag_conquistada.pontuacao_total)
                    }
                })
        
        # Buscar informações da tag
        tag = TagRestauranteModel.find_by_id(tag_id)
        
        return {
            "tag": tag,
            "ranking": resultado,
            "total_restaurantes": len(resultado)
        }, 200

@api.route('/recalcular-rankings')
class RecalcularRankings(Resource):
    @jwt_required()  # Apenas admins
    def post(self):
        """Recalcula todos os rankings de tags"""
        try:
            # Buscar todas as tags
            tags = TagRestauranteModel.query.all()
            
            rankings_atualizados = 0
            
            for tag in tags:
                # Buscar todos os restaurantes com avaliações nesta tag
                restaurantes_com_tag = (
                    banco.session.query(
                        RestauranteTagsConquistadasModel.ID_Restaurante,
                        RestauranteTagsConquistadasModel.media_categoria
                    )
                    .filter(
                        RestauranteTagsConquistadasModel.ID_Tag == tag.ID,
                        RestauranteTagsConquistadasModel.ativo == True
                    )
                    .order_by(desc(RestauranteTagsConquistadasModel.media_categoria))
                    .all()
                )
                
                # Atualizar posições no ranking (top 3 ganham posição)
                for posicao, (restaurante_id, media) in enumerate(restaurantes_com_tag[:3], 1):
                    tag_conquistada = RestauranteTagsConquistadasModel.query.filter_by(
                        ID_Restaurante=restaurante_id,
                        ID_Tag=tag.ID
                    ).first()
                    
                    if tag_conquistada:
                        tag_conquistada.posicao_ranking = posicao
                        rankings_atualizados += 1
                
                # Remover posição dos demais
                for restaurante_id, media in restaurantes_com_tag[3:]:
                    tag_conquistada = RestauranteTagsConquistadasModel.query.filter_by(
                        ID_Restaurante=restaurante_id,
                        ID_Tag=tag.ID
                    ).first()
                    
                    if tag_conquistada:
                        tag_conquistada.posicao_ranking = None
            
            banco.session.commit()
            
            return {
                "message": f"Rankings recalculados com sucesso",
                "tags_processadas": len(tags),
                "posicoes_atualizadas": rankings_atualizados
            }, 200
            
        except Exception as e:
            banco.session.rollback()
            return {"message": f"Erro ao recalcular rankings: {str(e)}"}, 500

@api.route('/estatisticas')
class EstatisticasTags(Resource):
    def get(self):
        """Estatísticas gerais do sistema de tags"""
        try:
            # Total de tags por categoria
            stats_por_tag = (
                banco.session.query(
                    TagRestauranteModel.nome,
                    TagRestauranteModel.icone,
                    TagRestauranteModel.cor,
                    func.count(RestauranteTagsConquistadasModel.ID).label('total_restaurantes'),
                    func.avg(RestauranteTagsConquistadasModel.media_categoria).label('media_geral')
                )
                .outerjoin(RestauranteTagsConquistadasModel, TagRestauranteModel.ID == RestauranteTagsConquistadasModel.ID_Tag)
                .filter(RestauranteTagsConquistadasModel.ativo == True)
                .group_by(TagRestauranteModel.ID)
                .all()
            )
            
            estatisticas = []
            for tag_nome, icone, cor, total, media in stats_por_tag:
                estatisticas.append({
                    "categoria": tag_nome,
                    "icone": icone,
                    "cor": cor,
                    "total_restaurantes_com_tag": total,
                    "media_geral_categoria": round(float(media), 2) if media else 0
                })
            
            # Total geral
            total_tags_conquistadas = RestauranteTagsConquistadasModel.query.filter_by(ativo=True).count()
            
            return {
                "estatisticas_por_categoria": estatisticas,
                "total_tags_conquistadas": total_tags_conquistadas,
                "total_categorias": len(estatisticas)
            }, 200
            
        except Exception as e:
            return {"message": f"Erro ao buscar estatísticas: {str(e)}"}, 500