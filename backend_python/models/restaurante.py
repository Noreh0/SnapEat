from sql_alchemy import banco
from flask import jsonify, request
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func
import json

class restauranteModel(banco.Model):
    __tablename__ = 'restaurante'
    ID = banco.Column(banco.Integer, primary_key = True)
    Nome = banco.Column(banco.String(100))
    nome_fantasia = banco.Column(banco.String(100)) 
    CNPJ = banco.Column(banco.String(14))
    email = banco.Column(banco.String(100))
    senha_hash = banco.Column(banco.String(256))      # nome idêntico ao da tabela
    telefone = banco.Column(banco.String(20))
    Endereco = banco.Column(banco.String(255))
    Cidade = banco.Column(banco.String(255))
    bairro = banco.Column(banco.String(100))
    latitude = banco.Column(banco.Float)
    longitude = banco.Column(banco.Float)
    tipo_restaurante = banco.Column(banco.String(50))
    descricao = banco.Column(banco.String(50))
    imagem_url = banco.Column(banco.String(255))
    firebase_uid = banco.Column(banco.String(128), nullable=True, unique=True)
    tags_conquistadas = banco.relationship(
        'RestauranteTagsConquistadasModel',
        backref='restaurante',
        lazy='select',
        foreign_keys='RestauranteTagsConquistadasModel.ID_Restaurante'
    )

    def __init__(self, Nome, nome_fantasia, CNPJ, email, senha, telefone, Endereco, Cidade, latitude, longitude, bairro, tipo_restaurante, descricao, imagem_url=None, firebase_uid=None):
      self.Nome = Nome
      self.nome_fantasia = nome_fantasia
      self.CNPJ = CNPJ
      self.email = email
      self.senha_hash = generate_password_hash(senha)
      self.telefone = telefone
      self.Endereco = Endereco
      self.Cidade = Cidade
      self.bairro = bairro
      self.longitude = longitude
      self.latitude = latitude
      self.tipo_restaurante = tipo_restaurante
      self.descricao = descricao
      self.imagem_url = imagem_url
      self.firebase_uid = firebase_uid
      
    def json(self):
      return {
          "ID": self.ID,
          "Nome": self.Nome,
          "nome_fantasia": self.nome_fantasia,
          "CNPJ": self.CNPJ,
          "email": self.email,
          # não expomos a senha nem o hash aqui
          "telefone": self.telefone,
          "Endereco": self.Endereco,
          "Cidade": self.Cidade,
          "tipo_restaurante": self.tipo_restaurante,
          "descricao": self.descricao,
          "bairro": self.bairro,
          "latitude": self.latitude,
          "longitude": self.longitude,
          "imagem_url": self.imagem_url,
          "firebase_uid": self.firebase_uid,
          "tags_conquistadas": []
      }


    
    @property
    def senha(self):
        raise AttributeError("Senha não pode ser lida diretamente")

    @senha.setter
    def senha(self, senha_plaintext):
        # salva o hash na coluna senha_hash
        self.senha_hash = generate_password_hash(senha_plaintext)
        
    @classmethod
    def find_all_restaurante(cls):
        restaurantes = cls.query.all()
        lista_de_dicionarios = []

        for restaurante in restaurantes:
            restaurante_dict = {
                "ID": restaurante.ID,
                "Nome": restaurante.Nome,
                "nome_fantasia": restaurante.nome_fantasia,
                "CNPJ": restaurante.CNPJ,
                "email": restaurante.email,
                "telefone": restaurante.telefone,
                "Endereco": restaurante.Endereco,
                "Cidade": restaurante.Cidade,
                "bairro": restaurante.bairro,
                "tipo_restaurante": restaurante.tipo_restaurante,
                "descricao": restaurante.descricao,
                "imagem_url": restaurante.imagem_url 
            }
            lista_de_dicionarios.append(restaurante_dict)
        return lista_de_dicionarios
    
    @classmethod
    def find_by_firebase_uid(cls, firebase_uid):
        return cls.query.filter_by(firebase_uid=firebase_uid).first()
    
    
    @classmethod
    def find_restaurante(cls, ID):
        try:
            restaurante = cls.query.filter_by(ID=int(ID)).first()
            if restaurante:
                # Retorna o objeto diretamente, em vez de um dicionário
                return restaurante
            return None
        except Exception as e:
            print(f"ERRO em find_restaurante: {e}")
            return None


    @classmethod
    def encontrar_proximos(cls, lat, lng, tipo_restaurante=None, raio_km=5):
        query = cls.query
        if lat is not None and lng is not None:
            query = query.filter(
                (6371 *
                func.acos(
                    func.cos(func.radians(lat)) *
                    func.cos(func.radians(cls.latitude)) *
                    func.cos(func.radians(cls.longitude) - func.radians(lng)) +
                    func.sin(func.radians(lat)) *
                    func.sin(func.radians(cls.latitude))
                )) <= raio_km
            )
        if tipo_restaurante:
            query = query.filter(cls.tipo_restaurante == tipo_restaurante)
        return query.all()
    @classmethod
    def find_tipo_restaurante(cls, tipo_restaurante):
      restaurantes = cls.query.filter_by(tipo_restaurante=tipo_restaurante).all()
      modelo_restaurante = []
      if not restaurantes:
        return restaurantes
      else:  
        for restaurante in restaurantes:
            restaurante_dict = {
                "ID": restaurante.ID,
                "Nome": restaurante.Nome,
                "nome_fantasia": restaurante.nome_fantasia,
                "CNPJ": restaurante.CNPJ,
                "email": restaurante.email,
                "telefone": restaurante.telefone,
                "Endereco": restaurante.Endereco,
                "Cidade": restaurante.Cidade,
                "bairro": restaurante.bairro,
                "tipo_restaurante": restaurante.tipo_restaurante,
                "descricao": restaurante.descricao,
                "imagem_url": restaurante.imagem_url  # <-- ADICIONE ESTA LINHA
            }
            modelo_restaurante.append(restaurante_dict)
        return modelo_restaurante 
      
    @classmethod
    def buscar_email_restaurante(cls, email):
      restaurantes = cls.query.filter_by(email=email).all()
      lista_de_email = []
      for restaurante in restaurantes:
          restaurante_dict = {
              "ID": restaurante.ID,
              "Nome": restaurante.Nome,
              "nome_fantasia": restaurante.nome_fantasia,
              "CNPJ": restaurante.CNPJ,
              "email": restaurante.email,
              "telefone": restaurante.telefone,
              "Endereco": restaurante.Endereco,
              "Cidade": restaurante.Cidade,
              "tipo_restaurante": restaurante.tipo_restaurante,
              "descricao": restaurante.descricao,
              "imagem_url": restaurante.imagem_url  # <-- ADICIONE ESTA LINHA
          }
          lista_de_email.append(restaurante_dict)
      return lista_de_email 

    def save_restaurante(self):
      banco.session.add(self)
      banco.session.commit()
    
    @classmethod
    def find_email_restaurante(cls, email):
      return cls.query.filter_by(email=email).first()
    

    @classmethod
    def update_restaurante(cls, ID, **kwargs):
        restaurante = cls.query.filter_by(ID=ID).first()
        if not restaurante:
            return None

        # se vier campo senha, dispara o setter
        if 'senha' in kwargs:
            restaurante.senha = kwargs.pop('senha')

        # atualiza demais
        for key, value in kwargs.items():
            if hasattr(restaurante, key):
                setattr(restaurante, key, value)

        banco.session.commit()
        return restaurante
      
    @classmethod
    def delete_restaurante(cls, ID):
        restaurante = cls.query.get(ID)
        if not restaurante:
            return False
        banco.session.delete(restaurante)
        banco.session.commit()
        return True
      
      
    @classmethod
    def find_name_restaurante(cls, Nome):
      restaurantes = cls.query.filter(cls.Nome.contains(Nome)).all()
      modelo_restaurante = []
      if not restaurantes:
        return restaurantes
      else:  
        for restaurante in restaurantes:
            restaurante_dict = {
                "ID": restaurante.ID,
                "Nome": restaurante.Nome,
                "nome_fantasia": restaurante.nome_fantasia,
                "CNPJ": restaurante.CNPJ,
                "email": restaurante.email,
                "telefone": restaurante.telefone,
                "Endereco": restaurante.Endereco,
                "Cidade": restaurante.Cidade,
                "bairro": restaurante.bairro,
                "tipo_restaurante": restaurante.tipo_restaurante,
                "descricao": restaurante.descricao,
                "imagem_url": restaurante.imagem_url  # <-- ADICIONE ESTA LINHA
            }
            modelo_restaurante.append(restaurante_dict)
        return modelo_restaurante 
      
    