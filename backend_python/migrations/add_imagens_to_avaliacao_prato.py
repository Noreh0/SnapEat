"""
Migração: Adicionar colunas de imagens à tabela avaliacaoprato
Criado em: 08/11/2025
Motivo: Resolver erro "Unknown column 'AvaliacaoPrato.imagens_urls' in 'field list'"
"""

from sql_alchemy import banco

def upgrade():
    """Adiciona as colunas imagens_urls e tem_imagens à tabela avaliacaoprato"""
    
    print("🔧 Iniciando migração: add_imagens_to_avaliacao_prato")
    
    # SQL para adicionar as colunas
    sql_commands = [
        """
        ALTER TABLE avaliacaoprato 
        ADD COLUMN imagens_urls JSON DEFAULT NULL
        """,
        """
        ALTER TABLE avaliacaoprato 
        ADD COLUMN tem_imagens BOOLEAN DEFAULT FALSE
        """
    ]
    
    try:
        # Executar os comandos
        for i, command in enumerate(sql_commands, 1):
            print(f"   Executando comando {i}/2...")
            banco.engine.execute(command.strip())
            
        print("✅ Migração concluída com sucesso!")
        print("   - Coluna 'imagens_urls' (JSON) adicionada")
        print("   - Coluna 'tem_imagens' (BOOLEAN) adicionada")
        
    except Exception as e:
        print(f"❌ Erro durante migração: {e}")
        raise

def downgrade():
    """Remove as colunas imagens_urls e tem_imagens da tabela avaliacaoprato"""
    
    print("🔧 Iniciando rollback: add_imagens_to_avaliacao_prato")
    
    # SQL para remover as colunas
    sql_commands = [
        "ALTER TABLE avaliacaoprato DROP COLUMN tem_imagens",
        "ALTER TABLE avaliacaoprato DROP COLUMN imagens_urls"
    ]
    
    try:
        # Executar os comandos
        for i, command in enumerate(sql_commands, 1):
            print(f"   Executando rollback {i}/2...")
            banco.engine.execute(command)
            
        print("✅ Rollback concluído!")
        
    except Exception as e:
        print(f"❌ Erro durante rollback: {e}")
        raise

if __name__ == "__main__":
    # Para execução direta do script
    import sys
    import os
    
    # Adicionar o diretório pai ao path para imports
    sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    
    from main import create_app
    
    app = create_app()
    with app.app_context():
        
        action = sys.argv[1] if len(sys.argv) > 1 else 'upgrade'
        
        if action == 'upgrade':
            upgrade()
        elif action == 'downgrade':
            downgrade()
        else:
            print("❌ Ação inválida. Use 'upgrade' ou 'downgrade'")
