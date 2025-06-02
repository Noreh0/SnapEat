// perfil-restaurante.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { RestauranteService } from '../../services/restaurante.service';
import { AvaliacaoService }  from '../../services/avaliacao.service';
import { JwtHelperService }  from '@auth0/angular-jwt';

@Component({
  selector: 'app-perfil-restaurante',
  templateUrl: './perfil-restaurante.component.html',
  styleUrls: ['./perfil-restaurante.component.css'],
})
export class PerfilRestauranteComponent implements OnInit {
  id!: number;
  Nome = '';
  Email = '';
  Nota = 0;
  listaAvaliacao: AvaliacaoModel[] = [];

  constructor(
    private jwtHelper: JwtHelperService,
    private restoService: RestauranteService,
    private avalService:  AvaliacaoService,
    private route: ActivatedRoute,
    private router: Router
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
    this.restoService.buscarPorId(this.id).subscribe({
      next: r => {
        this.Nome  = r.Nome;
        this.Email = r.email;
      },
      error: () => {
        alert('Restaurante não encontrado!');
        this.router.navigate(['/menu']);
      }
    });

    // Lista avaliações associadas (use listarPorIdRestaurante)
    this.avalService.buscarPorRestaurante(this.id)
      .subscribe({
        next: (lista: AvaliacaoModel[]) => {
          this.listaAvaliacao = lista;
        },
        error: err => console.error('Erro avaliações:', err)
      });
  }

  editarRestaurante(): void {
    this.router.navigate(['/perfilRestaurante', this.id, 'editarRestaurante']);
  }

  excluirRestaurante(): void {
    if (!confirm('Confirma exclusão do restaurante?')) return;
    this.restoService.excluir(this.id).subscribe({
      next: () => {
        localStorage.clear();
        this.router.navigate(['/login']);
      },
      error: () => alert('Falha ao excluir. Tente mais tarde.')
    });
  }
}
