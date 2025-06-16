import { JwtHelperService } from '@auth0/angular-jwt';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { lastValueFrom, tap } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ClienteService } from '../../services/cliente.service';
import { RestauranteService } from '../../services/restaurante.service';
import { AutenticacaoService } from '../../services/autenticacao.service';
@Component({
  selector: 'app-cabecalho',
  templateUrl: './cabecalho.component.html',
  styleUrls: ['./cabecalho.component.css'],  // <-- corrigido aqui
})

export class CabecalhoComponent implements OnInit {
  currentLanguage: string = 'en';

  nomeUsuario: string | null = null;
  logado = false;
  tipo: string | null = null;
  id: string | null = null;
  email: string | null = null;
  base: any;

  constructor(
    private jwthelper: JwtHelperService,
    private router: Router,
    private translate: TranslateService,
    private apiService: ApiService,
    private cliente: ClienteService,
    private restaurante: RestauranteService,
    private auth: AutenticacaoService,
    private http: HttpClient
  ) {}

  perfilRestauranteLink(): string[] {
  const id = this.id || localStorage.getItem('id'); // use this.id (já atualizado) se possível
  return id ? ['/perfilRestaurante', id] : ['/login'];
}



  logout() {
  this.auth.logout().subscribe(() => {
    this.logado = false;
    this.nomeUsuario = null;
    this.tipo = null;
    this.id = null;
    this.router.navigate(['/login']);
  });  
  }

  ngOnInit(): void {
    // Inscreva-se no Observable de estado de autenticação (caso exista)
    // Se seu serviço retornar BehaviorSubject<boolean>, basta assinar:
    this.logado = this.auth.isAuthenticated();
    // Quem for disparar o “logado” para atualizar as props, deve chamar
    // algo como `this.auth.authState$.next(true)` no login.
    this.auth.authState$.subscribe((v) => {
      this.logado = v;
      if (v) {
        const payload: any = this.auth.getDecodedToken();
        this.nomeUsuario = payload.nome   // ou payload['name'] se você armazenou
          || payload.email
          || '';
        this.tipo = payload.tipo;
        this.id = String(payload.sub);
      } else {
        this.nomeUsuario = null;
        this.tipo = null;
        this.id = null;
      }
    });
  }

  goHome(): void {
    this.router.navigate(['/']);
  }


  
  buscarNomeUsuario(): void {
  if (!this.id || !this.tipo) return;

  if (this.tipo === 'cliente') {
    this.cliente.buscarPorId(+this.id).subscribe(
      (res: any) => this.nomeUsuario = res?.Nome,
      err => console.warn('Erro ao buscar cliente:', err)
    );
  } else if (this.tipo === 'restaurante') {
    this.restaurante.buscarPorId(+this.id).subscribe(
      (res: any) => this.nomeUsuario = res?.Nome,
      err => console.warn('Erro ao buscar restaurante:', err)
    );
  }
}


  setSessionData(): void {
    const token = localStorage.getItem('token');
    const decoded = token ? this.jwthelper.decodeToken(token) : null;
    const tipo = localStorage.getItem('tipo');
    this.tipo = (tipo === 'cliente' || tipo === 'restaurante') ? tipo : null;
    this.id = localStorage.getItem('id');
    this.logado = !!token && !!decoded;
}
  
  setLanguage(): void {
  this.apiService.getIPInfo().subscribe(ipInfo => {
    const lang = ipInfo?.country_code?.toUpperCase() === 'BR' ? 'pt' : 'en';
    this.translate.setDefaultLang(lang);
    this.translate.use(lang);
    this.currentLanguage = lang;
  });
}


  changeLanguage(): void {
  this.currentLanguage = this.currentLanguage === 'en' ? 'pt' : 'en';
  this.translate.use(this.currentLanguage);
  }

}

