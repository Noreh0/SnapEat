import pytest
from models.denuncia import denunciaModel

@pytest.fixture
def sample_avaliacao(session, sample_restaurante, sample_usuario):
    """Cria uma avaliação de exemplo para ser denunciada."""
    from models.avaliacao import avaliacaoModel
    avaliacao = avaliacaoModel(
        ID_Restaurante=sample_restaurante.ID,
        ID_Cliente=sample_usuario.ID,
        Comentario="Esta é uma avaliação para teste de denúncia.",
        Nota=3,
        visivel=True
    )
    session.add(avaliacao)
    session.commit()
    return avaliacao

@pytest.mark.integration
class TestDenunciaAPI:
    """Testes para a API de Denúncias."""

    def test_criar_denuncia_success(self, client, auth_headers, sample_avaliacao, sample_usuario):
        """Testa a criação de uma denúncia com sucesso."""
        data = {
            "motivo": "Conteúdo impróprio",
            "descricao": "A avaliação contém palavras ofensivas."
        }
        response = client.post(
            f'/denuncia/avaliacao/{sample_avaliacao.ID}',
            json=data,
            headers=auth_headers
        )
        assert response.status_code == 201
        assert response.json['message'] == "Denúncia registrada com sucesso."

        # Verifica se a denúncia foi salva no banco
        denuncia = denunciaModel.query.filter_by(ID_Avaliacao=sample_avaliacao.ID).first()
        assert denuncia is not None
        assert denuncia.motivo == "Conteúdo impróprio"
        assert denuncia.ID_Cliente == sample_usuario.ID

    def test_criar_denuncia_sem_autenticacao(self, client, sample_avaliacao):
        """Testa criar uma denúncia sem estar autenticado."""
        data = {"motivo": "Spam"}
        response = client.post(
            f'/denuncia/avaliacao/{sample_avaliacao.ID}',
            json=data
        )
        assert response.status_code == 401

    def test_criar_denuncia_avaliacao_inexistente(self, client, auth_headers):
        """Testa criar uma denúncia para uma avaliação que não existe."""
        data = {"motivo": "Não existe"}
        response = client.post(
            '/denuncia/avaliacao/99999',
            json=data,
            headers=auth_headers
        )
        assert response.status_code == 404
        assert response.json['message'] == "Avaliação não encontrada."

    def test_criar_denuncia_dados_invalidos(self, client, auth_headers, sample_avaliacao):
        """Testa criar uma denúncia com dados faltando (motivo é obrigatório)."""
        data = {"descricao": "Falta o motivo"}
        response = client.post(
            f'/denuncia/avaliacao/{sample_avaliacao.ID}',
            json=data,
            headers=auth_headers
        )
        assert response.status_code == 400
        assert 'motivo' in response.json['message']

    def test_listar_denuncias_requer_admin(self, client, auth_headers):
        """Testa que apenas administradores (ou usuários com permissão) podem listar denúncias."""
        # Este teste assume que um usuário comum não tem permissão.
        # A rota pode não existir ou retornar 403/401 para não-admins.
        response = client.get('/denuncias', headers=auth_headers)
        assert response.status_code in [401, 403, 404] # Depende da implementação do controle de acesso