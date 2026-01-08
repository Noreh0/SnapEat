# tests/test_models/test_tag_restaurante.py
import pytest
from models.tag_restaurante import (
    TagRestauranteModel,
    RestauranteTagsConquistadasModel,
    AvaliacaoTagsModel
)
from datetime import datetime

class TestTagRestauranteModel:
    """Testes para o modelo TagRestauranteModel"""
    
    def test_criar_tag(self, session):
        """Testa a criação de uma tag"""
        tag = TagRestauranteModel(
            nome="Ambiente",
            categoria="ambiente",
            descricao="Teste de ambiente",
            icone="fas fa-home",
            cor="#27ae60",
            ativo=True
        )
        session.add(tag)
        session.commit()
        
        assert tag.ID is not None
        assert tag.nome == "Ambiente"
        assert tag.ativo is True
    
    def test_tag_json_serialization(self, sample_tags):
        """Testa a serialização JSON de uma tag"""
        tag = sample_tags[0]
        tag_json = tag.json()
        
        assert 'ID' in tag_json
        assert 'nome' in tag_json
        assert 'categoria' in tag_json
        assert tag_json['nome'] == tag.nome
    
    def test_find_by_id(self, sample_tags, session):
        """Testa buscar tag por ID"""
        tag = sample_tags[0]
        found_tag = TagRestauranteModel.find_by_id(tag.ID)
        
        assert found_tag is not None
        assert found_tag.ID == tag.ID
        assert found_tag.nome == tag.nome
    
    def test_find_by_categoria(self, sample_tags, session):
        """Testa buscar tags por categoria"""
        tags = TagRestauranteModel.find_by_categoria("comida")
        
        assert len(tags) > 0
        assert all(tag.categoria == "comida" for tag in tags)

class TestRestauranteTagsConquistadasModel:
    """Testes para tags conquistadas por restaurantes"""
    
    def test_criar_tag_conquistada(self, session, sample_restaurante, sample_tags):
        """Testa a criação de uma tag conquistada"""
        tag_conquistada = RestauranteTagsConquistadasModel(
            ID_Restaurante=sample_restaurante.ID,
            ID_Tag=sample_tags[0].ID,
            pontuacao_total=45.0,
            total_avaliacoes=10,
            media_categoria=4.5,
            posicao_ranking=1,
            ativo=True
        )
        session.add(tag_conquistada)
        session.commit()
        
        assert tag_conquistada.ID is not None
        assert tag_conquistada.media_categoria == 4.5
    
    def test_relacionamento_com_restaurante(self, session, sample_restaurante, sample_tags):
        """Testa o relacionamento com restaurante"""
        tag_conquistada = RestauranteTagsConquistadasModel(
            ID_Restaurante=sample_restaurante.ID,
            ID_Tag=sample_tags[0].ID,
            pontuacao_total=40.0,
            total_avaliacoes=8,
            media_categoria=4.0,
            posicao_ranking=2
        )
        session.add(tag_conquistada)
        session.commit()
        
        # Buscar tags do restaurante
        tags_conquistadas = RestauranteTagsConquistadasModel.query.filter_by(
            ID_Restaurante=sample_restaurante.ID
        ).all()
        
        assert len(tags_conquistadas) > 0
        assert tags_conquistadas[0].ID_Restaurante == sample_restaurante.ID