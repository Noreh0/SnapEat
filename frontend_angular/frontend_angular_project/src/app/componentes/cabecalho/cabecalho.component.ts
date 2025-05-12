import { JwtHelperService } from '@auth0/angular-jwt';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { lastValueFrom } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ClienteService } from '../../services/cliente.service';
import { RestauranteService } from '../../services/restaurante.service';
@Component({
  selector: 'app-cabecalho',
  templateUrl: './cabecalho.component.html',
  styleUrl: './cabecalho.component.css',
})
export class CabecalhoComponent implements OnInit {
  currentLanguage: string = 'en';
  constructor(
    private jwthelper: JwtHelperService,
    private router: Router,
    private translate: TranslateService,
    private apiService: ApiService,
    private cliente: ClienteService,
    private restaurante: RestauranteService
  ) {}

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
  get_id() {
    return localStorage.getItem('id');
  }
  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }

  async ngOnInit(): Promise<void> {
    await this.setLanguage();
  }

  async setLanguage(): Promise<void> {
    const ipInfo$ = this.apiService.getIPInfo();
    const ipInfo = await lastValueFrom(ipInfo$);

    this.translate.setDefaultLang('en');
    if (ipInfo?.country_code?.toUpperCase() == 'BR') {
      this.translate.setDefaultLang('pt');
      this.currentLanguage = 'pt';
    }
  }

  changeLanguage(): void {
    if (this.currentLanguage == 'en') {
      this.translate.use('pt');
      this.currentLanguage = 'pt';
    } else {
      this.translate.use('en');
      this.currentLanguage = 'en';
    }
  }
}
