import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, Observable, of, throwError, tap } from 'rxjs';
import { Denuncia } from '../model/denuncia.model';
import { environment } from '../../environments/environment';
import { AvaliacaoService } from './avaliacao.service';

@Injectable({
  providedIn: 'root'
})
export class DenunciaService {
  private API = environment.apiUrl;

  constructor(
    private http: HttpClient,
    private avaliacaoService: AvaliacaoService
  ) { }

  private authHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return token ? new HttpHeaders({ Authorization: `Bearer ${token}` }) : new HttpHeaders();
  }

  criar(avaliacao_id: number, motivo: string): Observable<any> {
    return this.http.post(`${this.API}/denuncias`, {
      avaliacao_id,
      motivo
    }, { headers: this.authHeaders() }).pipe(
      tap((response: any) => {
        // Se a denúncia foi aceita automaticamente, invalidar cache
        if (response && response.status === 'ACEITA') {
          // Buscar qual restaurante para invalidar cache (se disponível na resposta)
          console.log('🔄 Denúncia aceita automaticamente, invalidando caches...');
        }
      })
    );
  }

  listarPorRestaurante(restauranteId: number): Observable<Denuncia[]> {
    return this.http.get<Denuncia[]>(`${this.API}/denuncias/restaurante/${restauranteId}`);
  }

  pendentes(restaurante_id: number): Observable<Denuncia[]> {
    return this.http.get<Denuncia[]>(`${this.API}/denuncias/restaurante/${restaurante_id}/pendentes`, { headers: this.authHeaders() });
  }

  indicadores(restaurante_id: number): Observable<any> {
    return this.http.get<any>(`${this.API}/denuncias/restaurante/${restaurante_id}/indicadores`)
      .pipe(
        catchError(error => {
          if (error.status === 403 || error.status === 404) {
            console.warn(`Acesso aos indicadores de denúncias do restaurante ${restaurante_id} negado ou não encontrado`);
            return of({ pendentes: 0, total: 0, resolvidas: 0 });
          }
          return throwError(() => error);
        })
      );
  }

  analisarDenunciaAutomaticamente(id: number): Observable<any> {
    return this.http.post(`${this.API}/denuncias/${id}/analisar-automaticamente`, {});
  }

  decidirDenuncia(id: number, acao: string, motivo?: string): Observable<any> {
    return this.http.put(`${this.API}/denuncias/${id}/decisao`, {
      acao: acao,
      motivo: motivo || ''
    });
  }

  decidir(id: number, acao: 'aceitar'|'recusar'): Observable<Denuncia> {
    return this.http.put<Denuncia>(`${this.API}/denuncias/${id}/decisao`, { acao }, { headers: this.authHeaders() });
  }
  
  // Novo método para análise automática
  analisarDenuncia(id: number): Observable<any> {
    return this.http.post<any>(`${this.API}/denuncias/${id}/analisar-automaticamente`, {}, { headers: this.authHeaders() });
  }

  // Método para processar todas as denúncias pendentes
  processarTodas(): Observable<any> {
    return this.http.post<any>(`${this.API}/denuncias/processar-pendentes`, {}, { headers: this.authHeaders() });
  }

  processarPendentesRestaurante(restaurante_id: number): Observable<any> {
    return this.http.post<any>(
      `${this.API}/denuncias/restaurante/${restaurante_id}/processar-pendentes`, 
      {}, 
      { headers: this.authHeaders() }
    );
  }

  // Buscar uma denúncia por ID
  buscarPorId(id: number): Observable<Denuncia> {
    return this.http.get<Denuncia>(`${this.API}/denuncias/${id}`);
  }

  // Analisar automaticamente uma denúncia usando IA
  analisarAutomaticamente(denunciaId: number): Observable<any> {
    return this.http.post<any>(`${this.API}/denuncias/${denunciaId}/analisar-automaticamente`, {});
  }

  // Tomar decisão sobre uma denúncia
// Em denuncia.service.ts, verifique se tomarDecisao está correto:
  tomarDecisao(denunciaId: number, decisao: 'aprovar' | 'rejeitar', justificativa?: string): Observable<any> {
    // Mapear 'aprovar'/'rejeitar' para 'aceitar'/'recusar'
    const acao = decisao === 'aprovar' ? 'aceitar' : 'recusar';
    
    // Enviar os dados no formato esperado pelo backend
    return this.http.put<any>(`${this.API}/denuncias/${denunciaId}/decisao`, {
      acao: acao,
      motivo: justificativa || ''
    }).pipe(
      tap((response: any) => {
        // Se a denúncia foi aceita, invalidar cache das avaliações
        if (acao === 'aceitar' && response && response.restaurante_id) {
          console.log('🔄 Denúncia aceita manualmente, invalidando cache do restaurante', response.restaurante_id);
          this.avaliacaoService.invalidarCacheRestaurante(response.restaurante_id);
        }
      })
    );
  }

  listarPendentes(restaurante_id: number): Observable<any[]> {
    return this.http.get<any[]>(`${this.API}/denuncias/restaurante/${restaurante_id}/pendentes`)
      .pipe(
        catchError(error => {
          if (error.status === 403 || error.status === 404) {
            console.warn(`Acesso às denúncias pendentes do restaurante ${restaurante_id} negado ou não encontrado`);
            return of([]);
          }
          return throwError(() => error);
        })
      );
  }
}