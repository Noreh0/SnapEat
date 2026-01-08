FROM python:3.9-slim

WORKDIR /app

# Instalar dependências
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar código
COPY . .

# Variáveis de ambiente serão fornecidas em tempo de execução
# NÃO defina credenciais diretamente aqui!
# Use docker run -e ou docker-compose.yml para configurar:
# - DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
# - JWT_SECRET_KEY, SECRET_KEY
# - FIREBASE_CREDENTIALS_PATH
# - AZURE_COMMUNICATION_CONNECTION_STRING

# Porta exposta
EXPOSE 5000

# Comando para iniciar a aplicação
CMD ["python", "main.py"]
