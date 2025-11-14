export interface clienteModel {
  ID: number;
  Nome: string;
  CPF: string;
  email: string;
  senha?: string;
  telefone: string;
  Cidade: string;
  firebase_uid?: string;
  imagem_url?: string;
  rede_social?: string;
}