import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { restauranteModel } from '../../model/restaurante.model';
import { RestauranteService } from '../../services/restaurante.service';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],  // <— styleUrls, plural
})
export class MenuComponent implements OnInit {
  id = 0;
  tipoDoUsuario: string | null = null;
  listaRestaurante: restauranteModel[] = [];
  paginaAtual = 1;
  haMaisRestaurantes = true;
  filtro = '';
  filtro_tipo = '';

  constructor(
    private jwtHelper: JwtHelperService,     // <— jwtHelper, não jwthelper
    private service: RestauranteService,
    private router: Router,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) {
      this.router.navigate(['/login']);
      return;
    }

    // Decodifica o payload
    const payload = this.jwtHelper.decodeToken(token);
    this.id = Number(payload.sub);
    this.tipoDoUsuario = payload.tipo as string;

    // Exemplo de checagem extra (opcional)
    if (!this.id) {
      this.router.navigate(['/login']);
      return;
    }

    // Carrega a lista de restaurantes
    this.service.listar().subscribe((lista) => {
      this.listaRestaurante = lista;
    });
  }

  carregarMaisRestaurantes() {
    this.service.listar().subscribe((lista) => {
      this.listaRestaurante.push(...lista);
      if (!this.listaRestaurante.length) {
        this.haMaisRestaurantes = false;
      }
    });
  }

  pesquisarRestaurantes() {
    this.haMaisRestaurantes = true;
    this.paginaAtual = 1;
    this.service.listarNome(this.paginaAtual, this.filtro).subscribe((lista) => {
      this.listaRestaurante = lista;
    });
  }

  filtrarRestaurantes() {
    this.haMaisRestaurantes = true;
    this.paginaAtual = 1;
    this.service
      .listarTipo(this.paginaAtual, this.filtro_tipo)
      .subscribe((lista) => {
        this.listaRestaurante = lista;
      });
  }

  // Não faz mais sentido manter get() que usa jwthelper — use diretamente jwtHelper acima.

  getLingua(): string {
    return this.translate.currentLang;
  }

  ValidaPlaceholderProcura(): string {
    return this.getLingua() === 'en'
      ? 'Type the Name of the Restaurant'
      : 'Digite o Nome do Restaurante';
  }

  larguraRestaurante(restaurante: restauranteModel): string {
    return restaurante.descricao.length >= 256 ? 'restaurante-g' : 'restaurante-p';
  }
}
