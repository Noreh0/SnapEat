from models.pontos_usuario import pontosUsuarioModel, historicoModel
from datetime import datetime

class PontosService:
    """Serviço para gerenciar sistema de pontos por avaliações"""
    
    # Configuração de pontos por ação
    PONTOS_CONFIG = {
        'avaliacao_restaurante': {
            'base': 20,  # Pontos base por avaliação
            'nota_5': 10,  # Bonus para nota 5
            'nota_4': 5,   # Bonus para nota 4
            'com_comentario': 10,  # Bonus para comentário > 50 chars
            'com_imagens': 15,     # Bonus para avaliação com imagens
        },
        'avaliacao_prato': {
            'base': 15,  # Pontos base por avaliação de prato
            'nota_5': 8,
            'nota_4': 4,
            'com_comentario': 8,
            'com_imagens': 12,
        },
        'primeira_avaliacao': 50,  # Bonus para primeira avaliação no restaurante
        'avaliacoes_multiplas': {
            '5_avaliacoes': 25,    # Bonus ao chegar em 5 avaliações
            '10_avaliacoes': 50,   # Bonus ao chegar em 10 avaliações
            '25_avaliacoes': 100,  # Bonus ao chegar em 25 avaliações
        }
    }
    
    @classmethod
    def calcular_pontos_avaliacao(cls, tipo_avaliacao, nota, tem_comentario=False, 
                                 tem_imagens=False, tamanho_comentario=0, 
                                 is_primeira_avaliacao=False, total_avaliacoes=0):
        """
        Calcula pontos para uma avaliação
        
        Args:
            tipo_avaliacao: 'avaliacao_restaurante' ou 'avaliacao_prato'
            nota: Nota da avaliação (1-5)
            tem_comentario: Se tem comentário
            tem_imagens: Se tem imagens
            tamanho_comentario: Tamanho do comentário
            is_primeira_avaliacao: Se é a primeira avaliação do cliente no restaurante
            total_avaliacoes: Total de avaliações do cliente no restaurante (após esta)
        
        Returns:
            dict com pontos calculados e detalhamento
        """
        
        config = cls.PONTOS_CONFIG.get(tipo_avaliacao, cls.PONTOS_CONFIG['avaliacao_restaurante'])
        
        pontos_detalhes = {
            'base': config['base'],
            'bonus_nota': 0,
            'bonus_comentario': 0,
            'bonus_imagens': 0,
            'bonus_primeira': 0,
            'bonus_milestone': 0,
            'total': 0
        }
        
        # Pontos base
        pontos_total = config['base']
        
        # Bonus por nota alta
        if nota == 5:
            bonus_nota = config.get('nota_5', 0)
            pontos_total += bonus_nota
            pontos_detalhes['bonus_nota'] = bonus_nota
        elif nota == 4:
            bonus_nota = config.get('nota_4', 0)
            pontos_total += bonus_nota
            pontos_detalhes['bonus_nota'] = bonus_nota
        
        # Bonus por comentário detalhado
        if tem_comentario and tamanho_comentario >= 50:
            bonus_comentario = config.get('com_comentario', 0)
            pontos_total += bonus_comentario
            pontos_detalhes['bonus_comentario'] = bonus_comentario
        
        # Bonus por imagens
        if tem_imagens:
            bonus_imagens = config.get('com_imagens', 0)
            pontos_total += bonus_imagens
            pontos_detalhes['bonus_imagens'] = bonus_imagens
        
        # Bonus primeira avaliação
        if is_primeira_avaliacao:
            bonus_primeira = cls.PONTOS_CONFIG['primeira_avaliacao']
            pontos_total += bonus_primeira
            pontos_detalhes['bonus_primeira'] = bonus_primeira
        
        # Bonus por milestones de avaliações
        milestones = cls.PONTOS_CONFIG['avaliacoes_multiplas']
        if total_avaliacoes == 5:
            bonus_milestone = milestones['5_avaliacoes']
            pontos_total += bonus_milestone
            pontos_detalhes['bonus_milestone'] = bonus_milestone
        elif total_avaliacoes == 10:
            bonus_milestone = milestones['10_avaliacoes']
            pontos_total += bonus_milestone
            pontos_detalhes['bonus_milestone'] = bonus_milestone
        elif total_avaliacoes == 25:
            bonus_milestone = milestones['25_avaliacoes']
            pontos_total += bonus_milestone
            pontos_detalhes['bonus_milestone'] = bonus_milestone
        
        pontos_detalhes['total'] = pontos_total
        
        return pontos_detalhes
    
    @classmethod
    def processar_pontos_avaliacao_restaurante(cls, cliente_id, restaurante_id, nota, 
                                             comentario="", tem_imagens=False, avaliacao_id=None):
        """Processa pontos para avaliação de restaurante - LIMITADO A UMA VEZ POR DIA"""
        
        # ✅ NOVA REGRA: Verificar se já ganhou pontos hoje por avaliação
        pode_ganhar, erro = historicoModel.conceder_pontos_avaliacao(
            cliente_id=cliente_id,
            restaurante_id=restaurante_id,
            pontos=20,  # Pontos fixos por avaliação de restaurante
            tipo_avaliacao='avaliacao',
            avaliacao_id=avaliacao_id
        )
        
        if not pode_ganhar:
            print(f"🚫 {erro}")
            return {
                'pontos_ganhos': 0,
                'pontos_detalhes': {'total': 0, 'erro': erro},
                'pontos_totais': pontosUsuarioModel.get_pontos_cliente(cliente_id, restaurante_id),
                'ja_ganhou_hoje': True,
                'erro': erro
            }
        
        print(f"🎁 Pontos de avaliação concedidos:")
        print(f"   Cliente: {cliente_id}")
        print(f"   Restaurante: {restaurante_id}")
        print(f"   Pontos ganhos: 20")
        
        return {
            'pontos_ganhos': 20,
            'pontos_detalhes': {'base': 20, 'total': 20},
            'pontos_totais': pontosUsuarioModel.get_pontos_cliente(cliente_id, restaurante_id),
            'ja_ganhou_hoje': False
        }
    
    @classmethod
    def processar_pontos_avaliacao_prato(cls, cliente_id, restaurante_id, nota, 
                                       comentario="", tem_imagens=False, avaliacao_id=None):
        """Processa pontos para avaliação de prato - LIMITADO A UMA VEZ POR DIA"""
        
        # ✅ NOVA REGRA: Verificar se já ganhou pontos hoje por avaliação de prato
        pode_ganhar, erro = historicoModel.conceder_pontos_avaliacao(
            cliente_id=cliente_id,
            restaurante_id=restaurante_id,
            pontos=10,  # Pontos fixos por avaliação de prato
            tipo_avaliacao='avaliacao_prato',
            avaliacao_id=avaliacao_id
        )
        
        if not pode_ganhar:
            print(f"🚫 {erro}")
            return {
                'pontos_ganhos': 0,
                'pontos_detalhes': {'total': 0, 'erro': erro},
                'pontos_totais': pontosUsuarioModel.get_pontos_cliente(cliente_id, restaurante_id),
                'ja_ganhou_hoje': True,
                'erro': erro
            }
        
        print(f"🎁 Pontos de avaliação de prato concedidos:")
        print(f"   Cliente: {cliente_id}")
        print(f"   Restaurante: {restaurante_id}")
        print(f"   Pontos ganhos: 10")
        
        return {
            'pontos_ganhos': 10,
            'pontos_detalhes': {'base': 10, 'total': 10},
            'pontos_totais': pontosUsuarioModel.get_pontos_cliente(cliente_id, restaurante_id),
            'ja_ganhou_hoje': False
        }
    
    @classmethod
    def get_pontos_preview(cls, tipo_avaliacao, nota, tem_comentario=False, 
                          tem_imagens=False, tamanho_comentario=0, is_primeira=False):
        """Retorna preview de quantos pontos o usuário ganharia (para exibir na UI)"""
        
        detalhes = cls.calcular_pontos_avaliacao(
            tipo_avaliacao=tipo_avaliacao,
            nota=nota,
            tem_comentario=tem_comentario,
            tem_imagens=tem_imagens,
            tamanho_comentario=tamanho_comentario,
            is_primeira_avaliacao=is_primeira,
            total_avaliacoes=0  # Para preview, não consideramos milestone
        )
        
        return detalhes