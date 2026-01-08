# migrations/add_firebase_uid.py
import pymysql
import os
from dotenv import load_dotenv

load_dotenv()

def migrate():
    try:
        connection = pymysql.connect(
            host=os.getenv('DB_HOST', 'localhost'),
            port=int(os.getenv('DB_PORT', '7000')),
            user=os.getenv('DB_USER', 'root'),
            password=os.getenv('DB_PASSWORD', ''),
            database=os.getenv('DB_NAME', 'SnapEats')
        )
        
        with connection.cursor() as cursor:
            # Adicionar coluna à tabela Cliente
            cursor.execute("SHOW COLUMNS FROM `Cliente` LIKE 'firebase_uid'")
            result = cursor.fetchone()
            
            if not result:
                print("Adicionando coluna firebase_uid à tabela Cliente...")
                cursor.execute("ALTER TABLE `Cliente` ADD COLUMN `firebase_uid` VARCHAR(128) NULL UNIQUE")
                connection.commit()
                print("Coluna adicionada com sucesso à tabela Cliente!")
            else:
                print("A coluna firebase_uid já existe na tabela Cliente.")
                
            # Adicionar coluna à tabela Restaurante
            cursor.execute("SHOW COLUMNS FROM `Restaurante` LIKE 'firebase_uid'")
            result = cursor.fetchone()
            
            if not result:
                print("Adicionando coluna firebase_uid à tabela Restaurante...")
                cursor.execute("ALTER TABLE `Restaurante` ADD COLUMN `firebase_uid` VARCHAR(128) NULL UNIQUE")
                connection.commit()
                print("Coluna adicionada com sucesso à tabela Restaurante!")
            else:
                print("A coluna firebase_uid já existe na tabela Restaurante.")
                
    except Exception as e:
        print(f"Erro ao executar migração: {e}")
        
    finally:
        if 'connection' in locals():
            connection.close()

if __name__ == "__main__":
    migrate()