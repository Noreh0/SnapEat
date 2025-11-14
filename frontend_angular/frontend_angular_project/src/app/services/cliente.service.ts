import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { clienteModel } from '../model/cliente.model';
import { tap } from 'rxjs/operators';
@Injectable({
  providedIn: 'root',
})
export class ClienteService {
  private readonly API = 'http://localhost:5000/';

  constructor(private http: HttpClient) {}

  listar(): Observable<clienteModel[]> {
    return this.http.get<clienteModel[]>(`${this.API}/todosClientes`);
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

  criar(cliente: clienteModel): Observable<clienteModel> {
    return this.http.post<clienteModel>(`${this.API}/auth/cadastro`, cliente);
  }
  // No ClienteService
  excluir(id: number, headers?: any): Observable<any> {
    return this.http.delete(`${this.API}/excluirCliente/${id}`, { headers });
  }
  buscarPorEmail(email: string): Observable<clienteModel[]> {
    return this.http.get<clienteModel[]>(`${this.API}/encontrarUsuario/${email}`);
  }
  buscarPorId(id: number): Observable<clienteModel> {
    return this.http.get<clienteModel>(`${this.API}/cliente/${id}`);
  }
  
  editar(cliente: clienteModel): Observable<clienteModel> {
    return this.http.put<clienteModel>(`${this.API}/editarCliente/${cliente.ID}`, cliente);
  }
}
