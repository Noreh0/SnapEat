from sql_alchemy import banco
from models.prato import pratoModel
from models.usuario import UsuarioModel
from datetime import datetime

class avaliacaoPratoModel(banco.Model):
    __tablename__ = 'avaliacaoprato'

    ID = banco.Column(banco.Integer, primary_key=True)
    Comentario = banco.Column(banco.String(), nullable=False)
    Nota = banco.Column(banco.Integer, nullable=False)
    ID_Cliente = banco.Column(
        banco.Integer,
        banco.ForeignKey('cliente.ID'),
        nullable=False
    )
    cliente = banco.relationship('UsuarioModel', 
                                foreign_keys=[ID_Cliente],
                                primaryjoin='avaliacaoPratoModel.ID_Cliente == UsuarioModel.ID')
    ID_Prato = banco.Column(
        banco.Integer,
        banco.ForeignKey('prato.ID'),
        nullable=False
    )
    # Colunas existentes no banco
    created_at = banco.Column(
        banco.DateTime,
        default=datetime.utcnow,
        nullable=True  # Permitir NULL para compatibilidade
    )
    updated_at = banco.Column(
        banco.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=True  # Permitir NULL para compatibilidade
    )
    # TODO: Adicionar essas colunas ao banco depois
    # imagens_urls = banco.Column(banco.JSON, nullable=True, default=list)
    # tem_imagens = banco.Column(banco.Boolean, default=False)

    def __init__(self, Comentario, Nota, ID_Cliente, ID_Prato, created_at=None, updated_at=None):
        self.Comentario = Comentario
        self.Nota = Nota
        self.ID_Cliente = ID_Cliente
        self.ID_Prato = ID_Prato
        self.created_at = created_at or datetime.utcnow()
        self.updated_at = updated_at or datetime.utcnow()
        # TODO: Temporariamente removido até colunas serem adicionadas ao banco
        # self.imagens_urls = imagens_urls or []
        # self.tem_imagens = bool(imagens_urls)

    def json(self):
        # TODO: Temporariamente sem suporte a imagens até colunas serem adicionadas
        imagens = []  # Vazio até implementar no banco
        tem_imagens_real = False  # Sempre false até implementar no banco
        
        return {
            "ID": self.ID,
            "Comentario": self.Comentario,
            "Nota": self.Nota,
            "ID_Cliente": self.ID_Cliente,
            "Nome_Cliente": self.cliente.Nome if self.cliente else None, 
            "ID_Prato": self.ID_Prato,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "imagens_urls": imagens,
            "tem_imagens": tem_imagens_real
        }

    def save(self):
        banco.session.add(self)
        banco.session.commit()

    @classmethod
    def find_all(cls):
        return [a.json() for a in cls.query.all()]

    @classmethod
    def find_by_id(cls, ID):
        aval = cls.query.get(ID)
        return aval.json() if aval else None

    @classmethod
    def find_by_cliente(cls, cliente_id):
        return [a.json() for a in cls.query.filter_by(ID_Cliente=cliente_id).all()]

    @classmethod
    def find_by_prato(cls, prato_id):
        """Lista avaliações de um prato, mais recentes primeiro"""
        avaliacoes = cls.query.filter_by(ID_Prato=prato_id).order_by(cls.created_at.desc()).all()
        
        print(f"\n🔍 find_by_prato({prato_id}) - {len(avaliacoes)} avaliações encontradas")
        
        resultado = []
        for aval in avaliacoes:
            json_data = aval.json()
            print(f"   ID {json_data['ID']}: tem_imagens={json_data['tem_imagens']}, total={len(json_data['imagens_urls'])}")
            resultado.append(json_data)
        
        return resultado

    @classmethod
    def find_by_prato_name(cls, nome):
        return [
            a.json()
            for a in cls.query
                .join(pratoModel, cls.ID_Prato == pratoModel.ID)
                .filter(pratoModel.Nome.ilike(f"%{nome}%"))
                .all()
        ]

    @classmethod
    def update(cls, ID, **dados):
        aval = cls.query.get(ID)
        if not aval:
            return None
        for key, val in dados.items():
            if val is not None and hasattr(aval, key):
                # Skip campos que não existem no banco
                if key not in ['imagens_urls', 'tem_imagens']:
                    setattr(aval, key, val)
        
        # Atualizar updated_at automaticamente
        if hasattr(aval, 'updated_at'):
            aval.updated_at = datetime.utcnow()
        banco.session.commit()
        return aval

    @classmethod
    def delete(cls, ID):
        aval = cls.query.get(ID)
        if not aval:
            return False
        banco.session.delete(aval)
        banco.session.commit()
        return True