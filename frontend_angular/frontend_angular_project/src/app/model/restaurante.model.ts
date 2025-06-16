export interface restauranteModel {
  ID: number;
  Nome: string;
  descricao: string;
  CNPJ: string;
  tipo_restaurante: string;
  email: string;
  senha?: string;
  telefone: string;
  Cidade: string;
  Endereco: string;
  NotaMedia?: number;
  imagem_url?: string;
  mediaAvaliacoes?: number;      // <-- adicione
  totalAvaliacoes?: number;     
}