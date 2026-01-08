# Firebase Storage Integration

Este documento descreve a implementação da integração com Firebase Storage para armazenar imagens do projeto SnapEats.

## Visão Geral

A implementação permite o upload de imagens para o Firebase Storage, com um mecanismo de fallback para armazenamento local quando o Firebase não estiver disponível. As principais funcionalidades são:

1. Upload de imagens para o Firebase Storage
2. Fallback para armazenamento local quando o Firebase falha
3. Obtenção de URLs públicas para as imagens
4. Exclusão de imagens quando necessário

## Arquivos Modificados

- `firebase_storage.py` - Implementação principal das funções de Firebase Storage
- `restaurante.py` - Atualizado para usar o Firebase Storage para uploads de imagens de restaurantes
- `prato.py` - Atualizado para usar o Firebase Storage para uploads de imagens de pratos

## Como Funciona

### Firebase Storage

O módulo `firebase_storage.py` inclui três funções principais:

1. `upload_image(file_object, folder="restaurantes", filename=None, use_local_fallback=True)`
   - Faz upload de imagens para o Firebase Storage
   - Com fallback para armazenamento local se o Firebase falhar
   - Retorna a URL pública ou o caminho relativo

2. `get_image_url(image_path)`
   - Determina se o caminho da imagem é uma URL do Firebase ou um caminho local
   - Retorna a URL apropriada para acesso

3. `delete_image(image_path)`
   - Deleta imagens do Firebase Storage ou armazenamento local

### Configuração

As credenciais e configurações do Firebase são carregadas a partir de:
- Arquivo de credenciais: `snapeats-f8ca0-firebase-adminsdk-fbsvc-78d3b925c8.json`
- Variáveis de ambiente: `FIREBASE_*`
- Valores padrão configurados no código

### Testes

Incluímos um script de teste `test_firebase_storage.py` que verifica:
- Se o Firebase Storage está corretamente configurado
- Se o upload de arquivos está funcionando
- Se a exclusão de arquivos está funcionando

## Uso

### Upload de Imagem

```python
from resource.firebase_storage import upload_image

# Upload de imagem com fallback para armazenamento local
image_url = upload_image(
    file_object=request.files['imagem'],
    folder="restaurantes",
    filename="restaurante_123.jpg",
    use_local_fallback=True
)

# A função retorna a URL pública se o upload for bem-sucedido
# ou o caminho relativo local se o Firebase falhar e o fallback for usado
```

### Obter URL da Imagem

```python
from resource.firebase_storage import get_image_url

# Determina a URL correta para exibir a imagem
url = get_image_url(restaurante.imagem_url)
```

### Excluir Imagem

```python
from resource.firebase_storage import delete_image

# Exclui a imagem (do Firebase ou local)
success = delete_image(restaurante.imagem_url)
```

## Próximos Passos

1. Adicionar suporte para upload de imagens de perfil de usuários
2. Implementar limitações de tamanho de arquivo
3. Implementar verificação de tipos de arquivo mais robusta
4. Adicionar opções para redimensionamento de imagens
