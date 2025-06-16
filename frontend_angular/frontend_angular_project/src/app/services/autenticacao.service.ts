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
          const jwtHelper = new JwtHelperService();
          const payload = jwtHelper.decodeToken(res.access_token);
          localStorage.setItem('tipo', res.tipo);
          localStorage.setItem('id', payload.id);
          this.authState.next(true); // <-- ADICIONE ESTA LINHA
        })
      );
  }
  recuperarSenha(email: string) {
    return this.http.post<{message: string}>(`${this.base}/auth/recuperar-senha`, { email });
  }
  redefinirSenha(token: string, novaSenha: string) {
    return this.http.post<{message: string}>(`${this.base}/auth/redefinir-senha/${token}`, { nova_senha: novaSenha });
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
  get usuarioAtual() {
    const token = this.getToken();
    if (!token) return null;
    const payload = this.jwtHelper.decodeToken(token);
    return payload;
  }



  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    return token ? !this.jwtHelper.isTokenExpired(token) : false;
  }


  getDecodedToken() {
  const token = this.getToken();
  if (!token) return null;
  return this.jwtHelper.decodeToken(token);
}

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}
