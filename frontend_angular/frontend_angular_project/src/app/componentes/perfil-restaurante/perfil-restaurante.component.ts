import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { RestauranteService } from '../../services/restaurante.service';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { AutenticacaoService } from '../../services/autenticacao.service';

@Component({
  selector: 'app-perfil-restaurante',
  templateUrl: './perfil-restaurante.component.html',
  styleUrls: ['./perfil-restaurante.component.css'],
})
export class PerfilRestauranteComponent implements OnInit {
  id!: number;
  restaurante!: {
    id: number;
    Nome: string;
    tipo_restaurante: string;
    CNPJ: string;
    descricao: string;
    email: string;
    imagem_url?: string;
    //avatarUrl?: string;
    mediaAvaliacoes: number;
    totalAvaliacoes: number;
  };
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
    private jwtHelper: JwtHelperService,
    private svc: RestauranteService,
    private avalService: AvaliacaoService,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AutenticacaoService
  ) {}

  ngOnInit(): void {
    // Pega ID da rota
    const idStr = this.route.snapshot.paramMap.get('id_restaurante');
    this.id = idStr ? +idStr : 0;

    // Valida token
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token) || this.id <= 0) {
      this.router.navigate(['/login']);
      return;
    }

    // Busca dados do restaurante
    this.svc.buscarPorId(this.id).subscribe({
      next: r => {
        this.restaurante = {
          id: r.ID,
          Nome: r.Nome,
          tipo_restaurante: r.tipo_restaurante,
          CNPJ: r.CNPJ,
          descricao: r.descricao,
          email: r.email,
          imagem_url: r.imagem_url,
          // avatarUrl: r.avatarUrl, // Removido pois não existe em restauranteModel
          mediaAvaliacoes: r.NotaMedia ?? 0,
          totalAvaliacoes: r.totalAvaliacoes ?? 0,
        };
        console.log('usuarioAtual:', this.auth.usuarioAtual);
        console.log('restaurante:', r);
        this.mediaAval = this.restaurante.mediaAvaliacoes;
        this.totalAval = this.restaurante.totalAvaliacoes;
        // Verifica se é o dono
        this.isOwner =
          Number(this.auth.usuarioAtual?.sub) === r.ID;
      },
      error: () => {
        alert('Restaurante não encontrado!');
        this.router.navigate(['/menu']);
      }
    });

    // Lista avaliações associadas (use buscarPorRestaurante)
    this.avalService.buscarPorRestaurante(this.id)
      .subscribe({
        next: (lista: AvaliacaoModel[]) => {
          // Adapte conforme seu backend retorna os campos
          this.avaliacoes = lista
            .map(a => ({
              clienteNome: (a as any).clienteNome || 'Cliente',
              Nota: a.Nota,
              Comentario: a.Comentario || '',
              data: (a as any).data || new Date().toISOString(),
            }))
            .sort(
              (a, b) =>
                new Date(b.data).getTime() - new Date(a.data).getTime()
            )
            .slice(0, 3);
        },
        error: err => console.error('Erro avaliações:', err)
      });
  }

  renderStars(n: number): string {
    const full = '★'.repeat(Math.round(n));
    const empty = '☆'.repeat(5 - Math.round(n));
    return full + empty;
  }

  editarRestaurante(): void {
    this.router.navigate(['/perfil-restaurante', this.id, 'editarRestaurante']);
  }

  excluirRestaurante(): void {
    if (!confirm('Confirma exclusão do restaurante?')) return;
    this.svc.excluir(this.id).subscribe({
      next: () => {
        localStorage.clear();
        this.router.navigate(['/login']);
      },
      error: () => alert('Falha ao excluir. Tente mais tarde.')
    });
  }
}