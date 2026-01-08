# 🔐 Guia de Segurança - SnapEats Backend

## ⚠️ IMPORTANTE: Credenciais Removidas

Este repositório teve **TODAS as credenciais sensíveis removidas** para segurança. Você precisará configurar suas próprias credenciais para executar o projeto localmente.

---

## 🚨 Credenciais que Foram Removidas

### ❌ **O que NÃO está mais no código:**
- ✗ Senhas de banco de dados
- ✗ Chaves JWT secretas
- ✗ Credenciais do Firebase (arquivo JSON)
- ✗ Tokens do Azure Communication Services
- ✗ Senhas de email Gmail/SMTP
- ✗ IDs específicos de projetos

### ✅ **O que você encontrará:**
- ✓ Placeholders seguros no arquivo `.env`
- ✓ Exemplo de configuração em `.env.example`
- ✓ Código preparado para variáveis de ambiente
- ✓ Documentação de como configurar

---

## 🛠️ Como Configurar Seu Ambiente Local

### **1. Configurar Variáveis de Ambiente**

#### **Passo 1: Copiar o arquivo de exemplo**
```bash
cd backend_python
cp .env.example .env
```

#### **Passo 2: Editar o arquivo `.env`**
Abra o arquivo `.env` e preencha com SUAS credenciais:

```bash
# =============================================================================
# SnapEats Backend - Suas Configurações
# =============================================================================

# 🔐 Segurança (Gere chaves fortes!)
SECRET_KEY=sua-chave-secreta-aqui-minimo-32-caracteres
JWT_SECRET_KEY=sua-jwt-secret-key-aqui-minimo-32-caracteres

# 🗄️ Banco de Dados MySQL
DB_HOST=localhost
DB_PORT=7000
DB_USER=root
DB_PASSWORD=sua-senha-do-mysql
DB_NAME=SnapEats

# ☁️ Azure Communication Services
AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://SEU-RECURSO.communication.azure.com/;accesskey=SUA_CHAVE_AQUI
AZURE_SENDER_EMAIL=DoNotReply@SEU-DOMINIO.azurecomm.net

# 📧 Gmail/SMTP (alternativo)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USE_TLS=true
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=sua-senha-de-app-do-gmail
MAIL_DEFAULT_SENDER=seu-email@gmail.com

# 🔥 Firebase
FIREBASE_CREDENTIALS_PATH=./seu-arquivo-firebase-credentials.json
FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
FIREBASE_API_KEY=sua-api-key-do-firebase
FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
FIREBASE_PROJECT_ID=seu-projeto-id
FIREBASE_DATABASE_URL=https://seu-projeto.firebaseio.com
FIREBASE_MESSAGING_SENDER_ID=seu-sender-id

# 🌐 URLs
FRONTEND_BASE_URL=http://localhost:4200
NLP_SERVICE_URL=http://localhost:8100

# 🛠️ Ambiente
FLASK_ENV=development
FLASK_DEBUG=true
```

---

### **2. Obter Credenciais Necessárias**

#### **🔥 Firebase (Obrigatório para upload de imagens)**

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou selecione um existente
3. Vá em **Configurações do Projeto** (ícone de engrenagem)
4. Aba **Contas de Serviço**
5. Clique em **Gerar nova chave privada**
6. Salve o arquivo JSON baixado como `firebase-credentials.json` no diretório `backend_python/`
7. Configure no `.env`:
   ```bash
   FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
   FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
   ```

#### **☁️ Azure Communication Services (Obrigatório para emails)**

