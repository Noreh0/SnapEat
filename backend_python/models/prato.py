from sql_alchemy import banco
from flask import jsonify

# ...existing code...
class pratoModel(banco.Model):
    __tablename__ = 'Prato'

    ID = banco.Column(banco.Integer, primary_key=True)
    Nome = banco.Column(banco.String(100), nullable=False)
    descricao = banco.Column(banco.String(255))
    preco = banco.Column(banco.Float, nullable=False)
    restaurante_id = banco.Column(
        banco.Integer,
        banco.ForeignKey('Restaurante.ID'),
        nullable=False
    )
    imagem_url = banco.Column(banco.String(255))  # <-- troque para imagem_url

    def __init__(self, Nome, descricao, preco, restaurante_id, imagem_url=None):
        self.Nome = Nome
        self.descricao = descricao
        self.preco = preco
        self.restaurante_id = restaurante_id
        self.imagem_url = imagem_url

    def json(self):
        return {
            "ID": self.ID,
            "Nome": self.Nome,
            "descricao": self.descricao,
            "preco": self.preco,
            "restaurante_id": self.restaurante_id,
            "imagem_url": self.imagem_url
        }
# ...existing code...

    def save_prato(self):
        banco.session.add(self)
        banco.session.commit()

    @classmethod
    def find_all(cls):
        return [p.json() for p in cls.query.all()]

    @classmethod
    def find_by_id(cls, ID):
        prato = cls.query.get(ID)
        return prato.json() if prato else None

    @classmethod
    def find_by_restaurante(cls, restaurante_id):
        pratos = cls.query.filter_by(restaurante_id=restaurante_id).all()
        return [p.json() for p in pratos]

    @classmethod
    def find_by_name(cls, Nome):
        pratos = cls.query.filter(cls.Nome.ilike(f"%{Nome}%")).all()
        return [p.json() for p in pratos]

    @classmethod
    def update_prato(cls, ID, **dados):
        prato = cls.query.get(ID)
        if not prato:
            return None
        for chave, valor in dados.items():
            if hasattr(prato, chave):
                setattr(prato, chave, valor)
        banco.session.commit()
        return prato

    @classmethod
    def delete_prato(cls, ID):
        prato = cls.query.get(ID)
        if not prato:
            return False
        banco.session.delete(prato)
        banco.session.commit()
        return True
