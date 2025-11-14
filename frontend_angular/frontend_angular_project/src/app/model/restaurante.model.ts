export interface restauranteModel {
  ID: number;
  Nome: string;
  nome_fantasia: string;
  descricao: string;
  CNPJ: string;
  tipo_restaurante: string;
  email: string;
  senha?: string;
  telefone: string;
  Cidade: string;
  Endereco: string;
  bairro: string;
  latitude: number;
  longitude: number;
  NotaMedia?: number;
  imagem_url?: string;
  mediaAvaliacoes?: number;  
  totalAvaliacoes?: number;   
  distancia_km?: number;
  tags_conquistadas?: TagConquistada[];
  firebase_uid?: string;      
}

export interface TagConquistada {
  ID: number;
  ID_Tag: number;
  nome: string;
  categoria: string;
  icone?: string;
  cor?: string;
  pontuacao_total: number;
  total_avaliacoes: number;
  media_categoria: number;
  posicao_ranking: number;
  descricao?: string;
}