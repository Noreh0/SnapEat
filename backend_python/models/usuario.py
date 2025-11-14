from sql_alchemy import banco
from werkzeug.security import generate_password_hash, check_password_hash

class UsuarioModel(banco.Model):
    __tablename__ = 'cliente'

    ID = banco.Column(banco.Integer, primary_key=True)
    Nome = banco.Column(banco.String(100))
    CPF = banco.Column(banco.String(20))
    email = banco.Column(banco.String(100), unique=True, nullable=False)
    senha_hash = banco.Column("senha", banco.String(256), nullable=False)
    telefone = banco.Column(banco.String(25))
    Cidade = banco.Column(banco.String(100))
    firebase_uid = banco.Column(banco.String(128), nullable=True, unique=True)
    rede_social = banco.Column(banco.String(500), nullable=True)

    def __init__(self, Nome, CPF, email, senha, telefone, Cidade, firebase_uid=None, rede_social=None):
        self.Nome = Nome
        self.CPF = CPF
        self.email = email
        self.senha = senha
        self.telefone = telefone
        self.Cidade = Cidade
        self.firebase_uid = firebase_uid
        self.rede_social = rede_social
        

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
            "Cidade": self.Cidade,
            "firebase_uid": self.firebase_uid,
            "rede_social": self.rede_social
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

    def update(self, Nome, CPF, email, senha, telefone, Cidade, rede_social=None):
        self.Nome = Nome
        self.CPF = CPF
        self.email = email
        self.senha = senha  # será automaticamente criptografada
        self.telefone = telefone
        self.Cidade = Cidade
        self.rede_social = rede_social
        banco.session.commit()

    @classmethod
    def delete(cls, ID):
        try:
            usuario = cls.find_by_id(ID)
            if usuario:
                print(f"Excluindo usuário {ID} do banco de dados")
                banco.session.delete(usuario)
                banco.session.commit()
                print(f"Usuário {ID} excluído com sucesso")
                return True
            print(f"Usuário {ID} não encontrado")
            return False
        except Exception as e:
            banco.session.rollback()
            print(f"ERRO ao excluir usuário {ID}: {str(e)}")
            import traceback
            traceback.print_exc()
            raise
    @classmethod
    def find_by_firebase_uid(cls, firebase_uid):
        return cls.query.filter_by(firebase_uid=firebase_uid).first()