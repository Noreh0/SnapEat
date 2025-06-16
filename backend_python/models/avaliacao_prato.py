from sql_alchemy import banco
from models.prato import pratoModel  # para joins em search
from models.usuario import UsuarioModel

class avaliacaoPratoModel(banco.Model):
    __tablename__ = 'AvaliacaoPrato'

    ID = banco.Column(banco.Integer, primary_key=True)
    Comentario = banco.Column(banco.String(), nullable=False)
    Nota = banco.Column(banco.Integer, nullable=False)
    ID_Cliente = banco.Column(
        banco.Integer,
        banco.ForeignKey('Cliente.ID'),  # <-- troque 'Usuario.ID' por 'Cliente.ID'
        nullable=False
    )
    ID_Prato = banco.Column(
        banco.Integer,
        banco.ForeignKey('Prato.ID'),
        nullable=False
    )

    def __init__(self, Comentario, Nota, ID_Cliente, ID_Prato):
        self.Comentario = Comentario
        self.Nota = Nota
        self.ID_Cliente = ID_Cliente
        self.ID_Prato = ID_Prato

    def json(self):
        return {
            "ID": self.ID,
            "Comentario": self.Comentario,
            "Nota": self.Nota,
            "ID_Cliente": self.ID_Cliente,
            "ID_Prato": self.ID_Prato
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
        return [a.json() for a in cls.query.filter_by(ID_Prato=prato_id).all()]

    @classmethod
    def find_by_prato_name(cls, nome):
        # join com pratoModel para filtrar pelo nome do prato
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
            if hasattr(aval, key):
                setattr(aval, key, val)
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
