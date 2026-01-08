# 🍽️ SnapEats Backend API

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0.3-green.svg)](https://flask.palletsprojects.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Tests](https://img.shields.io/badge/Tests-Passing-brightgreen.svg)](tests/)

> API RESTful completa para sistema de avaliação de restaurantes com Inteligência Artificial, análise de sentimentos e moderação automática de conteúdo.

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Tecnologias](#-tecnologias)
- [Funcionalidades](#-funcionalidades)
- [Arquitetura](#-arquitetura)
- [Instalação](#-instalação)
- [Configuração](#-configuração)
- [Execução](#-execução)
- [Endpoints da API](#-endpoints-da-api)
- [Testes](#-testes)
- [Segurança](#-segurança)
- [Docker](#-docker)
- [Contribuindo](#-contribuindo)

---

## 🎯 Visão Geral

O **SnapEats Backend** é uma API RESTful robusta construída com Flask que alimenta a plataforma SnapEats - um sistema completo de avaliação de restaurantes. A API oferece autenticação segura, integração com serviços de nuvem (Firebase, Azure), análise de sentimentos com IA e um sistema completo de gamificação.

### **Principais Diferenciais:**

- 🧠 **Integração com IA** para análise de sentimentos em avaliações
- 🔐 **Autenticação JWT** segura com múltiplos tipos de usuário
- 🛡️ **Moderação Automática** de conteúdo ofensivo
- 🔥 **Firebase Storage** para upload de imagens
- ☁️ **Azure Communication Services** para envio de emails
- 🏆 **Sistema de Gamificação** com pontos, cupons e tags
- 📊 **Dashboard Analytics** com métricas em tempo real
- 🌍 **Geolocalização** para busca de restaurantes próximos
- 📧 **Sistema de Notificações** via email e push

---

## 🛠️ Tecnologias

### **Core Framework:**
- **Flask 3.0.3** - Framework web principal
- **Flask-RESTX** - Extensão para APIs REST com Swagger/OpenAPI
- **Python 3.9+** - Linguagem de programação

### **Banco de Dados:**
- **MySQL** - Banco de dados relacional principal
- **SQLAlchemy** - ORM para mapeamento objeto-relacional
- **PyMySQL** - Driver MySQL para Python

### **Autenticação & Segurança:**
- **Flask-JWT-Extended** - Autenticação via JSON Web Tokens
- **python-dotenv** - Gerenciamento de variáveis de ambiente
- **Flask-CORS** - Configuração de Cross-Origin Resource Sharing

### **Serviços em Nuvem:**
- **Firebase Admin SDK** - Autenticação e Storage
- **Azure Communication Services** - Envio de emails
- **Flask-Mail** - Email alternativo via SMTP

### **Qualidade de Código:**
- **pytest** - Framework de testes
- **pytest-cov** - Cobertura de testes
- **pytest-flask** - Testes específicos para Flask

---

## ⚡ Funcionalidades

### **1. Sistema de Autenticação** 🔐

#### **Múltiplos Tipos de Usuário:**
- **Clientes** - Usuários que avaliam restaurantes
- **Restaurantes** - Proprietários de estabelecimentos
- **Administradores** - Moderadores da plataforma

#### **Recursos:**
- ✅ Cadastro e login com JWT
- ✅ Autenticação via Firebase (Google, Facebook, Email)
- ✅ Recuperação de senha via email
- ✅ Logout com blacklist de tokens
- ✅ Refresh tokens automático

**Endpoints:**
```http
POST /auth/cadastro          # Cadastro de novo usuário
POST /auth/login             # Login e geração de token JWT
POST /auth/logout            # Logout e invalidação de token
POST /auth/firebase/login    # Login via Firebase
POST /recuperar-senha        # Recuperação de senha por email
```

---

### **2. Gerenciamento de Restaurantes** 🏪

#### **Recursos:**
- ✅ CRUD completo de restaurantes
- ✅ Upload de imagens para Firebase Storage
- ✅ Geolocalização (latitude/longitude)
- ✅ Categorização por tipo de culinária
- ✅ Busca avançada e filtros
- ✅ Busca por proximidade geográfica

#### **Funcionalidades Avançadas:**
- 📍 **Restaurantes Próximos** - Busca por raio de distância
- 🔍 **Pesquisa Inteligente** - Por nome, categoria, localização
- 🏷️ **Sistema de Tags** - Categorização detalhada
- 📊 **Estatísticas** - Média de avaliações, total de reviews

**Endpoints:**
```http
GET    /restaurantes                    # Listar todos os restaurantes
GET    /restaurante/{id}                # Detalhes de um restaurante
POST   /restaurante                     # Cadastrar novo restaurante
PUT    /restaurante/{id}                # Atualizar restaurante
DELETE /restaurante/{id}                # Remover restaurante
GET    /restaurante/tipo/{tipo}         # Filtrar por tipo de culinária
GET    /restaurantes-proximos           # Buscar por proximidade
POST   /pesquisar-restaurante           # Busca avançada
```

---

### **3. Sistema de Avaliações** ⭐

#### **Avaliações de Restaurantes:**
- ✅ Avaliação com nota (1-5 estrelas)
- ✅ Comentários escritos
- ✅ **Análise de Sentimentos via IA** (Positivo/Neutro/Negativo)
- ✅ Upload de múltiplas imagens
- ✅ Histórico completo de avaliações

#### **Avaliações de Pratos:**
- ✅ Avaliação específica de pratos do cardápio
- ✅ Upload de fotos dos pratos
- ✅ Análise de sentimentos automática
- ✅ Moderação de conteúdo ofensivo

#### **Integração com IA:**
```python
# Cada comentário é automaticamente analisado por IA
{
  "comentario": "Comida excelente, mas atendimento demorado",
  "sentimento": "neutro",          # IA determina sentimento
  "confianca": 0.78,                # Nível de confiança
  "moderado": false                 # Filtro de conteúdo
}
```

**Endpoints:**
```http
# Avaliações de Restaurantes
GET    /avaliacoes                      # Listar todas avaliações
GET    /avaliacoes/{restaurante_id}    # Avaliações de um restaurante
POST   /avaliacao                       # Criar nova avaliação
PUT    /avaliacao/{id}                  # Atualizar avaliação
DELETE /avaliacao/{id}                  # Remover avaliação

# Avaliações de Pratos
GET    /pratos/{restaurante_id}        # Pratos de um restaurante
POST   /prato                          # Cadastrar prato
POST   /avaliacao-prato                # Avaliar prato específico
GET    /avaliacoes-prato/{prato_id}   # Avaliações de um prato
```

---

### **4. Análise de Sentimentos com IA** 🧠

#### **Integração com Serviço de NLP:**
- 🤖 **Modelo DistilBERT** treinado em português
- 📊 **3 Classes**: Positivo, Neutro, Negativo
- ⚡ **Análise em Tempo Real** de comentários
- 🎯 **90%+ de Precisão** em dados reais

#### **Moderação de Conteúdo:**
- 🛡️ **Filtro Automático** de palavrões e conteúdo ofensivo
- 🚫 **Detecção de Spam** e comentários inadequados
- ⚠️ **Sistema de Denúncias** com priorização por IA

**Endpoints:**
```http
POST /sentimento                  # Analisar sentimento de texto
POST /filtrar-conteudo           # Moderar conteúdo automaticamente
POST /analisar-denuncia          # Analisar denúncia com IA
```

---

### **5. Sistema de Gamificação** 🏆

#### **Pontos e Recompensas:**
- ⭐ **Sistema de Pontos** por contribuições
- 🎁 **Cupons de Desconto** gerados automaticamente
- 🏅 **Tags e Conquistas** para restaurantes
- 📈 **Ranking** de usuários e restaurantes

#### **Como Funciona:**
```
✅ Criar avaliação      → +10 pontos
✅ Upload de foto       → +5 pontos
✅ Avaliação útil       → +3 pontos
✅ 100 pontos acumulados → Cupom de 10% OFF
```

#### **Tags de Restaurantes:**
- 🌱 "Melhor Vegano"
- 🍕 "Pizza Campeã"
- 🎂 "Sobremesa Incrível"
- ⚡ "Entrega Rápida"

**Endpoints:**
```http
# Pontos e Cupons
GET    /pontos/{usuario_id}           # Saldo de pontos
GET    /historico-pontos/{usuario_id} # Histórico detalhado
GET    /cupons/{usuario_id}           # Cupons disponíveis
POST   /cupom/usar/{cupom_id}         # Utilizar cupom

# Tags e Conquistas
GET    /tags/restaurante/{id}         # Tags de um restaurante
POST   /tags/avaliar                  # Avaliar tag
GET    /tags/ranking                  # Ranking de tags
```

---

### **6. Sistema de Denúncias** 🚨

#### **Moderação Inteligente:**
- 📝 Denúncias de avaliações inadequadas
- 🤖 **Triagem Automática por IA** (Alta/Média/Baixa prioridade)
- ⚡ Ações rápidas: Aprovar/Rejeitar/Editar
- 📊 Painel administrativo para moderadores

#### **Tipos de Denúncia:**
- Conteúdo Ofensivo
- Spam
- Informação Falsa
- Avaliação Duplicada
- Conflito de Interesses

**Endpoints:**
```http
POST   /denuncia                  # Criar denúncia
GET    /denuncias                 # Listar denúncias (Admin)
PUT    /denuncia/{id}/aprovar     # Aprovar denúncia
PUT    /denuncia/{id}/rejeitar    # Rejeitar denúncia
```

---

### **7. Notificações e Emails** 📧

#### **Azure Communication Services:**
- ✉️ Emails transacionais profissionais
- ⚡ Alta disponibilidade e escalabilidade
- 📊 Tracking de entregas

#### **Tipos de Notificações:**
- 🔔 Nova avaliação recebida
- 💬 Resposta a comentário
- 🎁 Cupom disponível
- ⚠️ Denúncia aprovada
- 🎉 Conquista desbloqueada

**Endpoints:**
```http
POST /notificacoes/enviar         # Enviar notificação
GET  /notificacoes/{usuario_id}   # Listar notificações
PUT  /notificacao/{id}/ler        # Marcar como lida
```

---

### **8. Upload de Imagens** 📸

#### **Firebase Storage:**
- 📤 Upload direto para Firebase Cloud Storage
- 🖼️ Suporte a múltiplas imagens
- 🔒 URLs seguras com controle de acesso
- 📏 Validação de tamanho e formato
- 🗑️ Gerenciamento de exclusão

**Formatos Suportados:**
- JPG/JPEG
- PNG
- WebP

**Endpoints:**
```http
POST   /upload/imagem              # Upload de imagem
DELETE /upload/imagem/{path}       # Remover imagem
```

---

## 🏗️ Arquitetura

```
backend_python/
├── 📁 models/                    # Modelos de dados (SQLAlchemy)
│   ├── usuario.py               # Modelo de Usuário
│   ├── restaurante.py           # Modelo de Restaurante
│   ├── avaliacao.py             # Modelo de Avaliação
│   ├── avaliacao_prato.py       # Avaliação de Pratos
│   ├── prato.py                 # Modelo de Prato
│   ├── cupom.py                 # Sistema de Cupons
│   ├── pontos_usuario.py        # Pontos e Histórico
│   ├── tag_restaurante.py       # Tags e Conquistas
│   └── denuncia.py              # Sistema de Denúncias
│
├── 📁 resource/                  # Controllers/Resources (API Endpoints)
│   ├── auth_usuario.py          # Autenticação tradicional
│   ├── auth_firebase.py         # Autenticação Firebase
│   ├── usuario.py               # CRUD de Usuários
│   ├── restaurante.py           # CRUD de Restaurantes
│   ├── avaliacao.py             # Gerenciamento de Avaliações
│   ├── avaliacao_prato.py       # Avaliações de Pratos
│   ├── prato.py                 # Gerenciamento de Pratos
│   ├── cupom.py                 # Sistema de Cupons
│   ├── denuncia.py              # Sistema de Denúncias
│   ├── tags_api.py              # API de Tags
│   ├── sentimento.py            # Integração com IA
│   ├── notificacoes.py          # Sistema de Notificações
│   ├── firebase_storage.py      # Upload de Imagens
│   └── content_filter.py        # Filtro de Conteúdo
│
├── 📁 services/                  # Serviços de Negócio
│   ├── email_service.py         # Serviço de Email (Azure)
│   ├── notification_service.py  # Serviço de Notificações
│   └── pontos_service.py        # Lógica de Pontuação
│
├── 📁 migrations/                # Scripts de Migração de DB
│   ├── add_firebase_uid.py
│   ├── create_cupons_system.py
│   └── add_imagens_to_avaliacao_prato.py
│
├── 📁 tests/                     # Testes Automatizados
│   ├── test_models/             # Testes de Modelos
│   ├── test_resources/          # Testes de Endpoints
│   ├── test_services/           # Testes de Serviços
│   └── conftest.py              # Configuração de Testes
│
├── 📁 docs/                      # Documentação
│   └── api_models.py            # Modelos para Swagger
│
├── 📁 scripts/                   # Scripts Utilitários
│   ├── deploy_docs.py           # Deploy de Documentação
│   └── monitor_docs.py          # Monitoramento
│
├── main.py                       # Ponto de entrada da aplicação
├── sql_alchemy.py               # Configuração do SQLAlchemy
├── blacklist.py                 # Blacklist de tokens JWT
├── createDatabase.py            # Script de criação do DB
├── requirements.txt             # Dependências Python
├── .env                         # Variáveis de ambiente (não versionado)
├── .env.example                 # Exemplo de configuração
├── .gitignore                   # Arquivos ignorados pelo Git
├── Dockerfile                   # Container Docker
└── docker-compose.yml           # Orquestração de containers
```

---

## 🚀 Instalação

### **Pré-requisitos:**

```bash
✅ Python 3.9 ou superior
✅ MySQL 8.0+
✅ pip (gerenciador de pacotes Python)
✅ Git
```

### **1. Clone o Repositório:**

```bash
git clone https://github.com/Noreh0/SnapEat.git
cd SnapEat/backend_python
```

### **2. Crie um Ambiente Virtual:**

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Linux/Mac
python3 -m venv venv
source venv/bin/activate
```

### **3. Instale as Dependências:**

```bash
pip install -r requirements.txt
```

---

## ⚙️ Configuração

### **1. Configure o Banco de Dados:**

```bash
# Criar banco de dados MySQL
mysql -u root -p
CREATE DATABASE SnapEats;
exit;
```

### **2. Configure as Variáveis de Ambiente:**

```bash
# Copiar arquivo de exemplo
cp .env.example .env

# Editar com suas credenciais
nano .env
```

**Variáveis Obrigatórias:**

```env
# 🔐 Segurança
SECRET_KEY=sua-chave-secreta-32-caracteres-minimo
JWT_SECRET_KEY=sua-jwt-secret-key-32-caracteres-minimo

# 🗄️ Banco de Dados
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua-senha-mysql
DB_NAME=SnapEats

# ☁️ Azure (opcional)
AZURE_COMMUNICATION_CONNECTION_STRING=sua-connection-string
AZURE_SENDER_EMAIL=seu-email@azurecomm.net

# 📧 Email SMTP (opcional)
MAIL_SERVER=smtp.gmail.com
MAIL_PORT=587
MAIL_USERNAME=seu-email@gmail.com
MAIL_PASSWORD=sua-senha-de-app

# 🔥 Firebase (opcional)
FIREBASE_CREDENTIALS_PATH=./firebase-credentials.json
FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app

# 🧠 IA Service
NLP_SERVICE_URL=http://localhost:8100
```

### **3. Execute as Migrações:**

```bash
# Criar estrutura do banco
python createDatabase.py

# Executar migrações adicionais
python migrations/add_firebase_uid.py
python migrations/create_cupons_system.py
python migrations/add_imagens_to_avaliacao_prato.py
```

---

## ▶️ Execução

### **Modo Desenvolvimento:**

```bash
# Ativar ambiente virtual
source venv/bin/activate  # Linux/Mac
venv\Scripts\activate     # Windows

# Executar servidor
python main.py

# Servidor rodando em: http://localhost:5000
```

### **Modo Produção (Gunicorn):**

```bash
gunicorn -w 4 -b 0.0.0.0:5000 main:app
```

### **Acessar Documentação Interativa:**

Após iniciar o servidor, acesse:
- **Swagger UI**: http://localhost:5000/docs
- **OpenAPI JSON**: http://localhost:5000/openapi.json

---

## 📡 Endpoints da API

### **Documentação Completa:**

A API possui **documentação interativa completa** via Swagger/OpenAPI em:
```
http://localhost:5000/docs
```

### **Principais Rotas:**

#### **🔐 Autenticação:**
```
POST   /auth/cadastro
POST   /auth/login
POST   /auth/logout
POST   /auth/firebase/login
POST   /recuperar-senha
```

#### **👤 Usuários:**
```
GET    /cliente/{id}
PUT    /cliente/{id}
DELETE /cliente/{id}
GET    /clientes
```

#### **🏪 Restaurantes:**
```
GET    /restaurantes
GET    /restaurante/{id}
POST   /restaurante
PUT    /restaurante/{id}
DELETE /restaurante/{id}
GET    /restaurantes-proximos
```

#### **⭐ Avaliações:**
```
GET    /avaliacoes
GET    /avaliacoes/{restaurante_id}
POST   /avaliacao
PUT    /avaliacao/{id}
DELETE /avaliacao/{id}
```

#### **🍕 Pratos:**
```
GET    /pratos/{restaurante_id}
POST   /prato
POST   /avaliacao-prato
```

#### **🧠 IA e Análise:**
```
POST   /sentimento
POST   /filtrar-conteudo
POST   /analisar-denuncia
```

#### **🎁 Gamificação:**
```
GET    /pontos/{usuario_id}
GET    /cupons/{usuario_id}
POST   /cupom/usar/{cupom_id}
GET    /tags/ranking
```

---

## 🧪 Testes

### **Executar Todos os Testes:**

```bash
pytest
```

### **Com Cobertura de Código:**

```bash
pytest --cov=. --cov-report=html
```

### **Relatório de Cobertura:**

```bash
# Gerar relatório HTML
pytest --cov=. --cov-report=html

# Abrir relatório
open htmlcov/index.html
```

### **Testes Específicos:**

```bash
# Testar apenas modelos
pytest tests/test_models/

# Testar apenas endpoints
pytest tests/test_resources/

# Testar apenas serviços
pytest tests/test_services/
```

### **Estrutura de Testes:**

```
tests/
├── conftest.py              # Configuração global
├── test_main.py             # Testes da aplicação principal
├── test_models/             # Testes de modelos
│   ├── test_usuario.py
│   ├── test_restaurante.py
│   └── test_avaliacao.py
├── test_resources/          # Testes de endpoints
│   ├── test_auth.py
│   ├── test_restaurante_api.py
│   └── test_avaliacao_api.py
└── test_services/           # Testes de serviços
    ├── test_email_service.py
    └── test_notification_service.py
```

---

## 🔒 Segurança

### **🛡️ Medidas de Segurança Implementadas:**

#### **1. Autenticação JWT:**
- ✅ Tokens assinados com chave secreta forte
- ✅ Expiração automática de tokens
- ✅ Blacklist para logout
- ✅ Refresh tokens para sessões longas

#### **2. Variáveis de Ambiente:**
- ✅ **NUNCA** commitar arquivo `.env`
- ✅ Credenciais apenas em variáveis de ambiente
- ✅ `.gitignore` configurado corretamente
- ✅ Arquivo `.env.example` como referência

#### **3. Validação de Dados:**
- ✅ Validação de input em todos os endpoints
- ✅ Sanitização de dados do usuário
- ✅ Proteção contra SQL Injection (via SQLAlchemy)
- ✅ Proteção contra XSS

#### **4. CORS Configurado:**
- ✅ Apenas origens permitidas
- ✅ Métodos HTTP específicos
- ✅ Headers controlados

#### **5. Moderação de Conteúdo:**
- ✅ Filtro automático de palavrões
- ✅ Sistema de denúncias
- ✅ Análise de sentimentos para detectar conteúdo inadequado

### **⚠️ Arquivos Sensíveis (NÃO Commitar):**

```
❌ .env
❌ *firebase*.json
❌ *.key, *.pem
❌ Credenciais em geral
```

### **📋 Checklist de Segurança:**

Antes de fazer commit:
- [ ] ✅ `.env` está no `.gitignore`
- [ ] ✅ Nenhuma senha hardcoded no código
- [ ] ✅ Credenciais Firebase não commitadas
- [ ] ✅ Chaves secretas geradas com ≥32 caracteres
- [ ] ✅ CORS configurado corretamente

**📖 Consulte:** [`SECURITY.md`](SECURITY.md) para instruções detalhadas de configuração segura.

---

## 🐳 Docker

### **Executar com Docker:**

```bash
# Build da imagem
docker build -t snapeats-backend .

# Executar container
docker run -p 5000:5000 --env-file .env snapeats-backend
```

### **Docker Compose (Recomendado):**

```bash
# Subir todos os serviços
docker-compose up -d

# Ver logs
docker-compose logs -f

# Parar serviços
docker-compose down
```

### **Serviços no Docker Compose:**

```yaml
services:
  - snapeats-backend    # API principal
  - mysql               # Banco de dados
  - redis               # Cache (opcional)
  - nginx               # Proxy reverso
```

---

## 📊 Monitoramento

### **Health Check:**

```bash
GET /health
```

**Resposta:**
```json
{
  "status": "healthy",
  "database": "connected",
  "timestamp": "2026-01-08T12:00:00Z"
}
```

### **Métricas:**

```bash
GET /metrics
```

---

## 🤝 Contribuindo

Contribuições são bem-vindas! Por favor, siga estas diretrizes:

### **1. Fork o Projeto**
### **2. Crie uma Branch:**
```bash
git checkout -b feature/nova-funcionalidade
```

### **3. Commit suas Mudanças:**
```bash
git commit -m 'feat: adiciona nova funcionalidade'
```

### **4. Push para a Branch:**
```bash
git push origin feature/nova-funcionalidade
```

### **5. Abra um Pull Request**

### **Padrões de Código:**
- **Python**: PEP 8
- **Commits**: Conventional Commits
- **Testes**: Cobertura mínima 80%
- **Documentação**: Docstrings em funções

---

## 📝 Licença

Este projeto está sob a licença **MIT**. Veja o arquivo [LICENSE](LICENSE) para mais detalhes.

---

## 👥 Autores

- **Heron Ricardo** - *Desenvolvedor Principal* - [@Noreh0](https://github.com/Noreh0)

---

## 🙏 Agradecimentos

- **Flask Community** - Framework web excelente
- **Hugging Face** - Modelos de IA
- **Firebase** - Infraestrutura de autenticação e storage
- **Azure** - Serviços de comunicação
- **SQLAlchemy** - ORM poderoso e flexível

---

## 📞 Suporte

- 📧 **Email**: suporte@snapeats.com
- 🐛 **Issues**: [GitHub Issues](https://github.com/Noreh0/SnapEat/issues)
- 📚 **Docs**: [Documentação Completa](http://localhost:5000/docs)

---

## 🔄 Changelog

### **v2.0.0** (2026-01-08)
- ✨ Sistema de gamificação com pontos e cupons
- 🧠 Integração completa com IA para análise de sentimentos
- 🏷️ Sistema de tags e conquistas para restaurantes
- 🛡️ Moderação automática de conteúdo
- 📸 Upload de múltiplas imagens
- ☁️ Migração para Azure Communication Services

### **v1.0.0** (2025-11-01)
- 🎉 Lançamento inicial
- 🔐 Autenticação JWT
- 🏪 CRUD de restaurantes
- ⭐ Sistema de avaliações
- 🔥 Integração com Firebase

---

<div align="center">

### 🍽️ **SnapEats - Conectando Pessoas aos Melhores Sabores** 🍽️

**Feito com ❤️ e muito ☕ by Heron Ricardo**

[![GitHub](https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Noreh0)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/seu-perfil)

</div>
