from sql_alchemy import banco
from werkzeug.security import generate_password_hash, check_password_hash

class UsuarioModel(banco.Model):
    __tablename__ = 'Cliente'

    ID = banco.Column(banco.Integer, primary_key=True)
    Nome = banco.Column(banco.String(100))
    CPF = banco.Column(banco.String(14))
    email = banco.Column(banco.String(100), unique=True, nullable=False)
    senha_hash = banco.Column("senha", banco.String(256), nullable=False)
    telefone = banco.Column(banco.String(20))
    Cidade = banco.Column(banco.String(100))

    def __init__(self, Nome, CPF, email, senha, telefone, Cidade):
        self.Nome = Nome
        self.CPF = CPF
        self.email = email
        self.senha = senha
        self.telefone = telefone
        self.Cidade = Cidade

    @property
    def senha(self):
        raise AttributeError("Senha não pode ser acessada diretamente")

    @senha.setter
    def senha(self, senha_plaintext):
        self.senha_hash = generate_password_hash(senha_plaintext)

    def verificar_senha(self, senha_plaintext):
        return check_password_hash(self.senha_hash, senha_plaintext)

    def gerar_hash_senha(self, senha_plaintext):
        return generate_password_hash(senha_plaintext)

    def json(self):
        return {
            "ID": self.ID,
            "Nome": self.Nome,
            "CPF": self.CPF,
            "email": self.email,
            "telefone": self.telefone,
            "Cidade": self.Cidade
        }

    @classmethod
    def find_by_id(cls, ID):
        return cls.query.get(ID)

    @classmethod
    def find_by_email(cls, email):
        return cls.query.filter_by(email=email).first()

    def save(self):
        banco.session.add(self)
        banco.session.commit()

    def update(self, Nome, CPF, email, senha, telefone, Cidade):
        self.Nome = Nome
        self.CPF = CPF
        self.email = email
        self.senha = senha  # será automaticamente criptografada
        self.telefone = telefone
        self.Cidade = Cidade
        banco.session.commit()

    @classmethod
    def delete(cls, ID):
        usuario = cls.find_by_id(ID)
        if usuario:
            banco.session.delete(usuario)
            banco.session.commit()
