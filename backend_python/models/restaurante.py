from sql_alchemy import banco
from flask import jsonify, request
import json

class restauranteModel(banco.Model):
    __tablename__ = 'Restaurante'
    ID = banco.Column(banco.Integer, primary_key = True)
    Nome = banco.Column(banco.String(100))
    CNPJ = banco.Column(banco.String(14))
    email = banco.Column(banco.String(100))
    senha = banco.Column(banco.String(100))
    telefone = banco.Column(banco.String(20))
    Endereco = banco.Column(banco.String(100))
    Cidade = banco.Column(banco.String(100))
    tipo_restaurante = banco.Column(banco.String(50))
    descricao = banco.Column(banco.String(50))
        
    def __init__(self, Nome, CNPJ, email, senha, telefone, Endereco, Cidade, tipo_restaurante, descricao):
      self.Nome = Nome
      self.CNPJ = CNPJ
      self.email = email
      self.senha = senha
      self.telefone = telefone
      self.Endereco = Endereco
      self.Cidade = Cidade
      self.tipo_restaurante = tipo_restaurante
      self.descricao = descricao
      
    def json(self):
      return {
          "ID": self.ID,
          "Nome": self.Nome,
          "CNPJ": self.CNPJ,
          "email": self.email,
          "senha": self.senha,
          "telefone": self.telefone,
          "Endereco": self.Endereco,
          "Cidade": self.Cidade,
          "tipo_restaurante": self.tipo_restaurante,
          "descricao": self.descricao
      }

    @classmethod
    def find_all_restaurante(cls):
        restaurantes = cls.query.all()
        lista_de_dicionarios = []

        for restaurante in restaurantes:
            restaurante_dict = {
                "ID": restaurante.ID,
                "Nome": restaurante.Nome,
                "CNPJ": restaurante.CNPJ,
                "email": restaurante.email,
                "telefone": restaurante.telefone,
                "Endereco": restaurante.Endereco,
                "Cidade": restaurante.Cidade,
                "tipo_restaurante": restaurante.tipo_restaurante,
                "descricao": restaurante.descricao
            }
            lista_de_dicionarios.append(restaurante_dict)
        return lista_de_dicionarios
    @classmethod
    def find_restaurante(cls, ID):
      restaurantes = cls.query.filter_by(ID=ID).all()
      lista_de_dicionarios = []

      for restaurante in restaurantes:
          restaurante_dict = {
              "ID": restaurante.ID,
              "Nome": restaurante.Nome,
              "CNPJ": restaurante.CNPJ,
              "email": restaurante.email,
              "telefone": restaurante.telefone,
              "Endereco": restaurante.Endereco,
              "Cidade": restaurante.Cidade,
              "tipo_restaurante": restaurante.tipo_restaurante,
              "descricao": restaurante.descricao
          }
          lista_de_dicionarios.append(restaurante_dict)
      return lista_de_dicionarios
    
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
                "CNPJ": restaurante.CNPJ,
                "email": restaurante.email,
                "telefone": restaurante.telefone,
                "Endereco": restaurante.Endereco,
                "Cidade": restaurante.Cidade,
                "tipo_restaurante": restaurante.tipo_restaurante,
                "descricao": restaurante.descricao
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
              "CNPJ": restaurante.CNPJ,
              "email": restaurante.email,
              "telefone": restaurante.telefone,
              "Endereco": restaurante.Endereco,
              "Cidade": restaurante.Cidade,
              "tipo_restaurante": restaurante.tipo_restaurante,
              "descricao": restaurante.descricao
          }
          lista_de_email.append(restaurante_dict)
      return lista_de_email 

    def save_restaurante(self):
      banco.session.add(self)
      banco.session.commit()
    
    @classmethod
    def find_email_restaurante(cls, email):
      restaurante = cls.query.filter_by(email=email).first()
      if restaurante:
        return restaurante
      return None
    

    @classmethod
    def updaterestaurante(self, ID,  Nome, CNPJ, email, senha, telefone, Endereco, Cidade, tipo_restaurante, descricao):     
      restaurantes = self.query.filter_by(ID=ID).first()
      if restaurantes:
        # Atualiza os atributos do restaurante com base no dicionário
        restaurantes.Nome = Nome
        restaurantes.CNPJ = CNPJ
        restaurantes.email = email
        restaurantes.senha = senha
        restaurantes.telefone = telefone
        restaurantes.Endereco = Endereco
        restaurantes.Cidade = Cidade
        restaurantes.tipo_restaurante = tipo_restaurante
        restaurantes.descricao = descricao
        banco.session.commit()
        return restaurantes
      
    def delete_restaurante(ID):
      restaurantes = restauranteModel.query.get(ID)
      banco.session.delete(restaurantes)
      banco.session.commit()
      
      
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
                "CNPJ": restaurante.CNPJ,
                "email": restaurante.email,
                "telefone": restaurante.telefone,
                "Endereco": restaurante.Endereco,
                "Cidade": restaurante.Cidade,
                "tipo_restaurante": restaurante.tipo_restaurante,
                "descricao": restaurante.descricao
            }
            modelo_restaurante.append(restaurante_dict)
        return modelo_restaurante 
      
    