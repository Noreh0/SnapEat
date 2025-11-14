from sql_alchemy import banco
from datetime import datetime

class pontosUsuarioModel(banco.Model):
    __tablename__ = 'pontosusuario'

    ID = banco.Column(banco.Integer, primary_key=True)
    cliente_id = banco.Column(
        banco.Integer,
        banco.ForeignKey('cliente.ID'),
        nullable=False
    )
    restaurante_id = banco.Column(
        banco.Integer,
        banco.ForeignKey('restaurante.ID'),
        nullable=False
    )
    pontos_totais = banco.Column(banco.Integer, default=0)
    pontos_utilizados = banco.Column(banco.Integer, default=0)
    pontos_disponiveis = banco.Column(banco.Integer, default=0)
    created_at = banco.Column(banco.DateTime, default=datetime.utcnow)
    updated_at = banco.Column(banco.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos com primaryjoin explícito
    cliente = banco.relationship('UsuarioModel', 
                                foreign_keys=[cliente_id],
                                primaryjoin='pontosUsuarioModel.cliente_id == UsuarioModel.ID')
    restaurante = banco.relationship('restauranteModel', 
                                    foreign_keys=[restaurante_id],
                                    primaryjoin='pontosUsuarioModel.restaurante_id == restauranteModel.ID')

    def __init__(self, cliente_id, restaurante_id, pontos_totais=0):
        self.cliente_id = cliente_id
        self.restaurante_id = restaurante_id
        self.pontos_totais = pontos_totais
        self.pontos_utilizados = 0
        self.pontos_disponiveis = pontos_totais

    def json(self):
        return {
            "ID": self.ID,
            "cliente_id": self.cliente_id,
            "restaurante_id": self.restaurante_id,
            "pontos_totais": self.pontos_totais,
            "pontos_utilizados": self.pontos_utilizados,
            "pontos_disponiveis": self.pontos_disponiveis,
            "cliente_nome": self.cliente.Nome if self.cliente else None,
            "restaurante_nome": self.restaurante.Nome if self.restaurante else None,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None
        }

    def save(self):
        banco.session.add(self)
        banco.session.commit()

    @classmethod
    def find_or_create(cls, cliente_id, restaurante_id):
        """Busca ou cria registro de pontos para cliente/restaurante"""
        pontos = cls.query.filter_by(
            cliente_id=cliente_id, 
            restaurante_id=restaurante_id
        ).first()
        
        if not pontos:
            pontos = cls(cliente_id=cliente_id, restaurante_id=restaurante_id)
            pontos.save()
        
        return pontos

    @classmethod
    def adicionar_pontos(cls, cliente_id, restaurante_id, pontos_ganhos, motivo="avaliacao"):
        """Adiciona pontos ao cliente para um restaurante específico"""
        registro = cls.find_or_create(cliente_id, restaurante_id)
        
        registro.pontos_totais += pontos_ganhos
        registro.pontos_disponiveis += pontos_ganhos
        registro.updated_at = datetime.utcnow()
        
        banco.session.commit()
        
        # Registrar histórico
        historicoModel.registrar_movimento(
            cliente_id=cliente_id,
            restaurante_id=restaurante_id,
            tipo='ganho',
            pontos=pontos_ganhos,
            motivo=motivo
        )
        
        return registro

    @classmethod
    def usar_pontos(cls, cliente_id, restaurante_id, pontos_usados, motivo="resgate_cupom", cupom_id=None):
        """Usa pontos do cliente"""
        registro = cls.find_or_create(cliente_id, restaurante_id)
        
        if registro.pontos_disponiveis < pontos_usados:
            return False, "Pontos insuficientes"
        
        registro.pontos_utilizados += pontos_usados
        registro.pontos_disponiveis -= pontos_usados
        registro.updated_at = datetime.utcnow()
        
        banco.session.commit()
        
        # Registrar histórico (agora com cupom_id)
        historicoModel.registrar_movimento(
            cliente_id=cliente_id,
            restaurante_id=restaurante_id,
            tipo='uso',
            pontos=pontos_usados,
            motivo=motivo,
            cupom_id=cupom_id
        )
        
        return True, registro

    @classmethod
    def get_pontos_cliente(cls, cliente_id, restaurante_id):
        """Retorna pontos disponíveis do cliente para um restaurante"""
        registro = cls.query.filter_by(
            cliente_id=cliente_id,
            restaurante_id=restaurante_id
        ).first()
        
        return registro.pontos_disponiveis if registro else 0

    @classmethod
    def get_ranking_clientes(cls, restaurante_id, limit=10):
        """Retorna ranking de clientes por pontos em um restaurante"""
        return cls.query.filter_by(restaurante_id=restaurante_id)\
                       .order_by(cls.pontos_totais.desc())\
                       .limit(limit).all()


class historicoModel(banco.Model):
    __tablename__ = 'historicopontos'

    ID = banco.Column(banco.Integer, primary_key=True)
    cliente_id = banco.Column(
        banco.Integer,
        banco.ForeignKey('cliente.ID'),
        nullable=False
    )
    restaurante_id = banco.Column(
        banco.Integer,
        banco.ForeignKey('restaurante.ID'),
        nullable=False
    )
    tipo = banco.Column(banco.String(20), nullable=False)  # 'ganho' ou 'uso'
    pontos = banco.Column(banco.Integer, nullable=False)
    motivo = banco.Column(banco.String(100))
    avaliacao_id = banco.Column(banco.Integer)  # Referência opcional à avaliação
    cupom_id = banco.Column(banco.Integer)  # Referência opcional ao cupom usado
    data_movimento = banco.Column(banco.DateTime, default=datetime.utcnow)

    def __init__(self, cliente_id, restaurante_id, tipo, pontos, motivo=None, 
                 avaliacao_id=None, cupom_id=None):
        self.cliente_id = cliente_id
        self.restaurante_id = restaurante_id
        self.tipo = tipo
        self.pontos = pontos
        self.motivo = motivo
        self.avaliacao_id = avaliacao_id
        self.cupom_id = cupom_id

    def json(self):
        return {
            "ID": self.ID,
            "cliente_id": self.cliente_id,
            "restaurante_id": self.restaurante_id,
            "tipo": self.tipo,
            "pontos": self.pontos,
            "motivo": self.motivo,
            "avaliacao_id": self.avaliacao_id,
            "cupom_id": self.cupom_id,
            "data_movimento": self.data_movimento.isoformat() if self.data_movimento else None
        }

    def save(self):
        banco.session.add(self)
        banco.session.commit()

    @classmethod
    def registrar_movimento(cls, cliente_id, restaurante_id, tipo, pontos, motivo, 
                          avaliacao_id=None, cupom_id=None):
        """Registra um movimento no histórico de pontos"""
        movimento = cls(
            cliente_id=cliente_id,
            restaurante_id=restaurante_id,
            tipo=tipo,
            pontos=pontos,
            motivo=motivo,
            avaliacao_id=avaliacao_id,
            cupom_id=cupom_id
        )
        movimento.save()
        return movimento

    @classmethod
    def get_historico_cliente(cls, cliente_id, restaurante_id, limit=50):
        """Retorna histórico de pontos de um cliente"""
        return [h.json() for h in cls.query.filter_by(
            cliente_id=cliente_id,
            restaurante_id=restaurante_id
        ).order_by(cls.data_movimento.desc()).limit(limit).all()]

    @classmethod
    def pode_ganhar_pontos_hoje(cls, cliente_id, restaurante_id, tipo_avaliacao):
        """
        Verifica se o cliente já ganhou pontos hoje por avaliação neste restaurante
        tipo_avaliacao: 'avaliacao' ou 'avaliacao_prato'
        """
        from datetime import date
        
        hoje = date.today()
        inicio_dia = datetime.combine(hoje, datetime.min.time())
        fim_dia = datetime.combine(hoje, datetime.max.time())
        
        # Buscar se já existe movimento de ganho de pontos hoje para este tipo
        movimento_hoje = cls.query.filter(
            cls.cliente_id == cliente_id,
            cls.restaurante_id == restaurante_id,
            cls.tipo == 'ganho',
            cls.motivo.like(f'{tipo_avaliacao}%'),
            cls.data_movimento >= inicio_dia,
            cls.data_movimento <= fim_dia
        ).first()
        
        return movimento_hoje is None

    @classmethod
    def conceder_pontos_avaliacao(cls, cliente_id, restaurante_id, pontos, tipo_avaliacao, avaliacao_id=None):
        """
        Concede pontos por avaliação, verificando se já ganhou hoje
        tipo_avaliacao: 'avaliacao' (20 pontos) ou 'avaliacao_prato' (10 pontos)
        """
        # Verificar se pode ganhar pontos hoje
        if not cls.pode_ganhar_pontos_hoje(cliente_id, restaurante_id, tipo_avaliacao):
            return False, "Você já ganhou pontos por avaliação hoje neste restaurante"
        
        # Adicionar pontos
        registro = pontosUsuarioModel.adicionar_pontos(
            cliente_id=cliente_id,
            restaurante_id=restaurante_id,
            pontos_ganhos=pontos,
            motivo=f"{tipo_avaliacao}_diaria"
        )
        
        # Registrar no histórico com referência à avaliação
        cls.registrar_movimento(
            cliente_id=cliente_id,
            restaurante_id=restaurante_id,
            tipo='ganho',
            pontos=pontos,
            motivo=f"{tipo_avaliacao}_diaria",
            avaliacao_id=avaliacao_id
        )
        
        print(f"✅ Pontos concedidos: {pontos} pontos para cliente {cliente_id} no restaurante {restaurante_id}")
        return True, registro