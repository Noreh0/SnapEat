export interface Prato {
  ID: number;
  Nome: string;
  descricao?: string;
  preco: number;
  restaurante_id: number;
  imagem_url?: string;
  mediaAvaliacoes?: number;
  totalAvaliacoes?: number;
  
  // Propriedades para funcionalidades avançadas do cardápio
  popular?: boolean;
  promocao?: boolean;
  novo?: boolean;
  rating?: number;
  tempo_preparo?: number;
  tags?: string[];
  preco_original?: number;
  favorito?: boolean;
  disponivel?: boolean;
  imageLoaded?: boolean;
  
  // Propriedades opcionais para análise e relatórios
  avaliacoes_count?: number;
  desconto?: number;
}