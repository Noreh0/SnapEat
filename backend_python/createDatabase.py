import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

conexao = mysql.connector.connect(
    user=os.getenv('DB_USER', 'root'),
    password=os.getenv('DB_PASSWORD', ''),
    host=os.getenv('DB_HOST', 'localhost'),
    port=int(os.getenv('DB_PORT', '7000')),
    database=os.getenv('DB_NAME', 'SnapEats')
)

cursor = conexao.cursor()

# Exemplo de comando
comando = ""
cursor.execute(comando)
conexao.commit()

conexao.close()