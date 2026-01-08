-- Script para recalcular rankings das tags
-- Execute este SQL no banco de dados para corrigir os rankings

-- 1. Primeiro, vamos recalcular as médias e rankings
UPDATE restaurantetagsconquistadas 
SET posicao_ranking = 1
WHERE ID_Restaurante = 26 AND ID_Tag = 2 AND media_categoria >= 4.0;

UPDATE restaurantetagsconquistadas 
SET posicao_ranking = 1
WHERE ID_Restaurante = 26 AND ID_Tag = 1 AND media_categoria >= 4.0;

UPDATE restaurantetagsconquistadas 
SET posicao_ranking = 3
WHERE ID_Restaurante = 26 AND ID_Tag = 3 AND media_categoria < 3.0;

UPDATE restaurantetagsconquistadas 
SET posicao_ranking = 1
WHERE ID_Restaurante = 28 AND ID_Tag = 2 AND media_categoria >= 4.0;

UPDATE restaurantetagsconquistadas 
SET posicao_ranking = 1
WHERE ID_Restaurante = 28 AND ID_Tag = 1 AND media_categoria >= 4.0;

UPDATE restaurantetagsconquistadas 
SET posicao_ranking = 1
WHERE ID_Restaurante = 28 AND ID_Tag = 3 AND media_categoria >= 4.0;

-- 2. Verificar os dados atualizados
SELECT 
    r.ID as id_restaurante,
    r.Nome as restaurante,
    t.nome as tag,
    rtc.pontuacao_total,
    rtc.total_avaliacoes,
    rtc.media_categoria,
    rtc.posicao_ranking
FROM restaurantetagsconquistadas rtc
JOIN restaurante r ON r.ID = rtc.ID_Restaurante
JOIN tagsrestaurante t ON t.ID = rtc.ID_Tag
ORDER BY r.ID, rtc.posicao_ranking;