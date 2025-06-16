export interface Prato {
  ID: number;
  Nome: string;
  descricao?: string;
  preco: number;
  restaurante_id: number;
  imagem_url?: string; // <-- use imagem_url
}