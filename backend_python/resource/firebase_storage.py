import os
import firebase_admin
from firebase_admin import credentials, storage
import pyrebase
from datetime import datetime
from dotenv import load_dotenv
import uuid

load_dotenv()

# Variáveis de configuração - TODAS devem estar no arquivo .env
firebase_credentials_path = os.getenv('FIREBASE_CREDENTIALS_PATH')
firebase_storage_bucket = os.getenv('FIREBASE_STORAGE_BUCKET')
firebase_api_key = os.getenv('FIREBASE_API_KEY')
firebase_auth_domain = os.getenv('FIREBASE_AUTH_DOMAIN')
firebase_project_id = os.getenv('FIREBASE_PROJECT_ID')
firebase_database_url = os.getenv('FIREBASE_DATABASE_URL')
firebase_storage_url = os.getenv('FIREBASE_STORAGE_URL')
firebase_messaging_sender_id = os.getenv('FIREBASE_MESSAGING_SENDER_ID')

# Configuração do Firebase Storage usando firebase_admin para autenticação de serviço
try:
    # Verificar se já foi inicializado
    storage_app = None
    for app in firebase_admin._apps:
        if app == 'storage_app':
            storage_app = firebase_admin.get_app(app)
            break
    
    if not storage_app:
        if os.path.exists(firebase_credentials_path):
            cred = credentials.Certificate(firebase_credentials_path)
            storage_app = firebase_admin.initialize_app(cred, {
                'storageBucket': firebase_storage_bucket
            }, name='storage_app')
            print("Firebase Storage configurado com sucesso!")
        else:
            print("Arquivo de credenciais do Firebase não encontrado.")
except Exception as e:
    print(f"Erro ao configurar Firebase Storage: {e}")

# Configuração do Pyrebase para operações de cliente
firebase_config = {
    "apiKey": firebase_api_key,
    "authDomain": firebase_auth_domain,
    "projectId": firebase_project_id,
    "databaseURL": firebase_database_url,
    "storageBucket": firebase_storage_bucket,  # Use o valor correto do bucket
    "messagingSenderId": firebase_messaging_sender_id,
}

# Inicializar Pyrebase
firebase = None
pyrebase_storage = None

try:
    firebase = pyrebase.initialize_app(firebase_config)
    pyrebase_storage = firebase.storage()
    print("Pyrebase inicializado com sucesso!")
except Exception as e:
    print(f"Erro ao inicializar Pyrebase: {e}")

def upload_image(file_object, folder="restaurantes", filename=None, use_local_fallback=True):
    """
    Faz upload de uma imagem para o Firebase Storage com fallback para armazenamento local
    
    Args:
        file_object: Objeto de arquivo a ser enviado
        folder: Pasta no storage onde a imagem será armazenada
        filename: Nome opcional do arquivo. Se não fornecido, um nome único será gerado.
        use_local_fallback: Se True, salva o arquivo localmente caso o Firebase falhe
    
    Returns:
        URL pública da imagem armazenada ou caminho relativo se salvo localmente
    """
    if not filename:
        # Gerar nome único baseado em timestamp e UUID para evitar conflitos
        extension = file_object.filename.split('.')[-1]
        filename = f"{datetime.now().strftime('%Y%m%d_%H%M%S')}_{uuid.uuid4().hex[:8]}.{extension}"
    
    # Caminho completo no Firebase Storage
    storage_path = f"{folder}/{filename}"
    
    # Caminho para armazenamento local como fallback
    local_folder_path = os.path.join("static", "uploads", folder)
    local_file_path = os.path.join(local_folder_path, filename)
    
    # Garantir que a pasta local existe
    os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
    
    try:
        # Tentar fazer upload para o Firebase Storage
        if storage_app:
            # Salvar temporariamente o arquivo
            temp_file_path = os.path.join("/tmp" if os.path.exists("/tmp") else os.environ.get("TEMP", "."), filename)
            file_object.save(temp_file_path)
            
            # Fazer upload usando firebase_admin
            bucket = storage.bucket(app=storage_app)
            blob = bucket.blob(storage_path)
            blob.upload_from_filename(temp_file_path)
            
            # Tornar o arquivo publicamente acessível
            blob.make_public()
            
            # Remover o arquivo temporário
            os.remove(temp_file_path)
            
            print(f"Upload bem-sucedido para Firebase Storage: {blob.public_url}")
            return blob.public_url
        else:
            raise Exception("Firebase Storage não está configurado corretamente")
    
    except Exception as e:
        print(f"Erro ao fazer upload para Firebase Storage: {e}")
        import traceback
        traceback.print_exc()
        
        if use_local_fallback:
            print(f"Utilizando fallback para armazenamento local: {local_file_path}")
            # Salvar o arquivo localmente como fallback
            os.makedirs(os.path.dirname(local_file_path), exist_ok=True)
            file_object.save(local_file_path)
            
            # Retornar o caminho relativo para ser acessado via URL
            relative_path = f"/static/uploads/{folder}/{filename}"
            return relative_path
        
        return None

