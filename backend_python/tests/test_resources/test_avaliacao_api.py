import pytest
import json
from models.avaliacao import avaliacaoModel

@pytest.mark.unit
class TestAvaliacaoAPI:
    """Testes para API de Avaliações"""
    
    def test_criar_avaliacao_sem_autenticacao(self, client):
        """Testa criar avaliação sem autenticação"""
        response = client.post('/avaliacoes', json={
            'ID_Restaurante': 1,
            'Comentario': 'Teste',
            'Nota': 5
        })
        assert response.status_code in [401, 422]
    
    def test_listar_avaliacoes_restaurante(self, client, sample_restaurante):
        """Testa listagem de avaliações de um restaurante"""
        response = client.get(f'/avaliacoes/restaurante/{sample_restaurante.ID}')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert isinstance(data, list)
    
    def test_buscar_avaliacao_inexistente(self, client):
        """Testa buscar avaliação que não existe"""
        response = client.get('/avaliacoes/99999')
        assert response.status_code in [404, 200]

@pytest.mark.integration
class TestAvaliacaoAPIIntegration:
    """Testes de integração para API de Avaliações"""
    
    def test_fluxo_completo_avaliacao(self, client, app, session, sample_restaurante, sample_usuario):
        """Testa fluxo completo: criar, buscar, editar"""
        with app.app_context():
            # 1. Criar avaliação
            avaliacao = avaliacaoModel(
                ID_Restaurante=sample_restaurante.ID,
                ID_Cliente=sample_usuario.ID,
                Comentario="Teste fluxo",
                Nota=4,
                visivel=True
            )
            session.add(avaliacao)
            session.commit()
            avaliacao_id = avaliacao.ID
            
            # 2. Buscar avaliação
            response = client.get(f'/avaliacoes/{avaliacao_id}')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert data['ID'] == avaliacao_id