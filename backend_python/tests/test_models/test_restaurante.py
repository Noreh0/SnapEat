import pytest
from models.restaurante import restauranteModel

@pytest.mark.unit
class TestRestauranteModel:
    """Testes unitários para o modelo de Restaurante"""
    
    def test_criar_restaurante(self, session):
        """Testa a criação de um restaurante"""
        restaurante = restauranteModel(
            Nome="Novo Restaurante",
            nome_fantasia="Novo Ltda",
            CNPJ="98765432109876",
            email="novo@restaurante.com",
            senha="senha456",
            telefone="11988887777",
            Endereco="Av. Teste, 456",
            Cidade="Rio de Janeiro",
            latitude=-22.906847,
            longitude=-43.172896,
            bairro="Copacabana",
            tipo_restaurante="Brasileira",
            descricao="Restaurante brasileiro"
        )
        session.add(restaurante)
        session.commit()
        
        assert restaurante.ID is not None
        assert restaurante.Nome == "Novo Restaurante"
        assert restaurante.tipo_restaurante == "Brasileira"
    
    def test_restaurante_json_serialization(self, sample_restaurante):
        """Testa a serialização JSON"""
        restaurante_json = sample_restaurante.json()
        
        assert 'ID' in restaurante_json
        assert 'Nome' in restaurante_json
        assert 'CNPJ' in restaurante_json
        assert 'email' in restaurante_json
        assert 'tipo_restaurante' in restaurante_json
        assert restaurante_json['Nome'] == sample_restaurante.Nome
    
    def test_find_restaurante_by_id(self, session, sample_restaurante):
        """Testa buscar restaurante por ID"""
        restaurante = restauranteModel.find_restaurante(sample_restaurante.ID)
        
        assert restaurante is not None
        assert restaurante['ID'] == sample_restaurante.ID
        assert restaurante['Nome'] == sample_restaurante.Nome
    
    def test_find_by_email(self, session, sample_restaurante):
        """Testa buscar restaurante por email"""
        restaurante = restauranteModel.query.filter_by(
            email=sample_restaurante.email
        ).first()
        
        assert restaurante is not None
        assert restaurante.email == sample_restaurante.email
    
    def test_find_by_tipo(self, session, sample_restaurante):
        """Testa buscar por tipo de restaurante"""
        restaurantes = restauranteModel.query.filter_by(
            tipo_restaurante=sample_restaurante.tipo_restaurante
        ).all()
        
        assert len(restaurantes) > 0
        assert all(r.tipo_restaurante == sample_restaurante.tipo_restaurante for r in restaurantes)
    
    def test_coordenadas_geograficas(self, session, sample_restaurante):
        """Testa se as coordenadas geográficas estão corretas"""
        assert sample_restaurante.latitude is not None
        assert sample_restaurante.longitude is not None
        assert -90 <= sample_restaurante.latitude <= 90
        assert -180 <= sample_restaurante.longitude <= 180
    
    def test_update_restaurante(self, session, sample_restaurante):
        """Testa atualização de restaurante"""
        novo_nome = "Restaurante Atualizado"
        sample_restaurante.Nome = novo_nome
        session.commit()
        
        restaurante_atualizado = restauranteModel.query.get(sample_restaurante.ID)
        assert restaurante_atualizado.Nome == novo_nome

@pytest.mark.integration
class TestRestauranteIntegration:
    """Testes de integração para Restaurante"""
    
    def test_restaurante_com_avaliacoes(self, session, sample_restaurante, sample_usuario):
        """Testa restaurante com avaliações"""
        from models.avaliacao import avaliacaoModel
        
        # Criar avaliações
        for i in range(3):
            avaliacao = avaliacaoModel(
                ID_Restaurante=sample_restaurante.ID,
                ID_Cliente=sample_usuario.ID,
                Comentario=f"Avaliação {i}",
                Nota=4,
                visivel=True
            )
            session.add(avaliacao)
        session.commit()
        
        # Buscar avaliações do restaurante
        avaliacoes = avaliacaoModel.query.filter_by(
            ID_Restaurante=sample_restaurante.ID
        ).all()
        
        assert len(avaliacoes) >= 3