1. Acesse o [Azure Portal](https://portal.azure.com/)
2. Crie um recurso **Communication Services**
3. Após criar, vá em **Keys and Endpoint**
4. Copie a **Connection String**
5. Configure no `.env`:
   ```bash
   AZURE_COMMUNICATION_CONNECTION_STRING=endpoint=https://...;accesskey=...
   ```

#### **📧 Gmail SMTP (Alternativo para emails)**

1. Ative a verificação em 2 etapas na sua conta Google
2. Gere uma **Senha de App**:
   - Acesse: https://myaccount.google.com/apppasswords
   - Crie uma senha para "Email"
3. Configure no `.env`:
   ```bash
   MAIL_USERNAME=seu-email@gmail.com
   MAIL_PASSWORD=senha-de-app-gerada-aqui
   ```

#### **🗄️ MySQL (Banco de Dados)**

1. Instale o MySQL Server localmente
2. Crie o banco de dados:
   ```sql
   CREATE DATABASE SnapEats;
   ```
3. Configure no `.env`:
   ```bash
   DB_USER=root
   DB_PASSWORD=sua-senha-mysql
   DB_PORT=7000  # ou 3306 (porta padrão)
   ```

---

### **3. Gerar Chaves Secretas Seguras**

Para gerar chaves fortes para `SECRET_KEY` e `JWT_SECRET_KEY`:

#### **Opção 1: Python**
```python
import secrets
print(secrets.token_urlsafe(32))
```

#### **Opção 2: OpenSSL**
```bash
openssl rand -base64 32
```

#### **Opção 3: Online**
Use: https://randomkeygen.com/ (CodeIgniter Encryption Keys)

---

### **4. Executar Migrações do Banco de Dados**

Após configurar o banco de dados:

```bash
# Criar tabelas iniciais
python createDatabase.py

# Executar migrações
python migrations/add_firebase_uid.py
python migrations/create_cupons_system.py
python migrations/add_imagens_to_avaliacao_prato.py
```

---

### **5. Testar a Configuração**

```bash
# Instalar dependências
pip install -r requirements.txt

# Executar o servidor
python main.py

# Acessar a API
# http://localhost:5000
```

---

## 📋 Checklist de Segurança

Antes de fazer commit:

- [ ] ✅ Arquivo `.env` está no `.gitignore`
- [ ] ✅ Nenhuma senha hardcoded no código
- [ ] ✅ Arquivo Firebase JSON não está commitado
- [ ] ✅ Todas as credenciais usam variáveis de ambiente
- [ ] ✅ `.env.example` tem apenas placeholders
- [ ] ✅ README tem instruções de configuração

---

## 🚫 Arquivos que NUNCA Devem Ser Commitados

```
❌ .env
❌ *firebase*.json
❌ *.pem, *.key
❌ Qualquer arquivo com credenciais reais
```

O arquivo `.gitignore` já está configurado para prevenir isso!

---

## 🆘 Problemas Comuns

### **Erro: "Firebase credentials not found"**
**Solução:** Configure `FIREBASE_CREDENTIALS_PATH` no `.env` com o caminho correto do arquivo JSON

### **Erro: "Database connection failed"**
**Solução:** Verifique se:
- MySQL está rodando
- Credenciais no `.env` estão corretas
- Banco de dados `SnapEats` foi criado

### **Erro: "JWT decode error"**
**Solução:** Verifique se `JWT_SECRET_KEY` no `.env` está configurado

### **Erro ao enviar emails**
**Solução:** Configure Azure Communication Services OU Gmail SMTP no `.env`

---

## 🔒 Boas Práticas de Segurança

1. **NUNCA** commite arquivos `.env` ou credenciais
2. **SEMPRE** use variáveis de ambiente para dados sensíveis
3. **GERE** chaves secretas fortes (mínimo 32 caracteres)
4. **ROTACIONE** credenciais periodicamente
5. **USE** senhas diferentes para cada serviço
6. **ATIVE** autenticação em 2 fatores quando possível
7. **REVISE** o `.gitignore` antes de fazer push

---

## 📚 Documentação Adicional

- [Firebase Setup Guide](https://firebase.google.com/docs/admin/setup)
- [Azure Communication Services](https://learn.microsoft.com/azure/communication-services/)
- [Flask Configuration](https://flask.palletsprojects.com/en/2.3.x/config/)
- [Python dotenv](https://pypi.org/project/python-dotenv/)

---

## 🆘 Suporte

Se tiver problemas com a configuração:

1. Verifique que todas as variáveis no `.env` estão preenchidas
2. Consulte este guia de segurança
3. Verifique os logs de erro da aplicação
4. Abra uma issue no repositório (sem incluir credenciais!)

---

## ✅ Resumo Rápido

```bash
# 1. Copiar arquivo de exemplo
cp .env.example .env

# 2. Editar .env com suas credenciais
nano .env

# 3. Baixar credenciais do Firebase
# Salvar como firebase-credentials.json

# 4. Instalar dependências
pip install -r requirements.txt

# 5. Criar banco de dados
python createDatabase.py

# 6. Executar migrações
python migrations/add_firebase_uid.py

# 7. Iniciar servidor
python main.py
```

---

**🔐 Lembre-se: Segurança é responsabilidade de todos! Mantenha suas credenciais protegidas.**
