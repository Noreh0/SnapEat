// perfil-cliente.component.ts
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
  // Propriedades que o template usa
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
    // Pega ID do route e do token
    const idParam = this.route.snapshot.paramMap.get('id_cliente');
    const idToken = this.getIdFromToken();

    if (!idParam || idToken === null) {
      this.router.navigate(['/login']);
      return;
    }

    this.id = +idParam;

    // Só permite ver seu próprio perfil
    if (this.id !== idToken) {
      this.router.navigate(['/menu']);
      return;
    }

    // Busca dados do cliente
    this.clienteService.buscarPorId(this.id).subscribe({
      next: c => {
        this.Nome  = c.Nome;
        this.Email = c.email;
      },
      error: () => this.router.navigate(['/menu'])
    });

    // Busca avaliações deste cliente
    // Substitua este:
    // this.avaliacaoService.listarPorId(this.id).subscribe(...)
    // por este:
    this.avaliacaoService.buscarPorCliente(this.id).subscribe({
      next: avals => this.listaAvaliacao = avals,
      error: err  => console.error('Erro ao buscar avaliações:', err)
    });
  }

  private getIdFromToken(): number | null {
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) return null;
    const payload: any = this.jwtHelper.decodeToken(token);
    return payload.sub ? +payload.sub : null;
  }

  // Botão “Editar” e “Excluir”
  editarCliente(): void {
    this.router.navigate(['/perfilCliente', this.id, 'editarCliente']);
  }
  excluirCliente(): void {
    this.clienteService.excluir(this.id).subscribe({
      next: () => {
        localStorage.clear();
        this.router.navigate(['/login']);
      },
      error: err => {
        console.error(err);
        alert('Não foi possível excluir sua conta.');
      }
    });
  }
}
