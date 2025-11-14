import { Component, Input, OnInit } from '@angular/core';
import { PontosService, PontosDisponiveisResponse } from '../../services/pontos.service';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-pontos-info',
  templateUrl: './pontos-info.component.html',
  styleUrls: ['./pontos-info.component.css'],
})
export class PontosInfoComponent implements OnInit {
  @Input() restauranteId!: number;
  @Input() tipoAvaliacao: 'avaliacao' | 'avaliacao_prato' = 'avaliacao';
  
  clienteId!: number;
  pontosInfo: PontosDisponiveisResponse | null = null;
  loading = true;
  error = '';

  constructor(
    private pontosService: PontosService,
    private jwtHelper: JwtHelperService
  ) {}

  ngOnInit() {
    this.initializeCliente();
    
    if (this.clienteId && this.restauranteId) {
      this.carregarPontosDisponiveis();
    }
  }

  private initializeCliente() {
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) {
      return;
    }

    const payload = this.jwtHelper.decodeToken(token);
    if (payload.tipo !== 'cliente') {
      return;
    }

    this.clienteId = +payload.identity || +payload.sub;
  }

  carregarPontosDisponiveis() {
    this.loading = true;
    this.error = '';

    this.pontosService.pontosDisponiveisHoje(this.clienteId, this.restauranteId).subscribe({
      next: (pontos) => {
        this.pontosInfo = pontos;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
        console.error('Erro ao carregar pontos disponíveis:', err);
      }
    });
  }

  get podeGanharPontos(): boolean {
    if (!this.pontosInfo) return false;
    
    if (this.tipoAvaliacao === 'avaliacao') {
      return this.pontosInfo.pode_ganhar_avaliacao;
    } else {
      return this.pontosInfo.pode_ganhar_avaliacao_prato;
    }
  }

  get pontosDisponiveis(): number {
    if (!this.pontosInfo) return 0;
    
    if (this.tipoAvaliacao === 'avaliacao') {
      return this.pontosInfo.pontos_avaliacao;
    } else {
      return this.pontosInfo.pontos_prato;
    }
  }

  get mensagemPontos(): string {
    if (!this.pontosInfo) return '';
    
    if (this.podeGanharPontos) {
      const pontos = this.pontosDisponiveis;
      const tipo = this.tipoAvaliacao === 'avaliacao' ? 'avaliação' : 'avaliação de prato';
      return `Ganhe ${pontos} pontos por esta ${tipo}!`;
    } else {
      return 'Você já ganhou pontos por avaliação hoje neste restaurante.';
    }
  }
}