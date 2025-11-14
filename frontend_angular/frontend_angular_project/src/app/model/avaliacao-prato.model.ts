export interface AvaliacaoPrato {
  ID: number;
  Comentario: string;
  Nota: number;
  ID_Cliente: number;
  Nome_Cliente?: string; 
  ID_Prato: number;
  created_at?: string;
  updated_at?: string;
  ID_Restaurante?: number;
  imagens_urls?: string[];
  tem_imagens?: boolean;
}