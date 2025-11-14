import { AvaliacaoTagModel } from "./tag.model";

export interface AvaliacaoModel {
  ID?: number;
  ID_Cliente?: number;
  ID_Restaurante?: number;
  Nota: number;
  Comentario?: string;
  data_avaliacao?: string;
  visivel?: boolean;
  sentimento_auto?: string;
  Nome_Cliente?: string;
  clienteNome?: string;
  Nome_Restaurante?: string;
  imagens_urls?: string[];  // Adicionar
  tem_imagens?: boolean;
  tags?: AvaliacaoTagModel[];
}