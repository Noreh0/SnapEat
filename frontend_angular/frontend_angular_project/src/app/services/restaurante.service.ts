import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { restauranteModel } from '../model/restaurante.model';

@Injectable({
  providedIn: 'root',
})
export class RestauranteService {
  private readonly API = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  listar(): Observable<restauranteModel[]> {
    const url = `${this.API}/menu`;
    return this.http.get<restauranteModel[]>(url);
  }

  login(email: string, senha: string): Observable<any> {
    return this.http.post(`${this.API}/auth/login`, { email, senha }).pipe(
      tap((res: any) => {
        localStorage.setItem('token', res.access_token);

        const payload = JSON.parse(atob(res.access_token.split('.')[1]));
        localStorage.setItem('tipo', payload.tipo);  // 'cliente' ou 'restaurante'
      })
    );
  }

  listar_tabela(): Observable<restauranteModel[]> {
    return this.http.get<restauranteModel[]>(this.API);
  }
  

  cadastrar(restaurante: restauranteModel): Observable<restauranteModel> {
    const url = `${this.API}/auth/cadastro/restaurante`;             //  ↑ barra a mais e rota deve bater com @api.route('/cadastro/restaurante')
    return this.http.post<restauranteModel>(url, restaurante);
  }


  // DELETE /restaurante/:id
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/restaurante/${id}`);
  }

  // GET /restaurante/:id
  buscarPorId(id: number): Observable<restauranteModel> {
    return this.http.get<restauranteModel>(`${this.API}/restaurante/${id}`);
  }


  buscarPorEmail(email: string): Observable<restauranteModel[]> {
    const url = `${this.API}/encontrarRestaurante/${email}`;
    return this.http.get<restauranteModel[]>(url);
  }

  editar(id: number, data: restauranteModel): Observable<restauranteModel> {
    return this.http.put<restauranteModel>(
      `${this.API}/restaurante/${id}`, data
    );
  }
  uploadImagem(id: number, file: File) {
    const formData = new FormData();
    formData.append('imagem', file);
    return this.http.post<{ imagem_url: string }>(
      `${this.API}/restaurante/${id}/upload-imagem`, formData
    );
  }

  listarTipo(pagina: number, filtro: string): Observable<restauranteModel[]> {
    const url = `${this.API}/filtrar/${filtro}`;
    return this.http.get<restauranteModel[]>(url);
  }

  listarNome(pagina: number, filtro: string): Observable<restauranteModel[]> {
    const url = `${this.API}/pesquisarRestaurante/${filtro}`;
    return this.http.get<restauranteModel[]>(url);
  }
}
