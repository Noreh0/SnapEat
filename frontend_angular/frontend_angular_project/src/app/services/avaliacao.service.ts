

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/internal/Observable';
import { AvaliacaoModel } from '../model/avaliacao.model';

@Injectable({
  providedIn: 'root',
})
export class AvaliacaoService {
  private readonly API = 'http://localhost:5000/';

  constructor(private http: HttpClient) {}

  listar(): Observable<AvaliacaoModel[]> {
    const url = `${this.API}/todasAvaliacoes`;
    return this.http.get<AvaliacaoModel[]>(url);
  }
  criar(avaliacao: AvaliacaoModel): Observable<AvaliacaoModel> {
    console.log(avaliacao.ID_Cliente);
    console.log(avaliacao.ID_Restaurante);
    const url = `${this.API}/avaliando`
    return this.http.post<AvaliacaoModel>(url, avaliacao);
  }
  excluir(id: number): Observable<AvaliacaoModel> {
    const url = `${this.API}/excluirAvaliacao/${id}`;
    console.log('Excluindo' + id);
    return this.http.delete<AvaliacaoModel>(url);
  }

  buscarPorId(id: number): Observable<AvaliacaoModel> {
    const url = `${this.API}/avaliacoes/${id}`;
    return this.http.get<AvaliacaoModel>(url);
  }

  listarPorId(id: number): Observable<AvaliacaoModel[]> {
    const url = `${this.API}/encontraAvaliacaoCliente/${id}`;
    return this.http.get<AvaliacaoModel[]>(url);
  }
  listarPorIdRestaurante(id: number): Observable<AvaliacaoModel[]> {
    const url = `${this.API}/encontraAvaliacao/${id}`;
    return this.http.get<AvaliacaoModel[]>(url);
  }
  editar(avaliacao: AvaliacaoModel): Observable<AvaliacaoModel> {
    const url = `${this.API}/editarAvaliacao/${avaliacao.ID}`;
    return this.http.put<AvaliacaoModel>(url, avaliacao);
  }
}