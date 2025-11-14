import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { TagModel, RestauranteTagConquistadaModel } from '../model/tag.model';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly BASE = `http://localhost:5000/tags`;

  constructor(private http: HttpClient) {}

  /**
   * Lista todas as tags disponíveis
   */
  listarTags(): Observable<TagModel[]> {
    console.log('🔍 Buscando tags em:', this.BASE);
    
    // ✅ Adicionar headers de autenticação se necessário
    const token = localStorage.getItem('token');
    let httpHeaders = new HttpHeaders();
    
    if (token) {
      httpHeaders = httpHeaders.set('Authorization', `Bearer ${token}`);
      console.log('   🔑 Token adicionado aos headers');
    }
    
    return this.http.get<TagModel[]>(this.BASE, { headers: httpHeaders }).pipe(
      tap((response: any) => console.log('📥 Resposta completa do servidor:', response)),
      catchError((error: any) => {
        console.error('❌ Erro na requisição de tags:', error);
        throw error;
      })
    );
  }

  /**
   * Lista tags por categoria
   */
  listarPorCategoria(categoria: string): Observable<TagModel[]> {
    return this.http.get<TagModel[]>(`${this.BASE}/categoria/${categoria}`);
  }

  /**
   * Busca tags conquistadas por um restaurante
   */
  buscarTagsRestaurante(restauranteId: number): Observable<RestauranteTagConquistadaModel[]> {
    return this.http.get<RestauranteTagConquistadaModel[]>(
      `${this.BASE}/restaurante/${restauranteId}`
    );
  }

  /**
   * Busca uma tag específica por ID
   */
  buscarPorId(id: number): Observable<TagModel> {
    return this.http.get<TagModel>(`${this.BASE}/${id}`);
  }

  /**
   * Cria uma nova tag (admin)
   */
  criar(tag: TagModel): Observable<TagModel> {
    return this.http.post<TagModel>(this.BASE, tag);
  }

  /**
   * Atualiza uma tag (admin)
   */
  atualizar(id: number, tag: TagModel): Observable<TagModel> {
    return this.http.put<TagModel>(`${this.BASE}/${id}`, tag);
  }

  /**
   * Remove uma tag (admin)
   */
  remover(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}`);
  }
}