from datetime import datetime
from .usuario import UsuarioModel
from sql_alchemy import banco

class avaliacaoModel(banco.Model):
    __tablename__ = 'avaliacao'

    ID = banco.Column(banco.Integer, primary_key = True)
    Comentario = banco.Column(banco.String())
    Nota = banco.Column(banco.Integer)
    ID_Cliente = banco.Column(banco.Integer)
    ID_Restaurante = banco.Column(banco.Integer)
    visivel = banco.Column(banco.Boolean, default=True)
    sentimento_auto = banco.Column(banco.String(15), nullable=True)
    data_avaliacao = banco.Column(
        banco.String, 
        default=lambda: datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
    )
    imagens_urls = banco.Column(banco.JSON, nullable=True, default=list)  # Array de URLs
    tem_imagens = banco.Column(banco.Boolean, default=False)
    tags_avaliacoes = banco.relationship('AvaliacaoTagsModel', backref='avaliacao', cascade='all, delete-orphan')

    def __init__(self, Nota, Comentario, ID_Cliente, ID_Restaurante, data_avaliacao= None, visivel=True, sentimento_auto=None, imagens_urls=None, tem_imagens=False):
      self.Comentario = Comentario
      self.Nota = Nota
      self.ID_Cliente = ID_Cliente
      self.ID_Restaurante = ID_Restaurante
      self.data_avaliacao = data_avaliacao or datetime.now().strftime('%Y-%m-%dT%H:%M:%S')
      self.visivel = visivel
      self.sentimento_auto = sentimento_auto
      self.imagens_urls = imagens_urls or []
      self.tem_imagens = bool(imagens_urls)

    def json(self):
        # Incluir tags na resposta JSON
        resultado = {
            "ID": self.ID,
            "Comentario": self.Comentario,
            "Nota": self.Nota,
            "ID_Cliente": self.ID_Cliente,
            "ID_Restaurante": self.ID_Restaurante,
            "data_avaliacao": self.data_avaliacao,
            "visivel": self.visivel,
            "sentimento_auto": self.sentimento_auto,
            "imagens_urls": self.imagens_urls or [],
            "tem_imagens": self.tem_imagens
        }
        try:
            from models.tag_restaurante import AvaliacaoTagsModel
            tags = AvaliacaoTagsModel.find_by_avaliacao(self.ID)
            resultado["tags_notas"] = tags
        except ImportError:
            resultado["tags_notas"] = []
        return resultado
      
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
    def updateAvaliacao(cls, ID, Nota=None, Comentario=None, ID_Restaurante=None, imagens_urls=None):
        avaliacao = cls.query.filter_by(ID=ID).first()
        if avaliacao:
            if Nota is not None:
                avaliacao.Nota = Nota
            if Comentario is not None:
                avaliacao.Comentario = Comentario
            if ID_Restaurante is not None:
                avaliacao.ID_Restaurante = ID_Restaurante
            if imagens_urls is not None:
                avaliacao.imagens_urls = imagens_urls
                avaliacao.tem_imagens = bool(imagens_urls)
            banco.session.commit()
            return avaliacao
        return None
    @classmethod
    def criar_com_tags(cls, dados_avaliacao, tags_notas=None):
        """
        Cria uma avaliação junto com as notas das tags
        dados_avaliacao: dict com dados da avaliação principal
        tags_notas: dict {tag_id: nota}
        """
        try:
            # Importar dentro do método para evitar circular imports
            from models.tag_restaurante import AvaliacaoTagsModel, RestauranteTagsConquistadasModel
            
            # Criar avaliação principal
            nova_avaliacao = cls(**dados_avaliacao)
            banco.session.add(nova_avaliacao)
            banco.session.flush()  # Para obter o ID
            print(f"✅ Avaliação criada com ID: {nova_avaliacao.ID}")
        
            # Criar avaliações das tags
            if tags_notas:
                print(f"📝 Criando avaliações para {len(tags_notas)} tags...")
                AvaliacaoTagsModel.criar_avaliacoes_tags(nova_avaliacao.ID, tags_notas)
                print(f"✅ Tags avaliadas criadas")
            
            # Commit da transação principal primeiro
            banco.session.commit()
            print(f"✅ Transação commitada")
            
            # Recalcular pontuações das tags para o restaurante (em transação separada)
            if tags_notas:
                restaurante_id = dados_avaliacao['ID_Restaurante']
                print(f"🔄 Recalculando pontuações das tags...")
                
                for tag_id in tags_notas.keys():
                    try:
                        RestauranteTagsConquistadasModel.recalcular_pontuacao(restaurante_id, tag_id)
                    except Exception as e:
                        print(f"⚠️ Erro ao recalcular tag {tag_id}: {e}")
                        # Não falhar toda a avaliação por erro de recálculo
            
            return nova_avaliacao
            
        except Exception as e:
            banco.session.rollback()
            print(f"❌ Erro em criar_com_tags: {str(e)}")
            raise e
    
    @classmethod
    def findAll(self):
        # Modificar para incluir filtro de visibilidade
        avaliacoes = self.query.filter_by(visivel=True).all()
        lista_de_avaliacao = []

        for avaliacao in avaliacoes:
            avaliacao_dict = {
                "ID": avaliacao.ID,
                "Comentario": avaliacao.Comentario,
                "Nota": avaliacao.Nota,
                "ID_Cliente": avaliacao.ID_Cliente,
                "ID_Restaurante": avaliacao.ID_Restaurante,
                "data_avaliacao": avaliacao.data_avaliacao,
                "visivel": avaliacao.visivel,
                "sentimento_auto": avaliacao.sentimento_auto
            }
            lista_de_avaliacao.append(avaliacao_dict)
        return lista_de_avaliacao
    
    @classmethod
    def findAllAvaliacoes(cls, ID_Restaurante):
        # Adicionar filtro de visibilidade
        avaliacoes = cls.query.filter_by(ID_Restaurante=ID_Restaurante, visivel=True).all()
        lista_de_avaliacao = []

        for avaliacao in avaliacoes:
            avaliacao_dict = {
                "ID": avaliacao.ID,
                "Comentario": avaliacao.Comentario,
                "Nota": avaliacao.Nota,
                "ID_Cliente": avaliacao.ID_Cliente,
                "ID_Restaurante": avaliacao.ID_Restaurante,
                "data_avaliacao": avaliacao.data_avaliacao,
                "visivel": avaliacao.visivel,
                "sentimento_auto": avaliacao.sentimento_auto  # Adicione este campo também
            }
            lista_de_avaliacao.append(avaliacao_dict)
        return lista_de_avaliacao
        
    @classmethod
    def findAllCliente(cls, ID_Cliente):
        # Adicionar filtro de visibilidade
        avaliacoes = cls.query.filter_by(ID_Cliente=ID_Cliente, visivel=True).all()
        lista_de_avaliacao = []

        for avaliacao in avaliacoes:
            avaliacao_dict = {
                "ID": avaliacao.ID,
                "Comentario": avaliacao.Comentario,
                "Nota": avaliacao.Nota,
                "ID_Cliente": avaliacao.ID_Cliente,
                "ID_Restaurante": avaliacao.ID_Restaurante,
                "data_avaliacao": avaliacao.data_avaliacao,
                "visivel": avaliacao.visivel,
                "sentimento_auto": avaliacao.sentimento_auto  # Adicione este campo também
            }
            lista_de_avaliacao.append(avaliacao_dict)
        return lista_de_avaliacao

    @classmethod
    def buscarAvaliacao(cls, ID):
        # Adicionar filtro de visibilidade
        avaliacoes = cls.query.filter_by(ID=ID, visivel=True).all()
        lista_de_avaliacao = []
        for avaliacao in avaliacoes:
            avaliacao_dict = {
                "ID": avaliacao.ID,
                "Comentario": avaliacao.Comentario,
                "Nota": avaliacao.Nota,
                "ID_Cliente": avaliacao.ID_Cliente,
                "ID_Restaurante": avaliacao.ID_Restaurante,
                "data_avaliacao": avaliacao.data_avaliacao,
                "visivel": avaliacao.visivel,
                "sentimento_auto": avaliacao.sentimento_auto  # Adicione este campo também
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
              "ID_Restaurante": avaliacao.ID_Restaurante,
              "data_avaliacao": avaliacao.data_avaliacao,
              "visivel": avaliacao.visivel
              
          }
          avaliacao_teste = avaliacaoModel.query.get(avaliacao_dict.get("ID"))
          banco.session.delete(avaliacao_teste)
# Exemplo de método no resource ou model de avaliação
    @classmethod
    def buscar_por_restaurante(cls, restaurante_id):
        avaliacoes = (
            banco.session.query(cls, UsuarioModel.Nome)
            .join(UsuarioModel, cls.ID_Cliente == UsuarioModel.ID)
            .filter(cls.ID_Restaurante == restaurante_id)
            .all()
        )
        return [
            {
                **avaliacao[0].json(),
                "Nome_Cliente": avaliacao[1]
            }
            for avaliacao in avaliacoes
        ]