import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AvaliacaoPrato } from '../model/avaliacao-prato.model';

@Injectable({ providedIn: 'root' })
export class AvaliacaoPratoService {
  private readonly API = 'http://localhost:5000/avaliacoes-prato/';

  constructor(private http: HttpClient) {}

  // lista todas as aval. de um prato
  getByPrato(pratoId: number): Observable<AvaliacaoPrato[]> {
    return this.http.get<any[]>(`${this.API}prato/${pratoId}`).pipe(
      map(lst => lst.map(a => ({
        ID: a.ID,
        Comentario: a.Comentario,
        Nota: a.Nota,
        ID_Cliente: a.ID_Cliente,
        ID_Prato: a.ID_Prato,
        created_at: a.created_at,
        updated_at: a.updated_at
      })))
    );
  }

  getById(id: number): Observable<AvaliacaoPrato> {
    return this.http.get<AvaliacaoPrato>(`${this.API}${id}`);
  }

  create(av: Partial<AvaliacaoPrato>): Observable<AvaliacaoPrato> {
    return this.http.post<AvaliacaoPrato>(this.API, av);
  }

  update(id: number, av: Partial<AvaliacaoPrato>): Observable<AvaliacaoPrato> {
    return this.http.put<AvaliacaoPrato>(`${this.API}${id}`, av);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}${id}`);
  }

  searchByPratoName(name: string): Observable<AvaliacaoPrato[]> {
    return this.http.get<AvaliacaoPrato[]>(`${this.API}search/${name}`);
  }
}
