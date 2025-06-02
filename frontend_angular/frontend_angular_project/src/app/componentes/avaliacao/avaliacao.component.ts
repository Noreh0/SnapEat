import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { ClienteService } from '../../services/cliente.service';
import { RestauranteService } from '../../services/restaurante.service';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-avaliacao',
  templateUrl: './avaliacao.component.html',
  styleUrl: './avaliacao.component.css',
})
export class AvaliacaoComponent implements OnInit {
  @Input() Nome_Restaurante!: string;
  @Input() Nome_Cliente!: string;
  @Input() Email!: string;
  @Input() avaliacao!: AvaliacaoModel;
  @Input() EmailRestaurante!: string;
  @Input() ClienteComponent: boolean = false;
  constructor(
    private jwthelper: JwtHelperService,
    private service_restaurante: RestauranteService,
    private service_cliente: ClienteService,
    private service_avaliacao: AvaliacaoService,
    private route: ActivatedRoute
  ) {}

  id = this.route.snapshot.paramMap.get('id_cliente');
  ngOnInit(): void {
    this.service_restaurante
      .buscarPorId(this.avaliacao.ID_Restaurante!)
      .subscribe((restaurante) => {
        this.Nome_Restaurante = restaurante.Nome;
        this.EmailRestaurante = restaurante.email;
      });
    this.service_cliente
      .buscarPorId(this.avaliacao.ID_Cliente!)
      .subscribe((cliente) => {
        this.Nome_Cliente = cliente.Nome;
        this.Email = cliente.email;
      });
  }

  larguraAvaliacao(): string {
    if (this.avaliacao.Comentario!.length >= 256) {
      return 'avaliacao-g';
    }
    return 'avaliacao-p';
  }
  get() {
    const token = localStorage.getItem('token');
    const decodetoken = this.jwthelper.decodeToken(token!);
    if (decodetoken == null) {
      return null;
    }
    const email = decodetoken.sub;
    return email;
  }
  excluirAvaliacao() {
    if (this.avaliacao.ID) {
      this.service_avaliacao.excluir(this.avaliacao.ID!).subscribe(() => {
        window.location.reload();
      });
    }
  }
}
