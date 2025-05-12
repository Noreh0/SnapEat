from sql_alchemy import banco

class avaliacaoModel(banco.Model):
    __tablename__ = 'Avaliacao'

    ID = banco.Column(banco.Integer, primary_key = True)
    Comentario = banco.Column(banco.String())
    Nota = banco.Column(banco.Integer)
    ID_Cliente = banco.Column(banco.Integer)
    ID_Restaurante = banco.Column(banco.Integer)
    
    def __init__(self, Nota, Comentario, ID_Cliente, ID_Restaurante):
      self.Comentario = Comentario
      self.Nota = Nota
      self.ID_Cliente = ID_Cliente
      self.ID_Restaurante = ID_Restaurante
      
    def json(self):
      return {
          "ID": self.ID,
          "Comentario": self.Comentario,
          "Nota": self.Nota,
          "ID_Cliente": self.ID_Cliente,
          "ID_Restaurante": self.ID_Restaurante
      }
      
    @classmethod
    def find_avaliacoes(cls, ID):
      avaliacao = cls.query.filter_by(ID=ID).first()
      if avaliacao:
        return avaliacao
      return None
    def save_avaliacoes(self):
      banco.session.add(self)
      banco.session.commit()
      
      
    def delete_avaliacao(ID):
      avaliacoes = avaliacaoModel.query.get(ID)
      banco.session.delete(avaliacoes)
      banco.session.commit()
      
    @classmethod
    def updateAvaliacao(self, ID, Nota, Comentario, ID_Cliente, ID_Restaurante):     
      avaliacao = self.query.filter_by(ID=ID).first()
      if avaliacao:
        # Atualiza os atributos do restaurante com base no dicionário
        avaliacao.Nota = Nota
        avaliacao.Comentario = Comentario
        avaliacao.ID_Cliente = ID_Cliente
        avaliacao.ID_Restaurante = ID_Restaurante
        
        banco.session.commit()
        return avaliacao
    
    
    @classmethod
    def findAll(self):
      avaliacoes = self.query.all()
      lista_de_avaliacao = []

      for avaliacao in avaliacoes:
          avaliacao_dict = {
              "ID": avaliacao.ID,
              "Comentario": avaliacao.Comentario,
              "Nota": avaliacao.Nota,
              "ID_Cliente": avaliacao.ID_Cliente,
              "ID_Restaurante": avaliacao.ID_Restaurante
          }
          lista_de_avaliacao.append(avaliacao_dict)
      return lista_de_avaliacao
    
    @classmethod
    def findAllAvaliacoes(cls, ID_Restaurante):
      avaliacoes = cls.query.filter_by(ID_Restaurante=ID_Restaurante).all()
      lista_de_avaliacao = []

      for avaliacao in avaliacoes:
          avaliacao_dict = {
              "ID": avaliacao.ID,
              "Comentario": avaliacao.Comentario,
              "Nota": avaliacao.Nota,
              "ID_Cliente": avaliacao.ID_Cliente,
              "ID_Restaurante": avaliacao.ID_Restaurante
          }
          lista_de_avaliacao.append(avaliacao_dict)
      return lista_de_avaliacao
    
    @classmethod
    def findAllCliente(cls, ID_Cliente):
      avaliacoes = cls.query.filter_by(ID_Cliente=ID_Cliente).all()
      lista_de_avaliacao = []

      for avaliacao in avaliacoes:
          avaliacao_dict = {
              "ID": avaliacao.ID,
              "Comentario": avaliacao.Comentario,
              "Nota": avaliacao.Nota,
              "ID_Cliente": avaliacao.ID_Cliente,
              "ID_Restaurante": avaliacao.ID_Restaurante
          }
          lista_de_avaliacao.append(avaliacao_dict)
      return lista_de_avaliacao
    @classmethod
    def buscarAvaliacao(cls, ID):
      avaliacoes = cls.query.filter_by(ID=ID).all()
      lista_de_avaliacao = []
      for avaliacao in avaliacoes:
          avaliacao_dict = {
              "ID": avaliacao.ID,
              "Comentario": avaliacao.Comentario,
              "Nota": avaliacao.Nota,
              "ID_Cliente": avaliacao.ID_Cliente,
              "ID_Restaurante": avaliacao.ID_Restaurante
          }
          lista_de_avaliacao.append(avaliacao_dict)
      return lista_de_avaliacao 
    
    
    @classmethod
    def findandremove(cls, ID_Restaurante):
      avaliacoes = cls.query.filter_by(ID_Restaurante=ID_Restaurante).all()

      for avaliacao in avaliacoes:
          avaliacao_dict = {
              "ID": avaliacao.ID,
              "Comentario": avaliacao.Comentario,
              "Nota": avaliacao.Nota,
              "ID_Cliente": avaliacao.ID_Cliente,
              "ID_Restaurante": avaliacao.ID_Restaurante
          }
          avaliacao_teste = avaliacaoModel.query.get(avaliacao_dict.get("ID"))
          banco.session.delete(avaliacao_teste)
          





