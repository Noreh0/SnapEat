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

  login(email: string, senha: string): Observable<clienteModel> {
    const url = `${this.API}/login`;
    const body = { email: email, senha: senha };
    console.log('Funcionando');
    return this.http.post<clienteModel>(url, body);
  }
  criar(cliente: clienteModel): Observable<clienteModel> {
    const url = `${this.API}/cadastroCliente`;
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