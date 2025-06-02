import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private base = 'http://localhost:5000';
  private authState = new BehaviorSubject<boolean>(this.isAuthenticated());
  authState$ = this.authState.asObservable();


  constructor(
    private http: HttpClient,
    private jwtHelper: JwtHelperService
  ) {}

  login(email: string, senha: string) {
  return this.http.post<{ access_token: string, tipo: string }>(`${this.base}/auth/login`, { email, senha })
    .pipe(
      tap(res => {
        localStorage.setItem('token', res.access_token);
        // Decodifica o token e salva o tipo e id no localStorage
        const jwtHelper = new JwtHelperService();
        const payload = jwtHelper.decodeToken(res.access_token);
        localStorage.setItem('tipo', res.tipo); // <- do backend
        localStorage.setItem('id', payload.id);
      })
    );
}


  logout() {
  return this.http.post(`${this.base}/auth/logout`, {}).pipe(
    tap({
      next: () => {
        localStorage.clear();
        this.authState.next(false);
      },
      error: () => {
        // Mesmo que falhe (401), limpa o localStorage e emite logout
        localStorage.clear();
        this.authState.next(false);
      }
    })
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
