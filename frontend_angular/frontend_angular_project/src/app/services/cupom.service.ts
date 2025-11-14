import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { CupomModel, CupomCreateRequest, PontosUsuarioModel, ResgateCupomRequest } from '../model/cupom.model';

@Injectable({
  providedIn: 'root',
})
export class CupomService {
  private readonly API = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  // CRUD básico de cupons
  listarTodos(): Observable<CupomModel[]> {
    return this.http.get<CupomModel[]>(`${this.API}/cupom`)
      .pipe(catchError(this.handleError));
  }

  buscarPorId(id: number): Observable<CupomModel> {
    return this.http.get<CupomModel>(`${this.API}/cupom/${id}`)
      .pipe(catchError(this.handleError));
  }

  buscarPorCodigo(codigo: string): Observable<CupomModel> {
    return this.http.get<CupomModel>(`${this.API}/cupom/codigo/${codigo}`)
      .pipe(catchError(this.handleError));
  }

  buscarPorRestaurante(restauranteId: number): Observable<CupomModel[]> {
    return this.http.get<CupomModel[]>(`${this.API}/cupom/restaurante/${restauranteId}`)
      .pipe(catchError(this.handleError));
  }

  criar(cupom: CupomCreateRequest): Observable<CupomModel> {
    return this.http.post<CupomModel>(`${this.API}/cupom`, cupom)
      .pipe(catchError(this.handleError));
  }

  atualizar(id: number, cupom: Partial<CupomCreateRequest>): Observable<CupomModel> {
    return this.http.put<CupomModel>(`${this.API}/cupom/${id}`, cupom)
      .pipe(catchError(this.handleError));
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/cupom/${id}`)
      .pipe(catchError(this.handleError));
  }

  // Funcionalidades específicas de pontos e resgate
  cuponsDisponiveis(restauranteId: number, clienteId: number): Observable<CupomModel[]> {
    return this.http.get<CupomModel[]>(`${this.API}/cupom/disponiveis/${restauranteId}/${clienteId}`)
      .pipe(catchError(this.handleError));
  }

  pontosCliente(clienteId: number, restauranteId: number): Observable<PontosUsuarioModel> {
    return this.http.get<PontosUsuarioModel>(`${this.API}/cupom/pontos/${clienteId}/${restauranteId}`)
      .pipe(catchError(this.handleError));
  }

  resgatarCupom(resgate: ResgateCupomRequest): Observable<any> {
    return this.http.post<any>(`${this.API}/cupom/resgatar`, resgate)
      .pipe(catchError(this.handleError));
  }

  historicoPontos(clienteId: number, restauranteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/cupom/historico/${clienteId}/${restauranteId}`)
      .pipe(catchError(this.handleError));
  }

  rankingPontos(restauranteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/cupom/ranking/${restauranteId}`)
      .pipe(catchError(this.handleError));
  }

  meusCuponsResgatados(clienteId: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/cupom/meus-cupons/${clienteId}`)
      .pipe(catchError(this.handleError));
  }

  pontosDisponiveisHoje(clienteId: number, restauranteId: number): Observable<any> {
    return this.http.get<any>(`${this.API}/cupom/pontos-disponiveis-hoje/${clienteId}/${restauranteId}`)
      .pipe(catchError(this.handleError));
  }

  // Helper para tratamento de erros
  private handleError(error: any): Observable<never> {
    console.error('Erro no CupomService:', error);
    
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
          errorMessage = 'Cupom não encontrado';
          break;
        case 409:
          errorMessage = 'Conflito - cupom já existe ou foi usado';
          break;
        case 500:
          errorMessage = 'Erro interno do servidor';
          break;
      }
    }

    return throwError(() => new Error(errorMessage));
  }
}