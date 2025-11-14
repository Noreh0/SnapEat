import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import { AvaliacaoPrato } from '../model/avaliacao-prato.model';

@Injectable({ providedIn: 'root' })
export class AvaliacaoPratoService {
  private readonly API = 'http://localhost:5000/avaliacoes-prato';

  constructor(private http: HttpClient) {}

  // lista todas as aval. de um prato
  getByPrato(pratoId: number): Observable<AvaliacaoPrato[]> {
  console.log(`📡 Buscando avaliações do prato ${pratoId}`);
  
  return this.http.get<any[]>(`${this.API}/prato/${pratoId}`).pipe(
    map(lst => {
      console.log(`📦 Resposta bruta da API (${lst.length} avaliações):`, lst);
      
      return lst.map(a => {
        const avaliacao = {
          ID: a.ID,
          Comentario: a.Comentario,
          Nota: a.Nota,
          ID_Cliente: a.ID_Cliente,
          Nome_Cliente: a.Nome_Cliente,
          ID_Prato: a.ID_Prato,
          created_at: a.created_at,
          updated_at: a.updated_at,
          ID_Restaurante: a.ID_Restaurante,
          imagens_urls: a.imagens_urls || [],
          tem_imagens: a.tem_imagens || false
        };
        
        console.log(`   📝 Avaliação ${a.ID} mapeada:`, {
          tem_imagens: avaliacao.tem_imagens,
          total_imagens: avaliacao.imagens_urls.length,
          urls: avaliacao.imagens_urls
        });
        
        return avaliacao;
      });
    }),
    tap(avaliacoes => {
      console.log(`✅ Total de avaliações processadas: ${avaliacoes.length}`);
      avaliacoes.forEach(a => {
        console.log(`   ID ${a.ID}: tem_imagens=${a.tem_imagens}, total=${a.imagens_urls?.length || 0}`);
      });
    })
  );
}

  getById(id: number): Observable<AvaliacaoPrato> {
    return this.http.get<AvaliacaoPrato>(`${this.API}/${id}`);
  }

  create(av: Partial<AvaliacaoPrato>): Observable<AvaliacaoPrato> {
    return this.http.post<AvaliacaoPrato>(this.API, av);
  }

  criarComImagens(formData: FormData): Observable<AvaliacaoPrato> {
    console.log('📤 Enviando FormData para criação...');
    
    // CORREÇÃO: Garantir barra final
    const url = `${this.API}/`;
    console.log(`   URL: ${url}`);
    
    return this.http.post<AvaliacaoPrato>(url, formData).pipe(
      tap(response => {
        console.log('✅ Resposta da API (create):', response);
        console.log('   tem_imagens:', response.tem_imagens);
        console.log('   total_imagens:', response.imagens_urls?.length || 0);
      })
    );
  }

  /**
   * Atualiza avaliação COM imagens
   */
  updateComImagens(id: number, formData: FormData): Observable<AvaliacaoPrato> {
    console.log(`📤 Enviando FormData para atualização (ID: ${id})...`);
    
    // CORREÇÃO: URL sem barra duplicada
    const url = `${this.API}/${id}`;
    console.log(`   URL: ${url}`);
    
    return this.http.put<AvaliacaoPrato>(url, formData).pipe(
      tap(response => {
        console.log('✅ Resposta da API (update):', response);
        console.log('   tem_imagens:', response.tem_imagens);
        console.log('   total_imagens:', response.imagens_urls?.length || 0);
      })
    );
  }

  /**
   * Atualiza avaliação sem imagens (método legado)
   */
  update(id: number, data: Partial<AvaliacaoPrato>): Observable<AvaliacaoPrato> {
    return this.http.put<AvaliacaoPrato>(`${this.API}/${id}`, data);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  adicionarImagens(avaliacaoId: number, imagens: File[]): Observable<any> {
    const formData = new FormData();
    imagens.forEach(img => formData.append('imagens', img));
    return this.http.post(`${this.API}/${avaliacaoId}/upload-imagens`, formData);
  }

  /**
   * Remove uma imagem específica
   */
  removerImagem(avaliacaoId: number, imagemUrl: string): Observable<any> {
    return this.http.delete(`${this.API}/${avaliacaoId}/remover-imagem`, {
      body: { imagem_url: imagemUrl }
    });
  }

  searchByPratoName(name: string): Observable<AvaliacaoPrato[]> {
    return this.http.get<AvaliacaoPrato[]>(`${this.API}/search/${name}`);
  }
}