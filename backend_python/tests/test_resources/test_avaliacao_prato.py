# tests/resource/test_avaliacao_prato.py
import pytest
from models.prato import pratoModel
from models.avaliacao_prato import avaliacaoPratoModel

@pytest.fixture
def sample_prato(session, sample_restaurante):
    """Cria um prato de exemplo"""
    prato = pratoModel(
        restaurante_id=sample_restaurante.ID,
        nome="Prato Teste",
        descricao="Descrição do prato de teste.",
        preco=25.50,
        ativo=True
    )
    session.add(prato)
    session.commit()
    return prato

def test_get_avaliacoes_prato_success(client, session, sample_prato, sample_usuario):
    """Testa o GET em /pratos/{prato_id}/avaliacoes com sucesso"""
    # Adiciona uma avaliação para o prato
    avaliacao = avaliacaoPratoModel(
        prato_id=sample_prato.ID,
        usuario_id=sample_usuario.ID,
        nota=5,
        comentario="Excelente prato!"
    )
    session.add(avaliacao)
    session.commit()
    
    response = client.get(f'/pratos/{sample_prato.ID}/avaliacoes')

    assert response.status_code == 200
    assert len(response.json) == 1
    assert response.json[0]['nota'] == 5
    assert response.json[0]['comentario'] == "Excelente prato!"

def test_get_avaliacoes_prato_not_found(client):
    """Testa o GET em /pratos/{prato_id}/avaliacoes para um prato inexistente"""
    response = client.get('/pratos/999/avaliacoes')
    assert response.status_code == 404
    assert 'message' in response.json
    assert response.json['message'] == "Prato não encontrado."

def test_post_avaliacao_prato_success(client, auth_headers, sample_prato, sample_usuario):
    """Testa o POST em /pratos/{prato_id}/avaliacoes com sucesso"""
    data = {
        'nota': 4,
        'comentario': 'Muito bom, mas pode melhorar.'
    }
    response = client.post(
        f'/pratos/{sample_prato.ID}/avaliacoes',
        json=data,
        headers=auth_headers
    )

    assert response.status_code == 201
    assert 'id' in response.json
    assert response.json['nota'] == 4
    assert response.json['comentario'] == 'Muito bom, mas pode melhorar.'
    assert response.json['usuario_id'] == sample_usuario.ID

def test_post_avaliacao_prato_unauthorized(client, sample_prato):
    """Testa o POST em /pratos/{prato_id}/avaliacoes sem autenticação"""
    data = {
        'nota': 5,
        'comentario': 'Não vai funcionar.'
    }
    response = client.post(
        f'/pratos/{sample_prato.ID}/avaliacoes',
        json=data
    )
    assert response.status_code == 401

def test_post_avaliacao_prato_already_exists(client, auth_headers, sample_prato, sample_usuario):
    """Testa o POST em /pratos/{prato_id}/avaliacoes quando o usuário já avaliou"""
    # Primeira avaliação
    client.post(
        f'/pratos/{sample_prato.ID}/avaliacoes',
        json={'Nota': 5, 'Comentario': 'Primeira avaliação'},
        headers=auth_headers
    )

    # Segunda avaliação (deve falhar)
    data = {
        'Nota': 3,
        'Comentario': 'Tentando avaliar de novo.'
    }
    response = client.post(
        f'/pratos/{sample_prato.ID}/avaliacoes',
        json=data,
        headers=auth_headers
    )

    assert response.status_code == 400
    assert 'message' in response.json
    assert "Você já avaliou este prato." in response.json['message']

def test_post_avaliacao_prato_invalid_data(client, auth_headers, sample_prato):
    """Testa o POST em /pratos/{prato_id}/avaliacoes com dados inválidos"""
    data = {
        'Nota': 6,  # Nota inválida
        'Comentario': 'Comentário ok.'
    }
    response = client.post(
        f'/pratos/{sample_prato.ID}/avaliacoes',
        json=data,
        headers=auth_headers
    )
    assert response.status_code == 400
    assert 'errors' in response.json
    assert 'Nota' in response.json['errors']