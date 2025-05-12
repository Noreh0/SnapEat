

import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { restauranteModel } from '../model/restaurante.model';

@Injectable({
  providedIn: 'root',
})
export class RestauranteService {
  private readonly API = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  listar(): Observable<restauranteModel[]> {
    //const headers = new HttpHeaders({ 'Content-Type': 'application/json' });
    const url = `${this.API}/menu`;
    return this.http.get<restauranteModel[]>(url);
  }
  login(email: string, senha: string): Observable<restauranteModel> {
    const url = `${this.API}/loginrestaurante`;
    const body = { email: email, senha: senha };
    console.log('Funcionando');
    return this.http.post<restauranteModel>(url, body);
  }
  listar_tabela(): Observable<restauranteModel[]> {
    return this.http.get<restauranteModel[]>(this.API);
  }
  criar(restaurante: restauranteModel): Observable<restauranteModel> {
    console.log(restaurante.ID);
    const url = `${this.API}/cadastroRestaurante`;
    return this.http.post<restauranteModel>(url, restaurante);
  }
  excluir(id: number): Observable<restauranteModel> {
    console.log(id);
    const url = `${this.API}/excluirRestaurante/${id}`;
    return this.http.delete<restauranteModel>(url);
  }

  buscarPorId(id: number): Observable<restauranteModel[]> {
    const url = `${this.API}/restaurante/${id}`;
    return this.http.get<restauranteModel[]>(url);
  }

  buscarPorEmail(email: string): Observable<restauranteModel[]> {
    const url = `${this.API}/encontrarRestaurante/${email}`;
    return this.http.get<restauranteModel[]>(url);
  }

  editar(
    restaurante: restauranteModel,
    ID: number
  ): Observable<restauranteModel> {
    const url = `${this.API}/editarRestaurante/${ID}`;
    console.log(restaurante);
    return this.http.put<restauranteModel>(url, restaurante);
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
