import { Component, Input, OnInit, input } from '@angular/core';
import { Router } from '@angular/router';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { clienteModel } from '../../model/cliente.model';
import { restauranteModel } from '../../model/restaurante.model';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { ClienteService } from '../../services/cliente.service';
import { RestauranteService } from '../../services/restaurante.service';

@Component({
  selector: 'app-admin',
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  lista_Cliente: clienteModel[] = [];
  lista_Restaurante: restauranteModel[] = [];
  lista_Avaliacao: AvaliacaoModel[] = [];
  @Input() avaliacao!: AvaliacaoModel;

  constructor(
    private clienteservice: ClienteService,
    private restauranteservice: RestauranteService,
    private avaliacaoservice: AvaliacaoService,
    private router: Router
  ) {}
  ngOnInit(): void {
    this.restauranteservice.listar().subscribe((listaRestaurante) => {
      this.lista_Restaurante = listaRestaurante;
    });
    this.clienteservice.listar().subscribe((listaCliente) => {
      this.lista_Cliente = listaCliente;
    });
    this.avaliacaoservice.listar().subscribe((listaAvaliacao) => {
      this.lista_Avaliacao = listaAvaliacao;
    });
  }
  get_tipo() {
    return sessionStorage.getItem('tipo');
  }
  excluirAvaliacao(ID: number) {
    this.avaliacaoservice.excluir(ID).subscribe(() => {
      window.location.reload();
    });
  }
  excluirCliente(ID: number) {
    this.clienteservice.excluir(ID).subscribe(() => {
      window.location.reload();
    });
  }
  excluirRestaurante(ID: number) {
    this.restauranteservice.excluir(ID).subscribe(() => {
      window.location.reload();
    });
  }
}
