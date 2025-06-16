import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AvaliacaoPratoService } from '../../services/avaliacao-prato.service';
import { AvaliacaoPrato } from '../../model/avaliacao-prato.model';
import { AutenticacaoService } from '../../services/autenticacao.service';

@Component({
  selector: 'app-avaliacao-prato-list',
  templateUrl: './avaliacao-prato-list.component.html',
  styleUrls: ['./avaliacao-prato-list.component.css'],
})
export class AvaliacaoPratoListComponent implements OnInit {
  pratoId!: number;
  avaliacoes: AvaliacaoPrato[] = [];
  isCliente = false;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: AvaliacaoPratoService,
    public auth: AutenticacaoService
  ) {}

  ngOnInit(): void {
    this.isCliente = this.auth.usuarioAtual?.perfil === 'cliente';
    this.pratoId = +this.route.snapshot.paramMap.get('pratoId')!;
    this.loadAvaliacoes();
  }


  loadAvaliacoes() {
    this.svc.getByPrato(this.pratoId).subscribe(lst => this.avaliacoes = lst);
  }
  renderStars(n: number): string {
    return '★'.repeat(n) + '☆'.repeat(5-n);
  }

  edit(av: AvaliacaoPrato) {
    this.router.navigate([
      '/prato',
      this.pratoId,
      'avaliacoes',
      av.ID,
      'editar'
    ]);
  }

  delete(ID: number) {
    if (!confirm('Confirma exclusão?')) return;
    this.svc.delete(ID).subscribe(() => this.loadAvaliacoes());
  }
}
