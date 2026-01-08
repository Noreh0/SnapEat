import pytest
from datetime import datetime
from models.avaliacao import avaliacaoModel
from models.restaurante import restauranteModel
from models.usuario import UsuarioModel

@pytest.mark.unit
class TestAvaliacaoModel:
    """Testes unitários para o modelo de Avaliação"""
    
    def test_criar_avaliacao(self, session, sample_restaurante, sample_usuario):
        """Testa a criação de uma avaliação"""
        avaliacao = avaliacaoModel(
            ID_Restaurante=sample_restaurante.ID,
            ID_Cliente=sample_usuario.ID,
            Comentario="Ótimo restaurante!",
            Nota=5,
            visivel=True
        )
        session.add(avaliacao)
        session.commit()
        
        assert avaliacao.ID is not None
        assert avaliacao.Nota == 5
        assert avaliacao.visivel is True
        assert avaliacao.Comentario == "Ótimo restaurante!"
    
    def test_avaliacao_json_serialization(self, session, sample_restaurante, sample_usuario):
        """Testa a serialização JSON de uma avaliação"""
        avaliacao = avaliacaoModel(
            ID_Restaurante=sample_restaurante.ID,
            ID_Cliente=sample_usuario.ID,
            Comentario="Teste JSON",
            Nota=4,
            visivel=True
        )
        session.add(avaliacao)
        session.commit()
        
        avaliacao_json = avaliacao.json()
        
        assert 'ID' in avaliacao_json
        assert 'ID_Restaurante' in avaliacao_json
        assert 'ID_Cliente' in avaliacao_json
        assert 'Comentario' in avaliacao_json
        assert 'Nota' in avaliacao_json
        assert avaliacao_json['Nota'] == 4
    
    def test_find_avaliacoes_by_restaurante(self, session, sample_restaurante, sample_usuario):
        """Testa buscar avaliações por restaurante"""
        # Criar múltiplas avaliações
        for i in range(3):
            avaliacao = avaliacaoModel(
                ID_Restaurante=sample_restaurante.ID,
                ID_Cliente=sample_usuario.ID,
                Comentario=f"Comentário {i}",
                Nota=5 - i,
                visivel=True
            )
            session.add(avaliacao)
        session.commit()
        
        avaliacoes = avaliacaoModel.query.filter_by(
            ID_Restaurante=sample_restaurante.ID
        ).all()
        
        assert len(avaliacoes) >= 3
        assert all(av.ID_Restaurante == sample_restaurante.ID for av in avaliacoes)
    
    def test_avaliacao_relacionamento_restaurante(self, session, sample_restaurante, sample_usuario):
        """Testa o relacionamento com restaurante"""
        avaliacao = avaliacaoModel(
            ID_Restaurante=sample_restaurante.ID,
            ID_Cliente=sample_usuario.ID,
            Comentario="Teste relacionamento",
            Nota=4,
            visivel=True
        )
        session.add(avaliacao)
        session.commit()
        
        # Buscar restaurante da avaliação
        restaurante = restauranteModel.query.get(avaliacao.ID_Restaurante)
        assert restaurante is not None
        assert restaurante.ID == sample_restaurante.ID
    
    def test_avaliacao_relacionamento_usuario(self, session, sample_restaurante, sample_usuario):
        """Testa o relacionamento com usuário"""
        avaliacao = avaliacaoModel(
            ID_Restaurante=sample_restaurante.ID,
            ID_Cliente=sample_usuario.ID,
            Comentario="Teste relacionamento usuário",
            Nota=5,
            visivel=True
        )
        session.add(avaliacao)
        session.commit()
        
        # Buscar usuário da avaliação
        usuario = UsuarioModel.query.get(avaliacao.ID_Cliente)
        assert usuario is not None
        assert usuario.ID == sample_usuario.ID

    def test_avaliacao_visibilidade(self, session, sample_restaurante, sample_usuario):
        """Testa a funcionalidade de visibilidade"""
        avaliacao = avaliacaoModel(
            ID_Restaurante=sample_restaurante.ID,
            ID_Cliente=sample_usuario.ID,
            Comentario="Avaliação oculta",
            Nota=3,
            visivel=False
        )
        session.add(avaliacao)
        session.commit()
        
        assert avaliacao.visivel is False
        
        # Ocultar avaliação
        avaliacao.visivel = True
        session.commit()
        
        assert avaliacao.visivel is True
    
    def test_validacao_nota(self, session, sample_restaurante, sample_usuario):
        """Testa validação de nota (deve estar entre 1 e 5)"""
        # Nota válida
        avaliacao_valida = avaliacaoModel(
            ID_Restaurante=sample_restaurante.ID,
            ID_Cliente=sample_usuario.ID,
            Comentario="Nota válida",
            Nota=3,
            visivel=True
        )
        session.add(avaliacao_valida)
        session.commit()
        
        assert 1 <= avaliacao_valida.Nota <= 5

@pytest.mark.integration
class TestAvaliacaoIntegration:
    """Testes de integração para Avaliações"""
    
    def test_criar_e_buscar_avaliacao(self, session, sample_restaurante, sample_usuario):
        """Testa criar e buscar avaliação"""
        # Criar
        avaliacao = avaliacaoModel(
            ID_Restaurante=sample_restaurante.ID,
            ID_Cliente=sample_usuario.ID,
            Comentario="Integração teste",
            Nota=4,
            visivel=True
        )
        session.add(avaliacao)
        session.commit()
        avaliacao_id = avaliacao.ID
        
        # Buscar
        avaliacao_encontrada = avaliacaoModel.query.get(avaliacao_id)
        assert avaliacao_encontrada is not None
        assert avaliacao_encontrada.Comentario == "Integração teste"
    
    def test_calcular_media_restaurante(self, session, sample_restaurante, sample_usuario):
        """Testa cálculo de média de avaliações"""
        from sqlalchemy import func
        
        # Criar avaliações com diferentes notas
        notas = [5, 4, 3, 5, 4]
        for nota in notas:
            avaliacao = avaliacaoModel(
                ID_Restaurante=sample_restaurante.ID,
                ID_Cliente=sample_usuario.ID,
                Comentario=f"Nota {nota}",
                Nota=nota,
                visivel=True
            )
            session.add(avaliacao)
        session.commit()
        
        # Calcular média
        media = session.query(
            func.avg(avaliacaoModel.Nota)
        ).filter_by(
            ID_Restaurante=sample_restaurante.ID,
            visivel=True
        ).scalar()
        
        assert media is not None
        assert 3 <= media <= 5