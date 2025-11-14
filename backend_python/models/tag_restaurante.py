# models/tag_restaurante.py
from sql_alchemy import banco
from datetime import datetime

class TagRestauranteModel(banco.Model):
    __tablename__ = 'tagsrestaurante'

    ID = banco.Column(banco.Integer, primary_key=True)
    nome = banco.Column(banco.String(50), nullable=False, unique=True)
    categoria = banco.Column(banco.String(50))
    descricao = banco.Column(banco.Text)
    icone = banco.Column(banco.String(100))
    cor = banco.Column(banco.String(7), default='#d97746')
    ativo = banco.Column(banco.Boolean, default=True)
    created_at = banco.Column(banco.DateTime, default=datetime.utcnow)

    def json(self):
        banco.session.refresh(self)
        return {
            "ID": self.ID,
            "nome": self.nome,
            "categoria": self.categoria,
            "descricao": self.descricao,
            "icone": self.icone,
            "cor": self.cor,
            "ativo": self.ativo,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def find_all(cls):
        print("\n" + "="*70)
        print("🔍 DEBUG PROFUNDO - TagRestauranteModel.find_all()")
        print("="*70)
        
        # 1. Verificar a estrutura da tabela no SQLAlchemy
        print("\n1️⃣ COLUNAS MAPEADAS NO MODELO:")
        for column in cls.__table__.columns:
            print(f"   - {column.name}: {column.type}")
        
        # 2. Fazer query SEM filtro primeiro
        print("\n2️⃣ BUSCANDO TODAS AS TAGS (sem filtro):")
        todas_tags = cls.query.all()
        print(f"   Total encontrado: {len(todas_tags)}")
        
        # 3. Inspecionar cada tag em detalhes
        resultado = []
        for idx, tag in enumerate(todas_tags, 1):
            print(f"\n3️⃣ TAG #{idx} (ID={tag.ID}):")
            print(f"   __dict__: {tag.__dict__}")
            print(f"   __table__.columns: {[c.name for c in tag.__table__.columns]}")
            
            # Tentar acessar categoria de diferentes formas
            print(f"\n   TESTANDO ACESSO AO CAMPO 'categoria':")
            print(f"   ✓ tag.categoria: {tag.categoria}")
            print(f"   ✓ getattr(tag, 'categoria', 'N/A'): {getattr(tag, 'categoria', 'N/A')}")
            print(f"   ✓ tag.__dict__.get('categoria'): {tag.__dict__.get('categoria')}")
            
            # Verificar se o atributo existe no objeto SQLAlchemy
            if hasattr(tag, 'categoria'):
                print(f"   ✅ Atributo 'categoria' EXISTE no objeto")
            else:
                print(f"   ❌ Atributo 'categoria' NÃO EXISTE no objeto")
            
            # Gerar JSON
            tag_json = tag.json()
            print(f"\n   JSON GERADO:")
            print(f"   {tag_json}")
            
            # Verificar se categoria está no JSON
            if 'categoria' in tag_json:
                print(f"   ✅ Campo 'categoria' presente no JSON: '{tag_json['categoria']}'")
            else:
                print(f"   ❌ Campo 'categoria' AUSENTE no JSON")
            
            resultado.append(tag_json)
        
        print("\n" + "="*70)
        print(f"📤 RETORNANDO {len(resultado)} tags")
        print("="*70 + "\n")
        
        return resultado
    @classmethod
    def find_by_id(cls, tag_id):
        tag = cls.query.get(tag_id)
        return tag.json() if tag else None

class AvaliacaoTagsModel(banco.Model):
    __tablename__ = 'avaliacaotags'

    ID = banco.Column(banco.Integer, primary_key=True)
    ID_Avaliacao = banco.Column(banco.Integer, banco.ForeignKey('avaliacao.ID'), nullable=False)
    ID_Tag = banco.Column(banco.Integer, banco.ForeignKey('tagsrestaurante.ID'), nullable=False)
    nota = banco.Column(banco.Integer, nullable=False)
    created_at = banco.Column(banco.DateTime, default=datetime.utcnow)

    # Relacionamentos
    tag = banco.relationship('TagRestauranteModel', backref='avaliacoes')

    def json(self):
        return {
            "ID": self.ID,
            "ID_Avaliacao": self.ID_Avaliacao,
            "ID_Tag": self.ID_Tag,
            "nota": self.nota,
            "tag_nome": self.tag.nome if self.tag else None,
            "created_at": self.created_at.isoformat() if self.created_at else None
        }

    @classmethod
    def find_by_avaliacao(cls, avaliacao_id):
        tags = cls.query.filter_by(ID_Avaliacao=avaliacao_id).all()
        return [
            {
                "ID": t.ID,
                "ID_Tag": t.ID_Tag,
                "ID_Avaliacao": t.ID_Avaliacao,
                "nota": t.nota,
                "tag": {
                    "ID": t.tag.ID if t.tag else None,
                    "nome": t.tag.nome if t.tag else None,
                    "categoria": t.tag.categoria if t.tag else None
                }
            }
            for t in tags
        ]

    @classmethod
    def criar_avaliacoes_tags(cls, avaliacao_id, tags_notas):
        """
        Cria avaliações de tags para uma avaliação
        tags_notas: dict {tag_id: nota}
        """
        avaliacoes_criadas = []
        
        for tag_id, nota in tags_notas.items():
            if 1 <= nota <= 5:  # Validar nota
                avaliacao_tag = cls(
                    ID_Avaliacao=avaliacao_id,
                    ID_Tag=tag_id,
                    nota=nota
                )
                banco.session.add(avaliacao_tag)
                avaliacoes_criadas.append(avaliacao_tag)
        
        return avaliacoes_criadas

class RestauranteTagsConquistadasModel(banco.Model):
    __tablename__ = 'restaurantetagsconquistadas'

    ID = banco.Column(banco.Integer, primary_key=True)
    ID_Restaurante = banco.Column(banco.Integer, banco.ForeignKey('restaurante.ID'), nullable=False)
    ID_Tag = banco.Column(banco.Integer, banco.ForeignKey('tagsrestaurante.ID'), nullable=False)
    pontuacao_total = banco.Column(banco.Numeric(10, 2), default=0)
    total_avaliacoes = banco.Column(banco.Integer, default=0)
    media_categoria = banco.Column(banco.Numeric(3, 2), default=0)
    posicao_ranking = banco.Column(banco.Integer, nullable=True)
    ativo = banco.Column(banco.Boolean, default=True)
    conquistado_em = banco.Column(banco.DateTime, default=datetime.utcnow)
    atualizado_em = banco.Column(banco.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relacionamentos
    tag = banco.relationship(
        'TagRestauranteModel', 
        backref='restaurantes_conquistaram',
        foreign_keys=[ID_Tag]
    )
    def json(self):
        return {
            "ID": self.ID,
            "ID_Restaurante": self.ID_Restaurante,
            "ID_Tag": self.ID_Tag,
            "tag_nome": self.tag.nome if self.tag else None,
            "tag_icone": self.tag.icone if self.tag else None,
            "tag_cor": self.tag.cor if self.tag else None,
            "pontuacao_total": float(self.pontuacao_total),
            "total_avaliacoes": self.total_avaliacoes,
            "media_categoria": float(self.media_categoria),
            "posicao_ranking": self.posicao_ranking,
            "ativo": self.ativo,
            "conquistado_em": self.conquistado_em.isoformat() if self.conquistado_em else None
        }

    @classmethod
    def find_by_restaurante(cls, restaurante_id, apenas_ativas=True):
        query = cls.query.filter_by(ID_Restaurante=restaurante_id)
        if apenas_ativas:
            query = query.filter_by(ativo=True)
        
        tags = query.all()
        return [tag.json() for tag in tags]

    @classmethod
    def recalcular_pontuacao(cls, restaurante_id, tag_id):
        """
        Recalcula a pontuação de uma tag específica para um restaurante
        """
        from models.avaliacao import avaliacaoModel
        from sqlalchemy import func
        
        # Buscar todas as avaliações do restaurante que têm essa tag
        resultado = (
            banco.session.query(
                func.avg(AvaliacaoTagsModel.nota).label('media'),
                func.count(AvaliacaoTagsModel.ID).label('total'),
                func.sum(AvaliacaoTagsModel.nota).label('soma')
            )
            .join(avaliacaoModel, AvaliacaoTagsModel.ID_Avaliacao == avaliacaoModel.ID)
            .filter(
                avaliacaoModel.ID_Restaurante == restaurante_id,
                avaliacaoModel.visivel == True,
                AvaliacaoTagsModel.ID_Tag == tag_id
            )
            .first()
        )
        
        if resultado and resultado.total > 0:
            media = float(resultado.media)
            total = resultado.total
            pontuacao = float(resultado.soma)
            
            # Buscar ou criar registro
            tag_conquistada = cls.query.filter_by(
                ID_Restaurante=restaurante_id,
                ID_Tag=tag_id
            ).first()
            
            if not tag_conquistada:
                tag_conquistada = cls(
                    ID_Restaurante=restaurante_id,
                    ID_Tag=tag_id
                )
                banco.session.add(tag_conquistada)
            
            # Atualizar valores
            tag_conquistada.pontuacao_total = pontuacao
            tag_conquistada.total_avaliacoes = total
            tag_conquistada.media_categoria = media
            tag_conquistada.atualizado_em = datetime.utcnow()
            
            # Determinar se deve estar ativa (critério: pelo menos 5 avaliações e média >= 4.0)
            tag_conquistada.ativo = total >= 5 and media >= 4.0
            
            banco.session.commit()
            return tag_conquistada.json()
        
        return None