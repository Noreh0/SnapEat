import { Component, Input } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { RestauranteService } from '../../services/restaurante.service';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-perfil-restaurante',
  templateUrl: './perfil-restaurante.component.html',
  styleUrl: './perfil-restaurante.component.css',
})
export class PerfilRestauranteComponent {
  listaAvaliacao: AvaliacaoModel[] = [];
  @Input() Nome!: String;
  @Input() Email!: string;
  @Input() Nota = 0;
  email = this.route.snapshot.paramMap.get('id_restaurante');
  @Input() id!: number;
  constructor(
    private jwthelper: JwtHelperService,
    private service: RestauranteService,
    private service_avaliacao: AvaliacaoService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    if (this.get() == null) {
      this.router.navigate(['/login']);
    }
    this.service.buscarPorEmail(this.email!).subscribe((restaurantes) => {
      for (let restaurante of restaurantes) {
        this.Nome = restaurante.Nome;
        this.Email = restaurante.email;
        this.id = restaurante.ID;
        console.log(this.Nome);
      }
      this.service_avaliacao
        .listarPorIdRestaurante(this.id!)
        .subscribe((listaAvaliacao) => {
          this.listaAvaliacao = listaAvaliacao;
          for (const avaliacao of listaAvaliacao) {
            this.Nota += avaliacao.Nota;
          }
          this.Nota = this.Nota / listaAvaliacao.length;
          this.Nota = Number(this.Nota.toFixed(1));
        });
    });
  }
  excluirRestaurante() {
    console.log('Excluindo Restaurante: ' + this.id);
    return this.service.excluir(this.id!).subscribe(() => {
      localStorage.clear();
      this.router.navigate(['/login']);
    });
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
  get_id() {
    return this.id;
  }
}
