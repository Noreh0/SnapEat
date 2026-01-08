"""
Migração: Criar sistema de cupons e pontos de fidelidade
Criado em: 08/11/2025
Descrição: Cria tabelas para sistema de cupons, pontos de usuários e histórico
"""

from sql_alchemy import banco
from sqlalchemy import text

def upgrade():
    """Cria as tabelas do sistema de cupons e pontos"""
    
    print("🔧 Iniciando migração: create_cupons_system")
    
    # SQL para criar as tabelas
    sql_commands = [
        # Tabela de Cupons
        """
        CREATE TABLE `Cupom` (
            `ID` int NOT NULL AUTO_INCREMENT,
            `codigo` varchar(20) NOT NULL UNIQUE,
            `titulo` varchar(100) NOT NULL,
            `descricao` text,
            `desconto_percentual` float DEFAULT NULL,
            `desconto_valor` float DEFAULT NULL,
            `valor_minimo` float DEFAULT 0,
            `pontos_necessarios` int NOT NULL DEFAULT 100,
            `restaurante_id` int NOT NULL,
            `data_validade` datetime NOT NULL,
            `ativo` boolean DEFAULT TRUE,
            `max_usos` int DEFAULT 1,
            `usos_restantes` int DEFAULT 1,
            `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
            `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`ID`),
            KEY `idx_cupom_codigo` (`codigo`),
            KEY `idx_cupom_restaurante` (`restaurante_id`),
            KEY `idx_cupom_ativo` (`ativo`),
            KEY `idx_cupom_validade` (`data_validade`),
            CONSTRAINT `fk_cupom_restaurante` FOREIGN KEY (`restaurante_id`) REFERENCES `Restaurante` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `chk_cupom_desconto` CHECK (
                (`desconto_percentual` IS NOT NULL AND `desconto_percentual` > 0 AND `desconto_percentual` <= 100) OR
                (`desconto_valor` IS NOT NULL AND `desconto_valor` > 0)
            ),
            CONSTRAINT `chk_cupom_pontos` CHECK (`pontos_necessarios` >= 10)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        
        # Tabela de Pontos por Usuário
        """
        CREATE TABLE `PontosUsuario` (
            `ID` int NOT NULL AUTO_INCREMENT,
            `cliente_id` int NOT NULL,
            `restaurante_id` int NOT NULL,
            `pontos_totais` int DEFAULT 0,
            `pontos_utilizados` int DEFAULT 0,
            `pontos_disponiveis` int DEFAULT 0,
            `created_at` timestamp DEFAULT CURRENT_TIMESTAMP,
            `updated_at` timestamp DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`ID`),
            UNIQUE KEY `uk_pontos_cliente_restaurante` (`cliente_id`, `restaurante_id`),
            KEY `idx_pontos_cliente` (`cliente_id`),
            KEY `idx_pontos_restaurante` (`restaurante_id`),
            KEY `idx_pontos_disponiveis` (`pontos_disponiveis`),
            CONSTRAINT `fk_pontos_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `fk_pontos_restaurante` FOREIGN KEY (`restaurante_id`) REFERENCES `Restaurante` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `chk_pontos_positivos` CHECK (`pontos_totais` >= 0 AND `pontos_utilizados` >= 0 AND `pontos_disponiveis` >= 0),
            CONSTRAINT `chk_pontos_consistencia` CHECK (`pontos_disponiveis` = (`pontos_totais` - `pontos_utilizados`))
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """,
        
        # Tabela de Histórico de Pontos
        """
        CREATE TABLE `HistoricoPontos` (
            `ID` int NOT NULL AUTO_INCREMENT,
            `cliente_id` int NOT NULL,
            `restaurante_id` int NOT NULL,
            `tipo` varchar(20) NOT NULL,
            `pontos` int NOT NULL,
            `motivo` varchar(100) DEFAULT NULL,
            `avaliacao_id` int DEFAULT NULL,
            `cupom_id` int DEFAULT NULL,
            `data_movimento` timestamp DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`ID`),
            KEY `idx_historico_cliente` (`cliente_id`),
            KEY `idx_historico_restaurante` (`restaurante_id`),
            KEY `idx_historico_tipo` (`tipo`),
            KEY `idx_historico_data` (`data_movimento`),
            KEY `idx_historico_avaliacao` (`avaliacao_id`),
            KEY `idx_historico_cupom` (`cupom_id`),
            CONSTRAINT `fk_historico_cliente` FOREIGN KEY (`cliente_id`) REFERENCES `Cliente` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `fk_historico_restaurante` FOREIGN KEY (`restaurante_id`) REFERENCES `Restaurante` (`ID`) ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT `fk_historico_avaliacao` FOREIGN KEY (`avaliacao_id`) REFERENCES `avaliacao` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT `fk_historico_cupom` FOREIGN KEY (`cupom_id`) REFERENCES `Cupom` (`ID`) ON DELETE SET NULL ON UPDATE CASCADE,
            CONSTRAINT `chk_historico_tipo` CHECK (`tipo` IN ('ganho', 'uso')),
            CONSTRAINT `chk_historico_pontos` CHECK (`pontos` > 0)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    ]
    
    try:
        # Executar os comandos
        for i, command in enumerate(sql_commands, 1):
            print(f"   Executando comando {i}/3...")
            banco.session.execute(text(command.strip()))
            
        banco.session.commit()
        
        print("✅ Migração concluída com sucesso!")
        print("   - Tabela 'Cupom' criada")
        print("   - Tabela 'PontosUsuario' criada")
        print("   - Tabela 'HistoricoPontos' criada")
        print("   - Índices e constraints aplicados")
        
    except Exception as e:
        banco.session.rollback()
        print(f"❌ Erro durante migração: {e}")
        raise

def downgrade():
    """Remove as tabelas do sistema de cupons e pontos"""
    
    print("🔧 Iniciando rollback: create_cupons_system")
    
    # SQL para remover as tabelas (ordem inversa devido às FKs)
    sql_commands = [
        "DROP TABLE IF EXISTS `HistoricoPontos`",
        "DROP TABLE IF EXISTS `PontosUsuario`",
        "DROP TABLE IF EXISTS `Cupom`"
    ]
    
    try:
        # Executar os comandos
        for i, command in enumerate(sql_commands, 1):
            print(f"   Executando rollback {i}/3...")
            banco.session.execute(text(command))
            
        banco.session.commit()
        print("✅ Rollback concluído!")
        
    except Exception as e:
        banco.session.rollback()
        print(f"❌ Erro durante rollback: {e}")
        raise

def seed_sample_data():
    """Popula dados de exemplo para testes"""
    
    print("🌱 Adicionando dados de exemplo...")
    
    # Inserir cupons de exemplo
    sample_cupons = [
        """
        INSERT INTO `Cupom` 
        (codigo, titulo, descricao, desconto_percentual, pontos_necessarios, restaurante_id, data_validade, max_usos, usos_restantes) 
        VALUES 
        ('SNAP10OFF', '10% de Desconto', 'Ganhe 10% de desconto em qualquer pedido', 10.0, 100, 26, DATE_ADD(NOW(), INTERVAL 30 DAY), 1, 1)
        """,
        """
        INSERT INTO `Cupom` 
        (codigo, titulo, descricao, desconto_valor, valor_minimo, pontos_necessarios, restaurante_id, data_validade, max_usos, usos_restantes) 
        VALUES 
        ('SNAP5REAL', 'R$ 5,00 de Desconto', 'R$ 5,00 off em pedidos acima de R$ 25,00', 5.0, 25.0, 150, 26, DATE_ADD(NOW(), INTERVAL 45 DAY), 1, 1)
        """,
        """
        INSERT INTO `Cupom` 
        (codigo, titulo, descricao, desconto_percentual, pontos_necessarios, restaurante_id, data_validade, max_usos, usos_restantes) 
        VALUES 
        ('SNAP20VIP', '20% VIP', 'Desconto especial para clientes VIP', 20.0, 500, 26, DATE_ADD(NOW(), INTERVAL 60 DAY), 1, 1)
        """
    ]
    
    try:
        for i, sql in enumerate(sample_cupons, 1):
            print(f"   Inserindo cupom exemplo {i}/3...")
            banco.session.execute(text(sql.strip()))
        
        banco.session.commit()
        print("✅ Dados de exemplo inseridos com sucesso!")
        
    except Exception as e:
        print(f"⚠️ Erro ao inserir dados de exemplo: {e}")
        # Não fazer rollback aqui, os dados de exemplo são opcionais

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
            
            # Perguntar se quer adicionar dados de exemplo
            if len(sys.argv) <= 2:
                resposta = input("Deseja adicionar dados de exemplo? (y/N): ")
                if resposta.lower() in ['y', 'yes', 's', 'sim']:
                    seed_sample_data()
            
        elif action == 'seed':
            seed_sample_data()
            
        elif action == 'downgrade':
            downgrade()
            
        else:
            print("❌ Ação inválida. Use 'upgrade', 'downgrade' ou 'seed'")