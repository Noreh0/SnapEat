import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

export interface PontosDisponiveisResponse {
  pode_ganhar_avaliacao: boolean;
  pontos_avaliacao: number;
  pode_ganhar_avaliacao_prato: boolean;
  pontos_prato: number;
  total_possivel_hoje: number;
}

@Injectable({
  providedIn: 'root',
})
export class PontosService {
  private readonly API = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  // Verificar pontos disponíveis hoje
  pontosDisponiveisHoje(clienteId: number, restauranteId: number): Observable<PontosDisponiveisResponse> {
    return this.http.get<PontosDisponiveisResponse>(`${this.API}/cupom/pontos-disponiveis-hoje/${clienteId}/${restauranteId}`)
      .pipe(catchError(this.handleError));
  }

  // Helper para tratamento de erros
  private handleError(error: any): Observable<never> {
    console.error('Erro no PontosService:', error);
    
    let errorMessage = 'Erro desconhecido';
    
    if (error.error?.message) {
      errorMessage = error.error.message;
    } else if (error.status) {
      switch (error.status) {
        case 400:
          errorMessage = 'Dados inválidos';
          break;
        case 401:
          errorMessage = 'Não autorizado';
          break;
        case 403:
          errorMessage = 'Acesso negado';
          break;
        case 404:
          errorMessage = 'Não encontrado';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor';
          break;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}