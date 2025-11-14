import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor,
  HttpErrorResponse
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AutenticacaoService } from '../services/autenticacao.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(
    private authService: AutenticacaoService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Obter token do localStorage
    const token = localStorage.getItem('token');
    if (token) {
      try {
        // Analisar o token para debugging
        const parts = token.split('.');
        if (parts.length === 3) {
          const payload = JSON.parse(atob(parts[1]));
          console.log(`Requisição para ${request.url} - Subject no token:`, payload.sub, "Tipo:", typeof payload.sub);
        }
      } catch (e) {
        console.error("Erro ao analisar token no interceptor:", e);
      }}
    console.log(`Interceptando requisição para: ${request.url}`);
    // Log completo do token para diagnóstico (NÃO use em produção)
    if (token) console.log(`Token completo: ${token}`);
    
    if (token) {
      // Garantir que o token está limpo
      const cleanToken = token.trim();
      
      // Verificar se o token parece válido (estrutura básica JWT)
      const tokenParts = cleanToken.split('.');
      if (tokenParts.length !== 3) {
        console.error("Token inválido: não tem formato JWT correto");
      }
      
      // Adicionar token ao header de autorização
      const authReq = request.clone({
        setHeaders: {
          Authorization: `Bearer ${cleanToken}`
        }
      });
      
      // Mostrar cabeçalhos para diagnóstico (sem expor dados sensíveis)
      console.log(`Enviando para ${request.url} com Authorization: Bearer ${cleanToken.substring(0, 15)}...`);
      
      return next.handle(authReq).pipe(
        catchError((error: HttpErrorResponse) => {
          // Log detalhado do erro
          if (error.status === 422) {
            console.error("Erro 422 - Corpo da resposta:", error.error);
          } else if (error.status === 401 || error.status === 403) {
            console.error(`Erro de autenticação (${error.status}):`, error.message);
            this.authService.updateAuthState(false);
            localStorage.removeItem('token');
            this.router.navigate(['/login']);
          }
          return throwError(() => error);
        })
      );
    }
    
    // Se não tem token, segue sem autenticação
    console.log(`Enviando requisição sem autenticação para: ${request.url}`);
    return next.handle(request);
  }
}