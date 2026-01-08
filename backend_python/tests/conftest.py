# tests/conftest.py
import pytest
import sys
import os

# Adicionar o diretório raiz ao path para encontrar os módulos
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from main import app as flask_app
from sql_alchemy import banco
from models.restaurante import restauranteModel
from models.tag_restaurante import TagRestauranteModel
from models.usuario import UsuarioModel

@pytest.fixture(scope='session')
def app():
    """Cria e configura uma instância da aplicação Flask para toda a sessão de testes."""
    flask_app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",  # Usa um banco de dados em memória
        "JWT_SECRET_KEY": "test-secret-key",
        "WTF_CSRF_ENABLED": False,
        "PRESERVE_CONTEXT_ON_EXCEPTION": False,
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
    })

    with flask_app.app_context():
        banco.create_all()  # Cria as tabelas no banco em memória
        yield flask_app
        banco.drop_all()    # Limpa ao final de tudo

@pytest.fixture(scope='function')
def client(app):
    """Fornece um cliente de teste para fazer requisições à aplicação."""
    return app.test_client()

@pytest.fixture(scope='function')
def session(app):
    """
    Cria uma sessão de banco de dados isolada para cada teste.
    Usa uma transação que é revertida (rollback) após cada teste.
    """
    with app.app_context():
        connection = banco.engine.connect()
        transaction = connection.begin()
        
        session = banco.create_scoped_session(options={"bind": connection, "binds": {}})
        banco.session = session

        yield session

        session.remove()
        transaction.rollback()
        connection.close()

# --- Fixtures de Dados de Exemplo ---

@pytest.fixture
def sample_usuario(session):
    """Cria um usuário de exemplo e o insere na sessão de teste."""
    usuario = UsuarioModel(
        Nome="Cliente Teste",
        email="cliente@teste.com",
        telefone="11988888888",
        Cidade="São Paulo"
    )
    usuario.set_password("senha123") # Assumindo que você tem um método para hashear a senha
    session.add(usuario)
    session.commit()
    return usuario

@pytest.fixture
def sample_restaurante(session):
    """Cria um restaurante de exemplo."""
    restaurante = restauranteModel(
        Nome="Restaurante Teste",
        nome_fantasia="Teste Ltda",
        CNPJ="12345678901234",
        email="teste@restaurante.com",
        senha="senha123",
        telefone="11999999999",
        Endereco="Rua Teste, 123",
        Cidade="São Paulo",
        latitude=-23.550520,
        longitude=-46.633308,
        bairro="Centro",
        tipo_restaurante="Italiano",
        descricao="Restaurante de teste"
    )
    session.add(restaurante)
    session.commit()
    return restaurante

@pytest.fixture
def auth_headers(client, sample_usuario):
    """Gera um token de autenticação para um usuário de teste."""
    # O endpoint de login precisa ser o correto
    response = client.post('/auth/login_usuario', json={
        'email': sample_usuario.email,
        'senha': 'senha123'
    })
    
    if response.status_code != 200:
        pytest.fail(f"Falha ao autenticar usuário de teste. Rota: /auth/login_usuario, Status: {response.status_code}, Resposta: {response.data}")

    token = response.json.get('access_token')
    return {'Authorization': f'Bearer {token}'}