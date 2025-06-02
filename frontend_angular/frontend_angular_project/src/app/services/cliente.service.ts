import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { clienteModel } from '../model/cliente.model';
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
      localStorage.setItem('tipo', payload.tipo);  // 'cliente' ou 'restaurante'
    })
  );
}

  criar(cliente: clienteModel): Observable<clienteModel> {
  const url = `${this.API}auth/cadastro`; // <-- corrigido
  return this.http.post<clienteModel>(url, cliente);
}
  excluir(id: number): Observable<any> {
  return this.http.delete(`${this.API}/excluirCliente/${id}`);
}
  buscarPorEmail(email: string): Observable<clienteModel[]> {
    const url = `${this.API}/encontrarUsuario/${email}`;
    return this.http.get<clienteModel[]>(url);
  }
  buscarPorId(id: number): Observable<clienteModel> {
    const url = `${this.API}/cliente/${id}`;
    return this.http.get<clienteModel>(url);
  }
  
  editar(cliente: clienteModel): Observable<clienteModel> {
    const url = `${this.API}/editarCliente/${cliente.ID}`;
    return this.http.put<clienteModel>(url, cliente);
  }
}

function tap(arg0: (res: any) => void): import("rxjs").OperatorFunction<Object, any> {
  throw new Error('Function not implemented.');
}
