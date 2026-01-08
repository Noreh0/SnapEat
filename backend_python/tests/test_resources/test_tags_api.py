import pytest
import json
from models.tag_restaurante import TagRestauranteModel, RestauranteTagsConquistadasModel

@pytest.mark.unit
class TestTagsAPI:
    """Testes para a API de Tags."""
    
    def test_listar_tags(self, client):
        """Testa listagem de todas as tags."""
        response = client.get('/tags/')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert isinstance(data, list)
        assert len(data) > 0
        
        # Verificar estrutura da tag
        tag = data[0]
        assert 'ID' in tag
        assert 'nome' in tag
        assert 'categoria' in tag
        assert 'descricao' in tag
        assert 'icone' in tag
        assert 'cor' in tag
    
    def test_listar_tags_por_categoria(self, client):
        """Testa listagem de tags por categoria."""
        response = client.get('/tags/categoria/atendimento')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert isinstance(data, list)
        
        for tag in data:
            assert tag['categoria'] == 'atendimento'
    
    def test_buscar_tags_restaurante(self, client, app):
        """Testa busca de tags conquistadas por restaurante."""
        with app.app_context():
            from models.restaurante import restauranteModel
            restaurante = restauranteModel.query.filter_by(email='restaurante@test.com').first()
            
            response = client.get(f'/tags/restaurante/{restaurante.ID}')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert 'restaurante_id' in data
            assert 'tags_conquistadas' in data
            assert 'total_tags' in data
            assert isinstance(data['tags_conquistadas'], list)
    
    def test_buscar_tags_restaurante_inexistente(self, client):
        """Testa busca de tags de restaurante que não existe."""
        response = client.get('/tags/restaurante/99999')
        assert response.status_code == 404
    
    def test_ranking_tag(self, client, app):
        """Testa ranking de restaurantes por tag."""
        with app.app_context():
            tag = TagRestauranteModel.query.first()
            
            response = client.get(f'/tags/ranking/{tag.ID}')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert 'tag' in data
            assert 'ranking' in data
            assert isinstance(data['ranking'], list)
    
    def test_estatisticas_tags(self, client):
        """Testa endpoint de estatísticas."""
        response = client.get('/tags/estatisticas')
        assert response.status_code == 200
        
        data = json.loads(response.data)
        assert 'total_tags' in data
        assert 'total_restaurantes_com_tags' in data
        assert 'total_avaliacoes_com_tags' in data
        assert 'tags_mais_populares' in data

@pytest.mark.integration
@pytest.mark.database
class TestTagsIntegration:
    """Testes de integração para Tags."""
    
    def test_criar_tag_e_buscar(self, client, app, session, auth_headers):
        """Testa criação e busca de tag."""
        with app.app_context():
            # Criar nova tag
            nova_tag = TagRestauranteModel(
                nome='Nova Tag Teste',
                categoria='teste',
                descricao='Tag para teste de integração',
                icone='fa-test',
                cor='#FF0000'
            )
            session.add(nova_tag)
            session.commit()
            
            # Buscar todas as tags
            response = client.get('/tags/')
            data = json.loads(response.data)
            
            # Verificar se a nova tag está na lista
            tag_names = [tag['nome'] for tag in data]
            assert 'Nova Tag Teste' in tag_names
    
    def test_fluxo_completo_tags_restaurante(self, client, app, session, sample_restaurante, sample_tag):
        """Testa fluxo completo: criar tag conquistada e buscar."""
        with app.app_context():
            # Criar tag conquistada
            tag_conquistada = RestauranteTagsConquistadasModel(
                ID_Restaurante=sample_restaurante.ID,
                ID_Tag=sample_tag.ID,
                pontuacao_total=50.0,
                total_avaliacoes=12,
                media_categoria=4.2,
                posicao_ranking=1,
                ativo=True
            )
            session.add(tag_conquistada)
            session.commit()
            
            # Buscar tags do restaurante
            response = client.get(f'/tags/restaurante/{sample_restaurante.ID}')
            assert response.status_code == 200
            
            data = json.loads(response.data)
            assert data['total_tags'] > 0
            assert len(data['tags_conquistadas']) > 0
            
            # Verificar dados da tag
            tag_data = data['tags_conquistadas'][0]
            assert tag_data['nome'] == sample_tag.nome
            assert tag_data['posicao_ranking'] == 1