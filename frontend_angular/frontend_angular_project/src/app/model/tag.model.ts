export interface TagModel {
  ID?: number;
  nome: string;
  descricao?: string;
  icone?: string;
  categoria?: 'atendimento' | 'comida' | 'ambiente' | 'preco' | 'localizacao';
  cor?: string;
  ativo?: boolean;
}

export interface AvaliacaoTagModel {
  ID?: number;
  ID_Avaliacao?: number;
  ID_Tag: number;
  nota: number;
  tag?: TagModel;
}

export interface RestauranteTagConquistadaModel {
  ID?: number;
  ID_Restaurante: number;
  ID_Tag: number;
  pontuacao_media: number;
  total_avaliacoes: number;
  ultima_atualizacao?: string;
  conquistada?: boolean;
  tag?: TagModel;
}