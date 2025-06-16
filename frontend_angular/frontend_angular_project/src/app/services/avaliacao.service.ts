import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { AvaliacaoModel } from '../model/avaliacao.model';

@Injectable({ providedIn: 'root' })
export class AvaliacaoService {
  /** Base URL para todos os endpoints de avaliação */
  private readonly BASE = 'http://localhost:5000/avaliacoes';

  constructor(private http: HttpClient) {}

  /** Lista todas as avaliações */
  listar(): Observable<AvaliacaoModel[]> {
    return this.http.get<AvaliacaoModel[]>(this.BASE);
  }

  // DEPOIS (apontando para /avaliando, que é o caminho correto definido no resource)
  criar(av: AvaliacaoModel) {
    // chama exatamente /avaliacoes/avaliando
    return this.http.post<AvaliacaoModel>(`${this.BASE}/avaliando`, av);
  }



  /** Busca uma avaliação pelo seu ID */
  buscarPorId(id: number): Observable<AvaliacaoModel> {
    return this.http.get<AvaliacaoModel>(`${this.BASE}/${id}`);
  }

  /** Lista todas as avaliações feitas por um cliente */
  buscarPorCliente(id: number): Observable<AvaliacaoModel[]> {
  return this.http.get<AvaliacaoModel[]>(`${this.BASE}/encontraAvaliacaoCliente/${id}`);
}


  /** Lista todas as avaliações de um restaurante */
  buscarPorRestaurante(id: number): Observable<AvaliacaoModel[]> {
    return this.http.get<AvaliacaoModel[]>(`${this.BASE}/restaurante/${id}`);
  }

  /** Edita uma avaliação existente */
  editar(av: AvaliacaoModel): Observable<AvaliacaoModel> {
    return this.http.put<AvaliacaoModel>(
      `${this.BASE}/${av.ID}`,
      av
    );
  }


  /** Exclui uma avaliação pelo ID */
  excluir(id: number): Observable<void> {
    return this.http.delete<void>(`${this.BASE}/${id}`);
  }
}
