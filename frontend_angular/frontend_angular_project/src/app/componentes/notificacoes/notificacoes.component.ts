import { Component, OnInit } from '@angular/core';
import { NotificationService } from '../../services/notification.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-notificacoes',
  templateUrl: './notificacoes.component.html',
  styleUrls: ['./notificacoes.component.css']
})
export class NotificacoesComponent implements OnInit {
  notificacoes: any[] = [];
  
  constructor(
    private notificacaoService: NotificationService,
    private router: Router
  ) {}
  
  ngOnInit(): void {
    this.notificacaoService.notificacoes$.subscribe(notificacoes => {
      this.notificacoes = notificacoes;
    });
  }
  
  marcarComoLida(notificacao: any): void {
    this.notificacaoService.marcarComoLida(notificacao.id).subscribe(() => {
      notificacao.lido = true;
      // Se tiver um link de redirecionamento
      if (notificacao.linkDestino) {
        this.router.navigateByUrl(notificacao.linkDestino);
      }
    });
  }
}