def get_image_url(image_path):
    """
    Determina se o caminho da imagem é uma URL do Firebase Storage ou um caminho local
    e retorna a URL apropriada.
    
    Args:
        image_path: URL do Firebase Storage ou caminho relativo local
        
    Returns:
        URL completa para acessar a imagem
    """
    if image_path is None:
        return None
        
    # Se já for uma URL completa (provavelmente do Firebase Storage)
    if image_path.startswith('http://') or image_path.startswith('https://'):
        return image_path
    
    # Se for um caminho relativo local
    if image_path.startswith('/static/'):
        # Construa a URL relativa para o servidor Flask
        return image_path
    
    # Se for apenas um nome de arquivo (caminho legacy)
    return f"/static/uploads/{image_path}" if image_path else None

def delete_image(image_path):
    """
    Deleta uma imagem do Firebase Storage ou armazenamento local
    
    Args:
        image_path: URL do Firebase Storage ou caminho relativo local
        
    Returns:
        bool: True se a deleção foi bem-sucedida, False caso contrário
    """
    try:
        # URL do Firebase Storage
        if image_path and image_path.startswith('https://storage.googleapis.com/'):
            if storage_app:
                # Extrair o caminho do objeto a partir da URL
                # Formato típico: https://storage.googleapis.com/snapeats-f8ca0.appspot.com/restaurantes/filename.jpg
                bucket_name = firebase_storage_bucket
                # Extrair o caminho relativo após o nome do bucket na URL
                path_parts = image_path.split(f'{bucket_name}/')
                if len(path_parts) > 1:
                    object_path = path_parts[1]
                    bucket = storage.bucket(app=storage_app)
                    blob = bucket.blob(object_path)
                    blob.delete()
                    print(f"Imagem excluída do Firebase Storage: {image_path}")
                    return True
                else:
                    print(f"Não foi possível extrair o caminho do objeto da URL: {image_path}")
                    return False
            else:
                print("Firebase Storage não está configurado corretamente")
                return False
                
        # Caminho local
        elif image_path and image_path.startswith('/static/'):
            # Converter caminho relativo para absoluto
            abs_path = os.path.join(os.getcwd(), image_path[1:])  # Remover a barra inicial
            if os.path.exists(abs_path):
                os.remove(abs_path)
                print(f"Imagem excluída do armazenamento local: {abs_path}")
                return True
            else:
                print(f"Arquivo não encontrado: {abs_path}")
                return False
        
        # Caminho legacy (apenas nome do arquivo)
        else:
            local_path = os.path.join(os.getcwd(), "static", "uploads", image_path)
            if os.path.exists(local_path):
                os.remove(local_path)
                print(f"Imagem legacy excluída: {local_path}")
                return True
            else:
                print(f"Arquivo legacy não encontrado: {local_path}")
                return False
    
    except Exception as e:
        print(f"Erro ao excluir imagem: {e}")
        import traceback
        traceback.print_exc()
        return False