# -*- coding: utf-8 -*-
"""
📚 Modelos de Documentação API - SnapEats
==========================================

Este módulo define todos os schemas/modelos utilizados na documentação OpenAPI
da API SnapEats. Cada modelo inclui validações, exemplos e descrições detalhadas.

Autor: SnapEats Development Team
Versão: 2.0.1
Data: Novembro 2025
"""

from flask_restx import fields

def create_api_models(api):
    """
    Cria e retorna todos os modelos de documentação da API
    
    Args:
        api: Instância do Flask-RESTX Api
        
    Returns:
        dict: Dicionário com todos os modelos organizados por categoria
    """
    
    # =============================================================================
    # 🔐 MODELOS DE AUTENTICAÇÃO
    # =============================================================================
    
    login_model = api.model('Login', {
        'email': fields.String(
            required=True,
            description='Email do usuário (cliente ou restaurante)',
            example='usuario@exemplo.com',
            pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        ),
        'senha': fields.String(
            required=True,
            description='Senha do usuário (mínimo 6 caracteres)',
            example='MinhaSenh@123',
            min_length=6,
            max_length=100
        )
    })
    
    token_response = api.model('TokenResponse', {
        'access_token': fields.String(
            required=True,
            description='Token JWT para autenticação',
            example='eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMiLCJ0aXBvIjoiY2xpZW50ZSIsImV4cCI6MTYzOTU5MTIwMH0.example'
        ),
        'tipo': fields.String(
            required=True,
            description='Tipo do usuário logado',
            example='cliente',
            enum=['cliente', 'restaurante']
        ),
        'id': fields.Integer(
            required=True,
            description='ID do usuário no sistema',
            example=123
        ),
        'nome': fields.String(
            required=True,
            description='Nome completo do usuário',
            example='João Silva'
        )
    })
    
    # =============================================================================
    # 👥 MODELOS DE USUÁRIO/CLIENTE
    # =============================================================================
    
    cliente_create = api.model('ClienteCreate', {
        'Nome': fields.String(
            required=True,
            description='Nome completo do cliente',
            example='João Silva Santos',
            min_length=2,
            max_length=100
        ),
        'CPF': fields.String(
            required=True,
            description='CPF do cliente (somente números)',
            example='12345678901',
            pattern=r'^\d{11}$'
        ),
        'email': fields.String(
            required=True,
            description='Email único do cliente',
            example='joao.silva@email.com',
            pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        ),
        'senha': fields.String(
            required=True,
            description='Senha do cliente (mínimo 6 caracteres)',
            example='SenhaSegur@123',
            min_length=6,
            max_length=100
        ),
        'telefone': fields.String(
            required=True,
            description='Telefone do cliente (com DDD)',
            example='(11)99999-9999',
            pattern=r'^\(\d{2}\)\d{4,5}-\d{4}$'
        ),
        'Cidade': fields.String(
            required=True,
            description='Cidade de residência do cliente',
            example='São Paulo',
            min_length=2,
            max_length=50
        )
    })
    
    cliente_response = api.model('ClienteResponse', {
        'ID': fields.Integer(
            required=True,
            description='ID único do cliente',
            example=1
        ),
        'Nome': fields.String(
            required=True,
            description='Nome completo do cliente',
            example='João Silva Santos'
        ),
        'email': fields.String(
            required=True,
            description='Email do cliente',
            example='joao.silva@email.com'
        ),
        'telefone': fields.String(
            required=True,
            description='Telefone do cliente',
            example='(11)99999-9999'
        ),
        'Cidade': fields.String(
            required=True,
            description='Cidade do cliente',
            example='São Paulo'
        ),
        'pontos_acumulados': fields.Integer(
            description='Pontos de fidelidade acumulados',
            example=250
        ),
        'data_cadastro': fields.DateTime(
            description='Data e hora do cadastro',
            example='2024-01-15T10:30:00Z'
        )
    })
    
    # =============================================================================
    # 🏪 MODELOS DE RESTAURANTE
    # =============================================================================
    
    restaurante_create = api.model('RestauranteCreate', {
        'Nome': fields.String(
            required=True,
            description='Nome fantasia do restaurante',
            example='Pizzaria Bella Vista',
            min_length=2,
            max_length=100
        ),
        'CNPJ': fields.String(
            required=True,
            description='CNPJ do restaurante (somente números)',
            example='12345678000195',
            pattern=r'^\d{14}$'
        ),
        'email': fields.String(
            required=True,
            description='Email único do restaurante',
            example='contato@pizzariabella.com',
            pattern=r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
        ),
        'senha': fields.String(
            required=True,
            description='Senha do restaurante',
            example='RestauranteSenha@123',
            min_length=6,
            max_length=100
        ),
        'telefone': fields.String(
            required=True,
            description='Telefone comercial do restaurante',
            example='(11)3333-4444',
            pattern=r'^\(\d{2}\)\d{4,5}-\d{4}$'
        ),
        'Endereco': fields.String(
            required=True,
            description='Endereço completo do restaurante',
            example='Rua das Flores, 123 - Centro',
            min_length=10,
            max_length=200
        ),
        'Cidade': fields.String(
            required=True,
            description='Cidade onde o restaurante está localizado',
            example='São Paulo',
            min_length=2,
            max_length=50
        ),
        'tipo_restaurante': fields.String(
            required=True,
            description='Categoria/tipo do restaurante',
            example='Pizzaria',
            enum=['Pizzaria', 'Hamburguer', 'Japonês', 'Italiano', 'Brasileiro', 'Chinês', 'Mexicano', 'Vegetariano', 'Árabe', 'Outros']
        ),
        'descricao': fields.String(
            required=True,
            description='Descrição detalhada do restaurante',
            example='Pizzaria tradicional com mais de 20 anos de experiência, especializada em massas artesanais e ingredientes frescos.',
            min_length=20,
            max_length=500
        ),
        'latitude': fields.Float(
            description='Latitude da localização do restaurante',
            example=-23.5505,
            min=-90,
            max=90
        ),
        'longitude': fields.Float(
            description='Longitude da localização do restaurante', 
            example=-46.6333,
            min=-180,
            max=180
        )
    })
    
    restaurante_response = api.model('RestauranteResponse', {
        'ID': fields.Integer(
            required=True,
            description='ID único do restaurante',
            example=1
        ),
        'Nome': fields.String(
            required=True,
            description='Nome fantasia do restaurante',
            example='Pizzaria Bella Vista'
        ),
        'email': fields.String(
            required=True,
            description='Email do restaurante',
            example='contato@pizzariabella.com'
        ),
        'tipo_restaurante': fields.String(
            required=True,
            description='Categoria do restaurante',
            example='Pizzaria'
        ),
        'descricao': fields.String(
            required=True,
            description='Descrição do restaurante',
            example='Pizzaria tradicional com mais de 20 anos...'
        ),
        'Endereco': fields.String(
            required=True,
            description='Endereço completo',
            example='Rua das Flores, 123 - Centro'
        ),
        'Cidade': fields.String(
            required=True,
            description='Cidade',
            example='São Paulo'
        ),
        'telefone': fields.String(
            required=True,
            description='Telefone comercial',
            example='(11)3333-4444'
        ),
        'NotaMedia': fields.Float(
            description='Nota média das avaliações (1-5)',
            example=4.3,
            min=1.0,
            max=5.0
        ),
        'totalAvaliacoes': fields.Integer(
            description='Total de avaliações recebidas',
            example=127
        ),
        'imagem_url': fields.String(
            description='URL da imagem do restaurante',
            example='/uploads/restaurante_1_banner.jpg'
        ),
        'tags_conquistadas': fields.List(
            fields.String,
            description='Tags/badges conquistadas pelo restaurante',
            example=['Comida Excelente', 'Atendimento Premium']
        ),
        'data_cadastro': fields.DateTime(
            description='Data e hora do cadastro',
            example='2024-01-10T08:15:00Z'
        )
    })
    
    # =============================================================================
    # ⭐ MODELOS DE AVALIAÇÃO
    # =============================================================================
    
    avaliacao_create = api.model('AvaliacaoCreate', {
        'Comentario': fields.String(
            required=True,
            description='Comentário detalhado sobre a experiência',
            example='Excelente atendimento e pizza deliciosa! Massa fininha e ingredientes frescos. Recomendo!',
            min_length=10,
            max_length=1000
        ),
        'Nota': fields.Integer(
            required=True,
            description='Nota de 1 (péssimo) a 5 (excelente)',
            example=5,
            min=1,
            max=5
        ),
        'ID_Restaurante': fields.Integer(
            required=True,
            description='ID do restaurante avaliado',
            example=1
        ),
        'tags_avaliadas': fields.List(
            fields.Integer,
            description='IDs das tags avaliadas (comida, atendimento, ambiente)',
            example=[1, 2, 3]
        )
    })
    
    avaliacao_response = api.model('AvaliacaoResponse', {
        'ID': fields.Integer(
            required=True,
            description='ID único da avaliação',
            example=1
        ),
        'Comentario': fields.String(
            required=True,
            description='Comentário da avaliação',
            example='Excelente atendimento e pizza deliciosa!'
        ),
        'Nota': fields.Integer(
            required=True,
            description='Nota atribuída (1-5)',
            example=5
        ),
        'ID_Cliente': fields.Integer(
            required=True,
            description='ID do cliente que fez a avaliação',
            example=1
        ),
        'ID_Restaurante': fields.Integer(
            required=True,
            description='ID do restaurante avaliado',
            example=1
        ),
        'clienteNome': fields.String(
            description='Nome do cliente que avaliou',
            example='João Silva'
        ),
        'restauranteNome': fields.String(
            description='Nome do restaurante avaliado',
            example='Pizzaria Bella Vista'
        ),
        'data_avaliacao': fields.DateTime(
            description='Data e hora da avaliação',
            example='2024-01-20T19:30:00Z'
        ),
        'sentimento_auto': fields.String(
            description='Sentimento detectado automaticamente via IA',
            example='positivo',
            enum=['positivo', 'neutro', 'negativo']
        ),
        'tags_avaliadas': fields.List(
            fields.String,
            description='Tags avaliadas nesta avaliação',
            example=['Comida', 'Atendimento']
        )
    })
    
    # =============================================================================
    # 🍕 MODELOS DE PRATO
    # =============================================================================
    
    prato_create = api.model('PratoCreate', {
        'nome': fields.String(
            required=True,
            description='Nome do prato',
            example='Pizza Margherita',
            min_length=2,
            max_length=100
        ),
        'descricao': fields.String(
            required=True,
            description='Descrição detalhada do prato',
            example='Pizza tradicional com molho de tomate, mussarela, manjericão fresco e azeite extra virgem',
            min_length=10,
            max_length=500
        ),
        'preco': fields.Float(
            required=True,
            description='Preço do prato em reais',
            example=35.90,
            min=0.01
        ),
        'categoria': fields.String(
            required=True,
            description='Categoria do prato',
            example='Pizza',
            enum=['Entrada', 'Prato Principal', 'Sobremesa', 'Bebida', 'Pizza', 'Hamburguer', 'Salada', 'Outros']
        ),
        'disponivel': fields.Boolean(
            description='Se o prato está disponível no cardápio',
            example=True,
            default=True
        )
    })
    
    prato_response = api.model('PratoResponse', {
        'id': fields.Integer(
            required=True,
            description='ID único do prato',
            example=1
        ),
        'nome': fields.String(
            required=True,
            description='Nome do prato',
            example='Pizza Margherita'
        ),
        'descricao': fields.String(
            required=True,
            description='Descrição do prato',
            example='Pizza tradicional com molho de tomate...'
        ),
        'preco': fields.Float(
            required=True,
            description='Preço do prato',
            example=35.90
        ),
        'categoria': fields.String(
            required=True,
            description='Categoria do prato',
            example='Pizza'
        ),
        'disponivel': fields.Boolean(
            required=True,
            description='Disponibilidade do prato',
            example=True
        ),
        'id_restaurante': fields.Integer(
            required=True,
            description='ID do restaurante proprietário',
            example=1
        ),
        'imagem_url': fields.String(
            description='URL da imagem do prato',
            example='/uploads/prato_1_pizza_margherita.jpg'
        ),
        'nota_media': fields.Float(
            description='Nota média das avaliações do prato',
            example=4.7,
            min=1.0,
            max=5.0
        ),
        'total_avaliacoes': fields.Integer(
            description='Total de avaliações do prato',
            example=23
        ),
        'data_criacao': fields.DateTime(
            description='Data de criação do prato',
            example='2024-01-15T10:00:00Z'
        )
    })
    
    # =============================================================================
    # 🎟️ MODELOS DE CUPOM
    # =============================================================================
    
    cupom_create = api.model('CupomCreate', {
        'codigo': fields.String(
            required=True,
            description='Código único do cupom',
            example='PIZZA20OFF',
            min_length=3,
            max_length=20,
            pattern=r'^[A-Z0-9]+$'
        ),
        'descricao': fields.String(
            required=True,
            description='Descrição do cupom',
            example='20% de desconto em pizzas grandes',
            min_length=10,
            max_length=200
        ),
        'tipo_desconto': fields.String(
            required=True,
            description='Tipo de desconto aplicado',
            example='percentual',
            enum=['percentual', 'valor_fixo']
        ),
        'valor_desconto': fields.Float(
            required=True,
            description='Valor do desconto (% ou R$)',
            example=20.0,
            min=0.01
        ),
        'valor_minimo': fields.Float(
            description='Valor mínimo do pedido para usar o cupom',
            example=50.0,
            min=0.0
        ),
        'data_inicio': fields.Date(
            required=True,
            description='Data de início da validade',
            example='2024-01-20'
        ),
        'data_fim': fields.Date(
            required=True,
            description='Data de fim da validade',
            example='2024-02-20'
        ),
        'limite_uso': fields.Integer(
            description='Limite de usos do cupom (null = ilimitado)',
            example=100,
            min=1
        ),
        'ativo': fields.Boolean(
            description='Se o cupom está ativo',
            example=True,
            default=True
        )
    })
    
    cupom_response = api.model('CupomResponse', {
        'id': fields.Integer(
            required=True,
            description='ID único do cupom',
            example=1
        ),
        'codigo': fields.String(
            required=True,
            description='Código do cupom',
            example='PIZZA20OFF'
        ),
        'descricao': fields.String(
            required=True,
            description='Descrição do cupom',
            example='20% de desconto em pizzas grandes'
        ),
        'tipo_desconto': fields.String(
            required=True,
            description='Tipo de desconto',
            example='percentual'
        ),
        'valor_desconto': fields.Float(
            required=True,
            description='Valor do desconto',
            example=20.0
        ),
        'valor_minimo': fields.Float(
            description='Valor mínimo do pedido',
            example=50.0
        ),
        'data_inicio': fields.Date(
            required=True,
            description='Data de início',
            example='2024-01-20'
        ),
        'data_fim': fields.Date(
            required=True,
            description='Data de fim',
            example='2024-02-20'
        ),
        'limite_uso': fields.Integer(
            description='Limite de usos',
            example=100
        ),
        'usos_atual': fields.Integer(
            description='Quantidade já utilizada',
            example=15
        ),
        'ativo': fields.Boolean(
            required=True,
            description='Status do cupom',
            example=True
        ),
        'id_restaurante': fields.Integer(
            required=True,
            description='ID do restaurante proprietário',
            example=1
        ),
        'data_criacao': fields.DateTime(
            description='Data de criação',
            example='2024-01-15T14:30:00Z'
        )
    })
    
    # =============================================================================
    # 📱 MODELOS DE RESPOSTA PADRÃO
    # =============================================================================
    
    success_response = api.model('SuccessResponse', {
        'message': fields.String(
            required=True,
            description='Mensagem de sucesso',
            example='Operação realizada com sucesso'
        ),
        'data': fields.Raw(
            description='Dados retornados pela operação'
        )
    })
    
    error_response = api.model('ErrorResponse', {
        'message': fields.String(
            required=True,
            description='Mensagem de erro',
            example='Erro na validação dos dados'
        ),
        'errors': fields.Raw(
            description='Detalhes específicos do erro'
        ),
        'code': fields.Integer(
            description='Código de erro interno',
            example=4001
        )
    })
    
    # =============================================================================
    # 📊 MODELOS DE MÉTRICAS E DASHBOARD
    # =============================================================================
    
    metricas_response = api.model('MetricasResponse', {
        'total_avaliacoes': fields.Integer(
            description='Total de avaliações do restaurante',
            example=127
        ),
        'nota_media': fields.Float(
            description='Nota média das avaliações',
            example=4.3
        ),
        'avaliacoes_mes': fields.Integer(
            description='Avaliações do mês atual',
            example=23
        ),
        'sentimento_positivo': fields.Integer(
            description='Número de avaliações com sentimento positivo',
            example=95
        ),
        'sentimento_neutro': fields.Integer(
            description='Número de avaliações com sentimento neutro',
            example=20
        ),
        'sentimento_negativo': fields.Integer(
            description='Número de avaliações com sentimento negativo',
            example=12
        ),
        'distribuicao_notas': fields.Raw(
            description='Distribuição das notas (1-5)',
            example={'1': 2, '2': 5, '3': 15, '4': 35, '5': 70}
        )
    })
    
    # Retornar todos os modelos organizados
    return {
        'auth': {
            'login_model': login_model,
            'token_response': token_response
        },
        'cliente': {
            'create': cliente_create,
            'response': cliente_response
        },
        'restaurante': {
            'create': restaurante_create,
            'response': restaurante_response
        },
        'avaliacao': {
            'create': avaliacao_create,
            'response': avaliacao_response
        },
        'prato': {
            'create': prato_create,
            'response': prato_response
        },
        'cupom': {
            'create': cupom_create,
            'response': cupom_response
        },
        'common': {
            'success': success_response,
            'error': error_response,
            'metricas': metricas_response
        }
    }