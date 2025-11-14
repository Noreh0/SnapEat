import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class NotificacaoService {
  private readonly API = 'http://localhost:5000';

  constructor(private http: HttpClient) {}

  recomendacoes(opts: { latitude?: number; longitude?: number; tipo?: string; raio_km?: number }): Observable<any[]> {
    let params = new HttpParams();
    if (opts.latitude != null) params = params.set('latitude', String(opts.latitude));
    if (opts.longitude != null) params = params.set('longitude', String(opts.longitude));
    if (opts.tipo) params = params.set('tipo', opts.tipo);
    if (opts.raio_km != null) params = params.set('raio_km', String(opts.raio_km));
    return this.http.get<any[]>(`${this.API}/notificacoes/recomendacoes`, { params });
  }

  enviarRecuperacaoLogado(): Observable<any> {
    return this.http.post(`${this.API}/auth/recuperar-senha/logado`, {});
  }
}