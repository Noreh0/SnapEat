import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { tap } from 'rxjs/operators';
import { JwtHelperService } from '@auth0/angular-jwt';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class AutenticacaoService {
  private base = environment.apiUrl;
  private authState = new BehaviorSubject<boolean>(false); // Initialize without checking token initially
  authState$ = this.authState.asObservable();

  constructor(
    private http: HttpClient,
    private jwtHelper: JwtHelperService
  ) {
    // Check authentication state after initialization
    setTimeout(() => {
      this.authState.next(this.isAuthenticated());
    }, 0);
  }

  // Modificação na classe AutenticacaoService
  login(email: string, senha: string) {
    return this.http.post<{ access_token: string, tipo: string, id: number }>(`${this.base}/auth/login`, { email, senha })
      .pipe(
        tap(res => {
          // Garantir que o token é armazenado corretamente
          console.log("Token recebido:", res.access_token);
          
          // Verificar a estrutura do token antes de salvar
          try {
            const tokenParts = res.access_token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              console.log("Token payload:", payload);
              console.log("Subject:", payload.sub, "Tipo:", typeof payload.sub);
            } else {
              console.error("Token inválido: não tem 3 partes");
            }
          } catch (e) {
            console.error("Erro ao analisar token:", e);
          }
          
          localStorage.setItem('token', res.access_token);
          const payload = this.jwtHelper.decodeToken(res.access_token);
          localStorage.setItem('tipo', res.tipo);
          localStorage.setItem('id', String(res.id));  // Garantir que é armazenado como string
          this.authState.next(true);
        })
      );
  }
  public updateAuthState(isAuthenticated: boolean): void {
    this.authState.next(isAuthenticated);
  }

  recuperarSenha(email: string): Observable<any> {
    return this.http.post(`${this.base}/auth/recuperar-senha`, { email });
  }

  redefinirSenha(token: string, nova_senha: string): Observable<any> {
    // Assegurar que o token é usado corretamente na URL
    return this.http.post(`${this.base}/auth/redefinir-senha/${encodeURIComponent(token)}`, { nova_senha });
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
    try {
      return this.jwtHelper.decodeToken(token);
    } catch (error) {
      return null;
    }
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      return !this.jwtHelper.isTokenExpired(token);
    } catch (error) {
      console.warn("Invalid token format", error);
      return false;
    }
  }

  getDecodedToken() {
    const token = this.getToken();
    if (!token) return null;
    
    try {
      return this.jwtHelper.decodeToken(token);
    } catch (error) {
      console.warn("Error decoding token", error);
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }
}