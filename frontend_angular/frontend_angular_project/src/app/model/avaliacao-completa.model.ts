import { AvaliacaoModel } from './avaliacao.model';
import { AvaliacaoTagModel } from './tag.model';

export interface AvaliacaoCompletaModel extends AvaliacaoModel {
  tags_notas?: AvaliacaoTagModel[];
}