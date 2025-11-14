import re
import nltk
from nltk.tokenize import word_tokenize

class ContentFilter:
    def __init__(self):
        # Lista de palavras ofensivas em português
        # Esta é uma lista básica que deve ser expandida conforme necessário
        self.palavras_ofensivas = [
            'merda', 'porra', 'caralho', 'fdp', 'puta', 'buceta', 'viado', 'cu', 'bosta',
            'idiota', 'babaca', 'imbecil', 'estúpido', 'retardado', 'burro', 'filho da puta',
            'vadia', 'vagabundo', 'otário', 'corno', 'lixo', 'escroto', 'arrombado', 'cuzão', 'merdinha', 'nojento', 'paspalho', 'abestado',
            'trouxa', 'mané', 'palhaço', 'boçal', 'animal', 'energúmeno',
            'capiroto', 'satanás', 'praga', 'miserável', 'inútil',
            'desgraçado', 'pilantra', 'canalha', 'crápula', 'verme',
            'meleca', 'asno', 'jegue', 'cretino', 'vadio',
            'otária', 'corna', 'arrombada', 'paspalha'

        ]
        
        # Certificar-se de que o NLTK está disponível
        try:
            nltk.data.find('tokenizers/punkt')
        except LookupError:
            nltk.download('punkt', quiet=True)
            
    def contem_conteudo_ofensivo(self, texto):
        """
        Verifica se o texto contém palavras ofensivas.
        Retorna True se contiver palavras ofensivas, False caso contrário.
        """
        if not texto:
            return False
            
        # Tokenizar o texto em palavras
        try:
            palavras = nltk.word_tokenize(texto.lower())
        except:
            # Fallback para split simples se nltk falhar
            palavras = texto.lower().split()
        
        # Verificar se alguma palavra ofensiva está presente
        for palavra in palavras:
            if palavra in self.palavras_ofensivas:
                return True
                
        # Verificar expressões compostas
        for ofensiva in [p for p in self.palavras_ofensivas if ' ' in p]:
            if ofensiva in texto.lower():
                return True
                
        # Regex para verificar palavras com pequenas variações (ex: p0rra, m3rda)
        for palavra in self.palavras_ofensivas:
            if len(palavra) >= 4:  # Apenas para palavras longas o suficiente
                # Criar padrão que permite algumas substituições de caracteres
                pattern = ''.join([
                    f"[{c}0-9@$]" if c.isalpha() else c
                    for c in palavra
                ])
                if re.search(pattern, texto.lower()):
                    return True
                
        return False
        
    def censurar_conteudo_ofensivo(self, texto):
        """
        Censura palavras ofensivas no texto.
        Retorna o texto com as palavras ofensivas substituídas por asteriscos.
        """
        if not texto:
            return texto
            
        texto_censurado = texto
        
        # Censurar palavras simples
        for palavra in self.palavras_ofensivas:
            if ' ' not in palavra:
                # Usar expressão regular para substituir a palavra inteira
                pattern = r'\b' + re.escape(palavra) + r'\b'
                substituicao = '*' * len(palavra)
                texto_censurado = re.sub(pattern, substituicao, texto_censurado, flags=re.IGNORECASE)
        
        # Censurar expressões compostas
        for expressao in [p for p in self.palavras_ofensivas if ' ' in p]:
            if expressao in texto_censurado.lower():
                # Substituir mantendo o mesmo comprimento
                substituicao = '*' * len(expressao)
                texto_censurado = texto_censurado.lower().replace(expressao, substituicao)
                
        return texto_censurado
        
    def verificar_e_censurar(self, texto):
        """
        Verifica se o texto contém conteúdo ofensivo e censura se necessário.
        Retorna uma tupla (texto_processado, contem_ofensa)
        """
        contem_ofensa = self.contem_conteudo_ofensivo(texto)
        if contem_ofensa:
            return self.censurar_conteudo_ofensivo(texto), True
        return texto, False