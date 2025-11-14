import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';
import { Prato } from '../model/prato.model';
import { catchError, map } from 'rxjs/operators'
import { of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PratoService {
  private readonly API = 'http://localhost:5000/prato'; // <-- ajuste aqui

  constructor(private http: HttpClient) {}

 getByRestaurante(restauranteId: number): Observable<Prato[]> {
  return this.http.get<Prato[]>(`${this.API}/restaurante/${restauranteId}`);
  }

  getById(id: number): Observable<Prato> {
    return this.http.get<Prato>(`${this.API}/${id}`);
  }

  searchByName(nome: string): Observable<Prato[]> {
    return this.http.get<Prato[]>(`${this.API}/search/${nome}`);
  }

  create(prato: Partial<Prato>): Observable<Prato> {
    return this.http.post<Prato>(this.API, prato);
  }

  update(id: number, prato: Partial<Prato>): Observable<Prato> {
    return this.http.put<Prato>(`${this.API}/${id}`, prato);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }
  getDestaques(restauranteId: number, limit = 3, min = 1) {
    return this.http.get<Prato[]>(
      `${this.API}/destaques/${restauranteId}?limit=${limit}&min=${min}`
    );
  }
  listarPorRestaurante(restauranteId: number): Observable<Prato[]> {
    return this.http.get<Prato[]>(`${this.API}/restaurante/${restauranteId}`);
  }

  // Método específico para buscar os pratos mais bem avaliados
  getPratosMaisAvaliados(restauranteId: number, limite: number = 5): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/restaurante/${restauranteId}/melhores?limite=${limite}`)
      .pipe(
        catchError(error => {
          console.error('Erro ao buscar pratos mais bem avaliados:', error);
          return of([]);
        })
      );
  }

  // Método para obter estatísticas mensais
  getEstatisticasMensais(restauranteId: number, meses: number = 6): Observable<any> {
    return this.http.get<any>(`${this.API}/restaurante/${restauranteId}/estatisticas-mensais?meses=${meses}`)
      .pipe(
        catchError(error => {
          console.error('Erro ao buscar estatísticas mensais de pratos:', error);
          return of({
            meses: {},
            total_geral: 0,
            media_geral: 0
          });
        })
      );
  }
  getEstatisticasAvaliacoes(restauranteId: number): Observable<any> {
    return this.http.get<any>(`${this.API}/restaurante/${restauranteId}/estatisticas-avaliacoes`);
  }
  

  uploadImage(id: number, file: File): Observable<{ imagem_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imagem_url: string }>(
      `${this.API}/${id}/upload`,
      formData
    );
  }
  getMelhoresPratos(restauranteId: number, limite: number = 5): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/restaurante/${restauranteId}/melhores?limite=${limite}`)
      .pipe(
        catchError(error => {
          console.error('Erro ao buscar pratos mais bem avaliados:', error);
          return of([]);
        })
      );
  }
  getPratosByRestaurante(restauranteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/pratos/restaurante/${restauranteId}`);
  }

  // Obter avaliações de um prato específico
  getAvaliacoesPrato(pratoId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/avaliacoes-prato/prato/${pratoId}`);
  }

  // Obter estatísticas de avaliações dos pratos de um restaurante
  getEstatisticasPratos(restauranteId: number): Observable<any> {
    return this.http.get<any>(`${this.API}/pratos/restaurante/${restauranteId}/estatisticas`);
  }

}
