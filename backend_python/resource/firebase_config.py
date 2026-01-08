# resource/firebase_config.py
import firebase_admin
from firebase_admin import credentials, auth
import os
from dotenv import load_dotenv

load_dotenv()

# Caminho para o arquivo JSON de credenciais do Firebase
# Configure a variável FIREBASE_CREDENTIALS_PATH no arquivo .env
# Exemplo: FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
firebase_credentials_path = os.getenv('FIREBASE_CREDENTIALS_PATH')

try:
    if firebase_credentials_path and os.path.exists(firebase_credentials_path):
        cred = credentials.Certificate(firebase_credentials_path)
        firebase_app = firebase_admin.initialize_app(cred)
        firebase_enabled = True
        print("Firebase Admin SDK inicializado com sucesso!")
    else:
        firebase_enabled = False
        print("Arquivo de credenciais do Firebase não encontrado. Funcionalidade Firebase desativada.")
except Exception as e:
    firebase_enabled = False
    print(f"Erro ao inicializar Firebase Admin SDK: {e}")

def verify_firebase_token(id_token):
    """
    Verifica o token do Firebase e retorna as informações do usuário
    """
    if not firebase_enabled:
        raise Exception("Firebase não está configurado no backend")
    
    try:
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
    except Exception as e:
        print(f"Erro na verificação do token Firebase: {e}")
        raise