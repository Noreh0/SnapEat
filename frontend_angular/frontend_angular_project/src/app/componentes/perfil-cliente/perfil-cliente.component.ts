import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { clienteModel } from '../../model/cliente.model';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { ClienteService } from '../../services/cliente.service';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-perfil-cliente',
  templateUrl: './perfil-cliente.component.html',
  styleUrls: ['./perfil-cliente.component.css'],
})
export class PerfilClienteComponent implements OnInit {
  listaAvaliacao: AvaliacaoModel[] = [];
  Nome: string = '';
  Email: string = '';
  id!: number;

  @Input() cliente?: clienteModel;
  @Output() sair = new EventEmitter();

  constructor(
    private jwthelper: JwtHelperService,
    private serviceAvaliacao: AvaliacaoService,
    private route: ActivatedRoute,
    private clienteService: ClienteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id_cliente');
    const idFromToken = this.getIdFromToken();

    if (!idParam || !idFromToken) {
      this.router.navigate(['/login']);
      return;
    }

    this.id = parseInt(idParam);

    this.clienteService.buscarPorId(this.id).subscribe((cliente) => {
      this.Nome = cliente.Nome;
      this.Email = cliente.email;

      this.serviceAvaliacao.listarPorId(this.id).subscribe((avaliacoes) => {
        this.listaAvaliacao = avaliacoes;
      });
    });
  }

  getIdFromToken(): number | null {
    const token = localStorage.getItem('token');
    if (!token) return null;

    const decoded = this.jwthelper.decodeToken(token);
    return decoded?.sub ? parseInt(decoded.sub) : null;
  }

  isPerfilDoUsuario(): boolean {
    return this.getIdFromToken() === this.id;
  }

  excluirCliente(): void {
    if (!this.id) return;

    this.clienteService.excluir(this.id).subscribe(() => {
      localStorage.clear();
      this.router.navigate(['/login']);
    });
  }
}
