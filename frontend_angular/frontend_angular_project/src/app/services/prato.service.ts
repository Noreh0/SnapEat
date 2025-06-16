import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs/internal/Observable';
import { Prato } from '../model/prato.model';

@Injectable({ providedIn: 'root' })
export class PratoService {
  private readonly API = 'http://localhost:5000/prato'; // <-- ajuste aqui

  constructor(private http: HttpClient) {}

 getByRestaurante(restauranteId: number): Observable<Prato[]> {
  return this.http.get<Prato[]>(`${this.API}/restaurante/${restauranteId}`);
  }

  getById(id: number): Observable<Prato> {
    return this.http.get<Prato>(`${this.API}/${id}`);
  }

  searchByName(nome: string): Observable<Prato[]> {
    return this.http.get<Prato[]>(`${this.API}/search/${nome}`);
  }

  create(prato: Partial<Prato>): Observable<Prato> {
    return this.http.post<Prato>(this.API, prato);
  }

  update(id: number, prato: Partial<Prato>): Observable<Prato> {
    return this.http.put<Prato>(`${this.API}/${id}`, prato);
  }

  delete(id: number): Observable<void> {
    return this.http.delete<void>(`${this.API}/${id}`);
  }

  uploadImage(id: number, file: File): Observable<{ imagem_url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ imagem_url: string }>(
      `${this.API}/${id}/upload`,
      formData
    );
  }
}
