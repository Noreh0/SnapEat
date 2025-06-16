import { Component, OnInit } from '@angular/core';
import { RestauranteService } from '../../services/restaurante.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { AutenticacaoService } from '../../services/autenticacao.service'; // ajuste o caminho se necessário

@Component({
  selector: 'app-dashboard-restaurante',
  templateUrl: './dashboard-restaurante.component.html',
  styleUrls: ['./dashboard-restaurante.component.css']
})
export class DashboardRestauranteComponent implements OnInit {
  // ...restante do código...
  restaurante!: { Nome: string; /* ... */ };
  mediaAval = 0;
  totalAval = 0;
  avaliacoes: Array<{
    clienteNome: string;
    Nota: number;
    Comentario: string;
    data: string;
  }> = [];

  isOwner = false;

  constructor(
    private svc: RestauranteService,
    private avalSvc: AvaliacaoService,
    private route: ActivatedRoute,
    private auth: AutenticacaoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) {
      alert('ID do restaurante não informado!');
      this.router.navigate(['/menu']);
      return;
    }
    const id = +idStr;
    if (!id || id <= 0) {
      alert('ID do restaurante inválido!');
      this.router.navigate(['/menu']);
      return;
    }
    

    this.svc.buscarPorId(id).subscribe((r: any) => {
      this.restaurante = r;
      this.mediaAval = r.mediaAvaliacoes;
      this.totalAval = r.totalAvaliacoes;
      this.isOwner = this.auth.usuarioAtual?.perfil === 'restaurante' &&
                    this.auth.usuarioAtual?.email === r.email;
    });

    this.avalSvc.buscarPorRestaurante(id).subscribe((list: any[]) => {
      this.avaliacoes = list.sort(
        (a: any, b: any) => new Date(b.data).getTime() - new Date(a.data).getTime()
      );
    });
  }
  /** Retorna uma string com ★ e ☆ conforme a nota */
  renderStars(n: number): string {
    const full = '★'.repeat(Math.round(n));
    const empty = '☆'.repeat(5 - Math.round(n));
    return full + empty;
  }

  responder(a: any) {
    // abra um modal de resposta, ou navegue para rota de resposta
    console.log('Responder à avaliação', a);
  }
}
