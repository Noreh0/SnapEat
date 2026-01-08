import pytest
import json

@pytest.mark.unit
class TestRestauranteAPI:
    """Testes para API de Restaurantes."""
    
    def test_listar_restaurantes(self, client):
        """Testa listagem de restaurantes."""
        response = client.get('/menu')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert isinstance(data, list)
    
    def test_buscar_restaurante_por_id(self, client, app, sample_restaurante):
        """Testa busca de restaurante por ID."""
        with app.app_context():
            response = client.get(f'/restaurante/{sample_restaurante.ID}')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert data['ID'] == sample_restaurante.ID
            assert data['Nome'] == sample_restaurante.Nome
            
            # Verificar se tags conquistadas estão incluídas
            assert 'tags_conquistadas' in data
    
    def test_filtrar_por_tipo(self, client):
        """Testa filtro por tipo de restaurante."""
        response = client.get('/filtrar/Italiana')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert isinstance(data, list)
    
    def test_pesquisar_restaurante(self, client):
        """Testa pesquisa de restaurante por nome."""
        response = client.get('/PesquisarRestauranteRestaurante/Teste')
        assert response.status_code in [200, 404]
    
    def test_restaurantes_proximos(self, client):
        """Testa busca de restaurantes próximos."""
        response = client.get('/restaurantes/proximos?latitude=-23.5505&longitude=-46.6333&raio=5')
        assert response.status_code == 200