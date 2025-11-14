import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, throwError } from 'rxjs';
import { catchError, map, tap } from 'rxjs/operators';
import { restauranteModel } from '../model/restaurante.model';
import { FiltroAvancadoParams } from '../componentes/filtro-avancado/filtro-avancado.component';

export interface BuscaProximosParams {
  latitude: number;
  longitude: number;
  categoria?: string;
  raio_km?: number;
}

@Injectable({
  providedIn: 'root',
})
export class RestauranteService {
  private readonly API = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  listar(): Observable<restauranteModel[]> {
    const url = `${this.API}/restaurante/menu`;
    return this.http.get<restauranteModel[]>(url);
  }

  login(email: string, senha: string): Observable<any> {
    return this.http.post(`${this.API}/auth/login`, { email, senha }).pipe(
      tap((res: any) => {
        localStorage.setItem('token', res.access_token);

        const payload = JSON.parse(atob(res.access_token.split('.')[1]));
        localStorage.setItem('tipo', payload.tipo); 
      })
    );
  }

  listar_tabela(): Observable<restauranteModel[]> {
    return this.http.get<restauranteModel[]>(this.API);
  }
  

  cadastrar(restaurante: restauranteModel): Observable<restauranteModel> {
    const url = `${this.API}/auth/cadastro/restaurante`;          
    return this.http.post<restauranteModel>(url, restaurante);
  }

  // ✅ Novo método para cadastrar restaurante com imagem
  cadastrarComImagem(formData: FormData): Observable<restauranteModel> {
    const url = `${this.API}/auth/cadastro/restaurante-com-imagem`;
    return this.http.post<restauranteModel>(url, formData);
  }

  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/restaurante/${id}`);
  }

  // No serviço que faz a chamada para buscar o restaurante
  buscarPorId(id: number): Observable<restauranteModel> {
    console.log(`Buscando restaurante com ID: ${id}`);
    
    // Verificar se é um ID válido
    if (!id || id <= 0 || isNaN(id)) {
      return throwError(() => new Error(`ID inválido: ${id}`));
    }
    
    return this.http.get<restauranteModel>(`${this.API}/restaurante/${id}`)
      .pipe(
        catchError(error => {
          console.error(`Erro ao buscar restaurante ID ${id}:`, error);
          if (error.status === 404) {
            return throwError(() => new Error('Restaurante não encontrado'));
          }
          return throwError(() => new Error('Erro ao buscar dados do restaurante. Tente novamente.'));
        })
      );
  }

  buscarPorEmail(email: string): Observable<restauranteModel[]> {
    const url = `${this.API}/restaurante/encontrarRestaurante/${email}`;
    return this.http.get<restauranteModel[]>(url);
  }
  buscarRecomendados(tipo: string): Observable<restauranteModel[]> {
    const url = `${this.API}/restaurante/recomendados/${tipo}`;
    return this.http.get<restauranteModel[]>(url);
  }
  editar(id: number, dados: any): Observable<restauranteModel> {
    console.log(`Editando restaurante ID ${id} com dados:`, dados);
    
    return this.http.put<restauranteModel>(`${this.API}/restaurante/${id}`, dados)
      .pipe(
        catchError(error => {
          console.error(`Erro ao editar restaurante ID ${id}:`, error);
          return throwError(() => new Error(error.error?.message || 'Erro ao editar restaurante'));
        })
      );
  }
  uploadImagem(id: number, file: File): Observable<{ imagem_url: string }> {
    const formData = new FormData();
    formData.append('imagem', file);
    return this.http.post<{ imagem_url: string }>(
      `${this.API}/restaurante/${id}/upload-imagem`, formData
    );
  }

  listarTipo(pagina: number, filtro: string): Observable<restauranteModel[]> {
    const url = `${this.API}/restaurante/filtrar/${filtro || 'todos'}`;
    return this.http.get<restauranteModel[]>(url);
  }

  listarNome(pagina: number, filtro: string): Observable<restauranteModel[]> {
    const url = `${this.API}/restaurante/pesquisarRestaurante/${filtro}`;
    return this.http.get<restauranteModel[]>(url);
  }
  buscarProximos(params: BuscaProximosParams): Observable<any[]> {
    const body = {
      latitude: params.latitude,
      longitude: params.longitude,
      tipo_restaurante: params.categoria,
      raio_km: params.raio_km
    };
    return this.http.post<any[]>(`${this.API}/restaurante/proximos`, body);
  }
  getTipos(): Observable<string[]> {
    return this.http.get<{tipos: string[]}>(`${this.API}/restaurante/tipos`)
      .pipe(map(response => response.tipos));
  }
  // Adicionar este método à classe RestauranteService

  buscaAvancada(filtros: FiltroAvancadoParams): Observable<any[]> {
    return this.http.post<any[]>(`${this.API}/restaurante/busca-avancada`, filtros);
  }

  // Método helper para obter localização atual
  obterLocalizacaoAtual(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject('Geolocalização não suportada');
      }
      navigator.geolocation.getCurrentPosition(resolve, reject);
    });
  }
}
