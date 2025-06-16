import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';

import { AvaliacaoModel } from '../../model/avaliacao.model';
import { clienteModel }  from '../../model/cliente.model';
import { AvaliacaoService }  from '../../services/avaliacao.service';
import { ClienteService }    from '../../services/cliente.service';

@Component({
  selector: 'app-perfil-cliente',
  templateUrl: './perfil-cliente.component.html',
  styleUrls: ['./perfil-cliente.component.css'],
})
export class PerfilClienteComponent implements OnInit {
  // Propriedades usadas pelo template
  Nome = '';
  Email = '';
  id = 0;
  listaAvaliacao: AvaliacaoModel[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jwtHelper: JwtHelperService,
    private clienteService: ClienteService,
    private avaliacaoService: AvaliacaoService
  ) {}

  ngOnInit(): void {
    // 1) Pega ID da rota e do token
    const idParam = this.route.snapshot.paramMap.get('id_cliente');
    const idToken = this.getIdFromToken();

    if (!idParam || idToken === null) {
      // Se não tiver ID na rota ou token inválido, volta pro login
      this.router.navigate(['/login']);
      return;
    }

    this.id = +idParam;

    // 2) Só permite ver seu próprio perfil
    if (this.id !== idToken) {
      this.router.navigate(['/menu']);
      return;
    }

    // 3) Busca informações básicas do cliente
    this.clienteService.buscarPorId(this.id).subscribe({
      next: c => {
        this.Nome  = c.Nome;
        this.Email = c.email;
      },
      error: () => {
        this.router.navigate(['/menu']);
      }
    });

    // 4) Busca avaliações deste cliente
    this.avaliacaoService.buscarPorCliente(this.id).subscribe({
      next: avals => {
        this.listaAvaliacao = avals;
      },
      error: err  => {
        console.error('Erro ao buscar avaliações:', err);
      }
    });
  }

  private getIdFromToken(): number | null {
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) return null;
    const payload: any = this.jwtHelper.decodeToken(token);
    return payload.sub ? +payload.sub : null;
  }

  // Botão “Editar Perfil”
  editarCliente(): void {
    this.router.navigate(['/perfilCliente', this.id, 'editarCliente']);
  }

  // Botão “Editar Avaliação”
irParaEditarAvaliacao(idAvaliacao: number): void {
  this.router.navigate([
    '/perfilCliente',
    this.id,
    'editarAvaliacao',
    idAvaliacao
  ]);
}

  // Botão “Excluir Avaliação”
  // perfil-cliente.component.ts

  removerAvaliacao(idAvaliacao: number): void {
    if (!confirm('Tem certeza que deseja excluir esta avaliação?')) {
      return;
    }
    this.avaliacaoService.excluir(idAvaliacao).subscribe({
      next: () => {
        // Remover localmente para refletir na tela sem recarregar tudo
        this.listaAvaliacao = this.listaAvaliacao.filter(av => av.ID !== idAvaliacao);
      },
      error: (err: any) => {
        console.error('Erro ao excluir avaliação:', err);
        alert('Não foi possível excluir. Tente novamente.');
      }
    });
  }


  // Botão “Excluir Conta”
  excluirCliente(): void {
    if (!confirm('Tem certeza que deseja excluir sua conta?')) {
      return;
    }
    this.clienteService.excluir(this.id).subscribe({
      next: () => {
        localStorage.clear();
        this.router.navigate(['/login']);
      },
      error: () => {
        alert('Erro ao excluir cliente. Tente novamente.');
      }
    });
  }
}
