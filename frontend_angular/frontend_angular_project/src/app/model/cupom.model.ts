export interface CupomModel {
  ID?: number;
  codigo?: string;
  titulo: string;
  descricao?: string;
  desconto_percentual?: number;
  desconto_valor?: number;
  valor_minimo?: number;
  pontos_necessarios: number;
  restaurante_id: number;
  data_validade: string; // ISO string format
  ativo?: boolean;
  max_usos?: number;
  usos_restantes?: number;
  expirado?: boolean;
  disponivel?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface PontosUsuarioModel {
  cliente_id: number;
  restaurante_id: number;
  pontos_totais: number;
  pontos_utilizados: number;
  pontos_disponiveis: number;
  cliente_nome?: string;
  restaurante_nome?: string;
}

export interface CupomCreateRequest {
  titulo: string;
  descricao?: string;
  desconto_percentual?: number;
  desconto_valor?: number;
  valor_minimo?: number;
  pontos_necessarios: number;
  restaurante_id: number; // ✅ ADICIONADO: Campo obrigatório
  data_validade: string;
  max_usos?: number;
  ativo?: boolean;
}

export interface ResgateCupomRequest {
  cupom_id: number;
  cliente_id: number;
  restaurante_id: number;
}