import mysql.connector

conexao = mysql.connector.connect(
    user='root',
    password='SnapEats17',
    host='localhost',
    port=7000,
    database='SnapEats'
)

cursor = conexao.cursor()

# Exemplo de comando
comando = ""
cursor.execute(comando)
conexao.commit()

conexao.close()