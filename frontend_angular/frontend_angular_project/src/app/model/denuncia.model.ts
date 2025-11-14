export interface Denuncia {
  ID?: number;
  avaliacao_id: number;
  restaurante_id?: number;
  cliente_id?: number;
  motivo: string;
  status?: string;
  created_at?: string;
  resolved_at?: string;
  resolved_by?: number;  // Adicionar este campo
  observacao_admin?: string;  // Adicionar este campo
  
  // Propriedades existentes para interface expandida
  avaliacao?: any;
  analise_ia?: {
    explicacao: string;
    confianca: number;
    motivos: {
      conteudo_ofensivo: boolean;
      motivo_grave: boolean;
      sentimento_inconsistente?: boolean;
    };
    aceitar_denuncia: boolean;
    sentimento?: string;
  };
}