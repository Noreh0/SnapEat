import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class GeolocalizacaoService {
  private nominatimAPI = 'https://nominatim.openstreetmap.org/search';

  constructor(private http: HttpClient) {}

  buscarCoordenadas(endereco: string, cidade: string): Observable<any> {
    const query = `${endereco}, ${cidade}, Brasil`;
    return this.http.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: '1'
      }
    });
  }
}