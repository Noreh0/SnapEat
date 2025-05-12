import { Component, Input, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { restauranteModel } from '../../model/restaurante.model';
import { RestauranteService } from '../../services/restaurante.service';
import { JwtHelperService } from '@auth0/angular-jwt';
@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css',
})
export class MenuComponent implements OnInit {
  @Input() restaurante!: restauranteModel;
  listaRestaurante: restauranteModel[] = [];
  paginaAtual: number = 1;
  haMaisRestaurantes: boolean = true;
  filtro: string = '';
  filtro_tipo: string = '';
  constructor(
    private jwthelper: JwtHelperService,
    private service: RestauranteService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    if (this.get() == null) {
      this.router.navigate(['/login']);
    }
    this.service.listar().subscribe((listaRestaurante) => {
      this.listaRestaurante = listaRestaurante;
      console.log(listaRestaurante);
    });
    console.log(this.listaRestaurante);
  }

  carregarMaisRestaurantes() {
    this.service.listar().subscribe((listaRestaurante) => {
      this.listaRestaurante.push(...listaRestaurante);
      if (!this.listaRestaurante.length) {
        this.haMaisRestaurantes = false;
      }
    });
  }
  pesquisarRestaurantes() {
    this.haMaisRestaurantes = true;
    this.paginaAtual = 1;
    this.service
      .listarNome(this.paginaAtual, this.filtro)
      .subscribe((listaRestaurante) => {
        this.listaRestaurante = listaRestaurante;
      });
  }
  filtrarRestaurantes() {
    this.haMaisRestaurantes = true;
    this.paginaAtual = 1;
    this.service
      .listarTipo(this.paginaAtual, this.filtro_tipo)
      .subscribe((listaRestaurante) => {
        this.listaRestaurante = listaRestaurante;
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
  get_tipo() {
    return localStorage.getItem('tipo');
  }
  getLingua() {
    return this.translate.currentLang;
  }
  ValidaPlaceholderProcura() {
    if (this.getLingua() == 'en') {
      return 'Type the Name of the Restaurant';
    } else {
      return 'Digite o Nome do Restaurante';
    }
  }
  larguraRestaurante(): string {
    if (this.restaurante.descricao.length >= 256) {
      return 'restaurante-g';
    }
    return 'restaurante-p';
  }
}
