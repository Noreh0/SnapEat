#!/usr/bin/env python3
"""
Script para testar a configuração do Firebase Storage

Este script verifica se o Firebase Storage está configurado corretamente
e tenta fazer upload de um arquivo de teste.
"""

import os
import sys
import firebase_admin
from firebase_admin import credentials, storage
import argparse
from datetime import datetime

# Adicionar o diretório atual ao PYTHONPATH
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from firebase_storage import upload_image, get_image_url, delete_image

def create_test_file(filename="test_image.txt"):
    """Cria um arquivo de teste temporário."""
    with open(filename, "w") as f:
        f.write(f"Este é um arquivo de teste criado em {datetime.now().isoformat()}")
    return filename

def test_firebase_storage():
    """Executa testes para verificar se o Firebase Storage está funcionando corretamente."""
    print("=== Teste do Firebase Storage ===")
    
    # Verificar se o arquivo de credenciais existe
    creds_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
    if not creds_path or not os.path.isfile(creds_path):
        print(f"ERRO: Arquivo de credenciais não encontrado. Configure FIREBASE_CREDENTIALS_PATH no .env")
        return False
    
    # Criar um arquivo de teste
    test_file = create_test_file()
    print(f"Arquivo de teste criado: {test_file}")
    
    try:
        # Verificar se o app Firebase já foi inicializado
        print("Verificando se o Firebase foi inicializado...")
        storage_app = None
        for app in firebase_admin._apps:
            if app == 'storage_app':
                storage_app = firebase_admin.get_app(app)
                break
        
        if not storage_app:
            print("Inicializando o Firebase Storage...")
            cred = credentials.Certificate(creds_path)
            storage_app = firebase_admin.initialize_app(cred, {
                'storageBucket': 'snapeats-f8ca0.appspot.com'
            }, name='storage_app')
            print("Firebase Storage inicializado com sucesso.")
        
        # Testar acesso ao bucket
        print("Verificando acesso ao bucket...")
        bucket = storage.bucket(app=storage_app)
        print(f"Bucket acessado com sucesso: {bucket.name}")
        
        # Abrir o arquivo de teste para fazer upload
        print("Fazendo upload do arquivo de teste...")
        with open(test_file, "rb") as f:
            class MockFile:
                def __init__(self, file, name):
                    self.file = file
                    self.filename = name
                    
                def read(self):
                    return self.file.read()
                    
                def save(self, path):
                    with open(path, "wb") as dest:
                        self.file.seek(0)
                        dest.write(self.file.read())
            
            mock_file = MockFile(f, test_file)
            url = upload_image(mock_file, "test", f"test_{datetime.now().strftime('%Y%m%d_%H%M%S')}.txt")
            
            if url:
                print(f"Upload bem-sucedido! URL: {url}")
                print("Tentando excluir o arquivo...")
                if delete_image(url):
                    print("Arquivo excluído com sucesso!")
                else:
                    print("AVISO: Não foi possível excluir o arquivo.")
            else:
                print("ERRO: Falha no upload do arquivo.")
                return False
        
        # Limpar o arquivo de teste local
        if os.path.exists(test_file):
            os.remove(test_file)
            print(f"Arquivo de teste local removido: {test_file}")
            
        print("Todos os testes foram concluídos com sucesso!")
        return True
            
    except Exception as e:
        print(f"ERRO durante o teste: {e}")
        import traceback
        traceback.print_exc()
        return False
    finally:
        # Garantir que o arquivo de teste seja removido
        if os.path.exists(test_file):
            os.remove(test_file)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Teste do Firebase Storage")
    args = parser.parse_args()
    
    success = test_firebase_storage()
    sys.exit(0 if success else 1)
