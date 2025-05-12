import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private base = 'http://localhost:5000';

  constructor(
    private http: HttpClient,
    private jwtHelper: JwtHelperService
  ) {}

  loginCliente(email: string, senha: string) {
    return this.http
      .post<{ access_token: string }>(`${this.base}/auth/login`, { email, senha })
      .pipe(tap(r => localStorage.setItem('token', r.access_token)));
  }

  loginRestaurante(email: string, senha: string) {
    return this.http
      .post<{ access_token: string }>(`${this.base}/LoginRestaurante`, { email, senha })
      .pipe(tap(r => localStorage.setItem('token', r.access_token)));
  }

  logout() {
    return this.http.post(`${this.base}/auth/logout`, {}).pipe(
      tap(() => localStorage.removeItem('token'))
    );
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return token ? !this.jwtHelper.isTokenExpired(token) : false;
  }

  getDecodedToken() {
    const token = localStorage.getItem('token');
    return token ? this.jwtHelper.decodeToken(token) : null;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
