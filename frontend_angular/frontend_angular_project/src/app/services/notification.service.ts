import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable } from 'rxjs';
import { AutenticacaoService } from './autenticacao.service';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private readonly API = 'http://localhost:5000/notificacoes';
  private baseUrl = this.API;
  private notificacoesSubject = new BehaviorSubject<any[]>([]);
  public notificacoes$ = this.notificacoesSubject.asObservable();
  private notificacoesNaoLidas = 0;

  constructor(
    private http: HttpClient,
    private authService: AutenticacaoService
  ) {
    this.inicializarNotificacoes();
  }

  inicializarNotificacoes(): void {
    const usuario = this.authService.usuarioAtual;
    if (usuario) {
      this.carregarNotificacoes();
      // Simular polling para notificações (em produção, use SignalR ou WebSockets)
      setInterval(() => this.carregarNotificacoes(), 30000); // a cada 30 segundos
    }
  }

  carregarNotificacoes(): void {
    const usuario = this.authService.usuarioAtual;
    if (!usuario) return;
    
    const endpoint = usuario.perfil === 'restaurante' 
      ? `/notificacoes/restaurante/${usuario.id}`
      : `/notificacoes/cliente/${usuario.id}`;
      
    this.http.get<any[]>(`${this.baseUrl}${endpoint}`).subscribe({
      next: (notificacoes) => {
        this.notificacoesSubject.next(notificacoes);
        this.notificacoesNaoLidas = notificacoes.filter(n => !n.lido).length;
      },
      error: (err) => console.error('Erro ao carregar notificações', err)
    });
  }

  marcarComoLida(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/notificacoes/${id}/ler`, {});
  }

  getNotificacoesNaoLidas(): number {
    return this.notificacoesNaoLidas;
  }

  limparNotificacoes(): void {
    this.notificacoesSubject.next([]);
    this.notificacoesNaoLidas = 0;
  }
}