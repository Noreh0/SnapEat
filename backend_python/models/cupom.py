from sql_alchemy import banco
from datetime import datetime, timedelta

class cupomModel(banco.Model):
    __tablename__ = 'cupom'

    ID = banco.Column(banco.Integer, primary_key=True)
    codigo = banco.Column(banco.String(20), unique=True, nullable=False)
    titulo = banco.Column(banco.String(100), nullable=False)
    descricao = banco.Column(banco.Text)
    desconto_percentual = banco.Column(banco.Float)  # Desconto em %
    desconto_valor = banco.Column(banco.Float)  # Desconto em valor fixo
    valor_minimo = banco.Column(banco.Float, default=0)  # Valor mínimo para usar o cupom
    pontos_necessarios = banco.Column(banco.Integer, nullable=False, default=100)
    restaurante_id = banco.Column(
        banco.Integer,
        banco.ForeignKey('restaurante.ID'),
        nullable=False
    )
    data_validade = banco.Column(banco.DateTime, nullable=False)
    ativo = banco.Column(banco.Boolean, default=True)
    max_usos = banco.Column(banco.Integer, default=1)  # Quantas vezes pode ser usado
    usos_restantes = banco.Column(banco.Integer, default=1)
    created_at = banco.Column(banco.DateTime, default=datetime.utcnow)
    updated_at = banco.Column(banco.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __init__(self, codigo, titulo, descricao, pontos_necessarios, restaurante_id, 
                 data_validade, desconto_percentual=None, desconto_valor=None, 
                 valor_minimo=0, max_usos=1, ativo=True):
        self.codigo = codigo
        self.titulo = titulo
        self.descricao = descricao
        self.desconto_percentual = desconto_percentual
        self.desconto_valor = desconto_valor
        self.valor_minimo = valor_minimo
        self.pontos_necessarios = pontos_necessarios
        self.restaurante_id = restaurante_id
        self.data_validade = data_validade
        self.ativo = ativo
        self.max_usos = max_usos
        self.usos_restantes = max_usos

    def json(self):
        return {
            "ID": self.ID,
            "codigo": self.codigo,
            "titulo": self.titulo,
            "descricao": self.descricao,
            "desconto_percentual": self.desconto_percentual,
            "desconto_valor": self.desconto_valor,
            "valor_minimo": self.valor_minimo,
            "pontos_necessarios": self.pontos_necessarios,
            "restaurante_id": self.restaurante_id,
            "data_validade": self.data_validade.isoformat() if self.data_validade else None,
            "ativo": self.ativo,
            "max_usos": self.max_usos,
            "usos_restantes": self.usos_restantes,
            "expirado": self.data_validade < datetime.utcnow() if self.data_validade else True,
            "disponivel": self.ativo and self.usos_restantes > 0 and (self.data_validade > datetime.utcnow() if self.data_validade else False),
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def save(self):
        banco.session.add(self)
        banco.session.commit()

    @classmethod
    def find_all(cls):
        return [c.json() for c in cls.query.all()]

    @classmethod
    def find_by_id(cls, ID):
        cupom = cls.query.get(ID)
        return cupom.json() if cupom else None

    @classmethod
    def find_by_codigo(cls, codigo):
        cupom = cls.query.filter_by(codigo=codigo).first()
        return cupom.json() if cupom else None

    @classmethod
    def find_by_restaurante(cls, restaurante_id):
        cupons = cls.query.filter_by(restaurante_id=restaurante_id, ativo=True).all()
        return [c.json() for c in cupons]

    @classmethod
    def find_disponivel_por_pontos(cls, restaurante_id, pontos_usuario):
        """Busca cupons disponíveis que o usuário pode resgatar"""
        cupons = cls.query.filter(
            cls.restaurante_id == restaurante_id,
            cls.ativo == True,
            cls.pontos_necessarios <= pontos_usuario,
            cls.usos_restantes > 0,
            cls.data_validade > datetime.utcnow()
        ).order_by(cls.pontos_necessarios.asc()).all()
        
        return [c.json() for c in cupons]

    @classmethod
    def update(cls, ID, **dados):
        cupom = cls.query.get(ID)
        if not cupom:
            return None
        
        for key, val in dados.items():
            if hasattr(cupom, key) and val is not None:
                setattr(cupom, key, val)
        
        cupom.updated_at = datetime.utcnow()
        banco.session.commit()
        return cupom

    @classmethod
    def delete(cls, ID):
        cupom = cls.query.get(ID)
        if not cupom:
            return False
        banco.session.delete(cupom)
        banco.session.commit()
        return True

    @classmethod
    def usar_cupom(cls, cupom_id):
        """Usa o cupom, decrementando usos restantes"""
        cupom = cls.query.get(cupom_id)
        if not cupom or cupom.usos_restantes <= 0:
            return False
        
        cupom.usos_restantes -= 1
        if cupom.usos_restantes <= 0:
            cupom.ativo = False
        
        banco.session.commit()
        return True

    @classmethod
    def gerar_codigo_unico(cls):
        """Gera um código único para o cupom"""
        import random
        import string
        
        while True:
            codigo = 'SNAP' + ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
            if not cls.query.filter_by(codigo=codigo).first():
                return codigo