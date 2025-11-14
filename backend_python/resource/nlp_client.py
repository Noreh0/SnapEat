import requests
import json
from urllib.parse import urljoin
import os
import time

NLP_SERVICE_URL = os.getenv('NLP_SERVICE_URL', 'http://localhost:8100')

# Em nlp_client.py, modifique a função analisar_sentimento
# Em resource/nlp_client.py
def analisar_sentimento(texto, retry_on_error=True):
    """
    Envia um texto para análise de sentimento com retry.
    Utiliza exclusivamente a API DistilBERT para análise.
    """
    if not texto or len(texto.strip()) < 5:
        print("Texto vazio ou muito curto para análise de sentimento")
        return {"sentimento": "neutro", "label_id": 1}
    
    max_retries = 3
    retry_delay = 0.5  # segundos
    
    for attempt in range(max_retries):
        try:
            url = urljoin(NLP_SERVICE_URL, '/sentimento')
            payload = {"texto": texto}
            
            response = requests.post(
                url, 
                json=payload,
                timeout=5.0,  # Aumentado para 5 segundos
                headers={"Content-Type": "application/json"}
            )
            
            print(f"Análise de sentimento para '{texto[:30]}...': {response.status_code}")
            
            if response.status_code == 200:
                resultado = response.json()
                
                # Log mais detalhado para análise
                print(f"DistilBERT classificou: '{texto[:50]}...' como {resultado['sentimento']}")
                
                return resultado
            else:
                print(f"Erro na API de sentimento: {response.status_code} - {response.text}")
                
        except Exception as e:
            print(f"Erro ao chamar API de sentimento: {str(e)}")
        
        if attempt < max_retries - 1 and retry_on_error:
            print(f"Tentando novamente em {retry_delay}s...")
            time.sleep(retry_delay)
            retry_delay *= 2  # Aumentar o delay exponencialmente
    
    if not retry_on_error:
        return None
        
    # Fallback apenas quando todas as tentativas falharem
    print("Todas as tentativas à API falharam, usando fallback simples")
    return usar_fallback_sentimento(texto)
    
def analisar_denuncia(comentario, motivo_denuncia, nota_avaliacao=None):
    """
    Envia uma requisição ao serviço de IA para analisar uma denúncia.
    """
    try:
        url = urljoin(NLP_SERVICE_URL, '/analisar-denuncia')
        payload = {
            "comentario": comentario,
            "motivo_denuncia": motivo_denuncia,
            "nota_avaliacao": nota_avaliacao
        }
        
        print(f"Enviando para {url}: {payload}")
        
        response = requests.post(
            url, 
            json=payload,
            timeout=3.0,
            headers={"Content-Type": "application/json"}
        )
        
        print(f"Resposta do serviço de análise de denúncia: {response.status_code}")
        
        if response.status_code == 200:
            return response.json()
        else:
            print(f"Erro na resposta: {response.status_code} - {response.text}")
            return None
            
    except Exception as e:
        print(f"Erro ao analisar denúncia: {e}")
        return None
def usar_fallback_sentimento(texto):
    """Implementação de fallback quando o serviço NLP não está disponível"""
    texto_lower = texto.lower()
    
    # Palavras positivas em português
    palavras_positivas = ['bom', 'ótimo', 'excelente', 'incrível', 'gostoso', 'delicioso', 'adorei', 
                        'recomendo', 'maravilhoso', 'fantástico', 'perfeito', 'amei', 'surpreendente']
    
    # Palavras negativas em português
    palavras_negativas = ['ruim', 'péssimo', 'horrível', 'decepcionante', 'detestei', 'não recomendo', 
                        'terrível', 'nojento', 'desagradável', 'insatisfeito', 'reprovado', 'decepção']
    
    # Contar ocorrências
    positivas = sum(1 for palavra in palavras_positivas if palavra in texto_lower)
    negativas = sum(1 for palavra in palavras_negativas if palavra in texto_lower)
    
    # Determinar sentimento com base na contagem
    if positivas > negativas:
        return {"sentimento": "positivo", "label_id": 2}
    elif negativas > positivas:
        return {"sentimento": "negativo", "label_id": 0}
    else:
        return {"sentimento": "neutro", "label_id": 1}


class ContentFilter:
    """Classe para filtrar conteúdo ofensivo"""
    
    def __init__(self):
        self.palavras_ofensivas = [
            'merda', 'porra', 'caralho', 'fdp', 'puta', 'buceta', 'viado', 'cu', 'bosta',
            'idiota', 'babaca', 'imbecil', 'estúpido', 'retardado', 'burro', 'filho da puta',
            'vadia', 'vagabundo', 'otário', 'corno', 'lixo', 'escroto'
        ]
    
    def verificar_e_censurar(self, texto):
        """
        Verifica se o texto contém palavras ofensivas e as censura.
        Retorna o texto filtrado e um booleano indicando se foi encontrada ofensa.
        """
        if not texto:
            return texto, False
            
        texto_filtrado = texto
        contem_ofensa = False
        
        try:
            # Tentar usar serviço de filtro externo
            url = urljoin(NLP_SERVICE_URL, '/filtrar-conteudo')
            payload = {'texto': texto, 'filtrar': True}
            
            try:
                response = requests.post(url, json=payload, timeout=1.0)
                if response.status_code == 200:
                    result = response.json()
                    return result['texto_filtrado'], result['contem_ofensa']
            except:
                # Se falhar, continua com o filtro simples
                pass
                
            # Filtro simples
            import re
            for palavra in self.palavras_ofensivas:
                pattern = r'\b' + re.escape(palavra) + r'\b'
                if re.search(pattern, texto_filtrado, re.IGNORECASE):
                    contem_ofensa = True
                    substituicao = '*' * len(palavra)
                    texto_filtrado = re.sub(pattern, substituicao, texto_filtrado, flags=re.IGNORECASE)
                    
            return texto_filtrado, contem_ofensa
            
        except Exception as e:
            print(f"Erro ao filtrar conteúdo: {e}")
            return texto, False