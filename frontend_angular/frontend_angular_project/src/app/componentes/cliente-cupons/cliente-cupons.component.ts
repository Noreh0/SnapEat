import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CupomService } from '../../services/cupom.service';
import { CupomModel, PontosUsuarioModel } from '../../model/cupom.model';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-cliente-cupons',
  templateUrl: './cliente-cupons.component.html',
  styleUrls: ['./cliente-cupons.component.css'],
})
export class ClienteCuponsComponent implements OnInit {
  restauranteId!: number;
  clienteId!: number;
  cuponsDisponiveis: CupomModel[] = [];
  pontos: PontosUsuarioModel | null = null;
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cupomService: CupomService,
    private jwtHelper: JwtHelperService
  ) {}

  ngOnInit() {
    this.restauranteId = +this.route.snapshot.paramMap.get('restauranteId')!;
    this.initializeCliente();
    
    if (this.clienteId) {
      this.carregarDados();
    } else {
      this.error = 'Você precisa estar logado como cliente para acessar esta página';
      this.loading = false;
    }
  }

  private initializeCliente() {
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) {
      this.router.navigate(['/login']);
      return;
    }

    const payload = this.jwtHelper.decodeToken(token);
    if (payload.tipo !== 'cliente') {
      this.error = 'Acesso negado. Esta página é exclusiva para clientes.';
      return;
    }

    this.clienteId = +payload.identity || +payload.sub;
  }

  carregarDados() {
    this.loading = true;
    this.error = '';

    // Carregar pontos do cliente
    this.cupomService.pontosCliente(this.clienteId, this.restauranteId).subscribe({
      next: (pontos: PontosUsuarioModel) => {
        this.pontos = pontos;
        this.carregarCuponsDisponiveis();
      },
      error: (err: any) => {
        console.error('Erro ao carregar pontos:', err);
        this.pontos = {
          cliente_id: this.clienteId,
          restaurante_id: this.restauranteId,
          pontos_totais: 0,
          pontos_utilizados: 0,
          pontos_disponiveis: 0
        };
        this.carregarCuponsDisponiveis();
      }
    });
  }

  carregarCuponsDisponiveis() {
    // Buscar TODOS os cupons ativos do restaurante (não filtrar por pontos aqui)
    this.cupomService.buscarPorRestaurante(this.restauranteId).subscribe({
      next: (cupons: CupomModel[]) => {
        // Mostrar apenas cupons ativos, não expirados e com usos disponíveis
        this.cuponsDisponiveis = cupons.filter((cupom: CupomModel) => 
          cupom.ativo && 
          !cupom.expirado && 
          cupom.usos_restantes! > 0
        );
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err.message || 'Erro ao carregar cupons';
        this.loading = false;
        console.error('Erro ao carregar cupons disponíveis:', err);
      }
    });
  }

  resgatarCupom(cupom: CupomModel) {
    if (!this.pontos || this.pontos.pontos_disponiveis < cupom.pontos_necessarios) {
      alert('Pontos insuficientes para resgatar este cupom.');
      return;
    }

    const confirmacao = confirm(
      `Deseja resgatar o cupom "${cupom.titulo}" por ${cupom.pontos_necessarios} pontos?\n\n` +
      `Seus pontos atuais: ${this.pontos.pontos_disponiveis}\n` +
      `Pontos após resgate: ${this.pontos.pontos_disponiveis - cupom.pontos_necessarios}`
    );

    if (!confirmacao) return;

    const dadosResgate = {
      cupom_id: cupom.ID!,
      cliente_id: this.clienteId,
      restaurante_id: this.restauranteId
    };

    this.cupomService.resgatarCupom(dadosResgate).subscribe({
      next: (resultado) => {
        alert(`Cupom resgatado com sucesso!\nCódigo: ${resultado.codigo}\n\nGuarde este código para usar no restaurante.`);
        this.carregarDados(); // Recarregar dados para atualizar pontos
      },
      error: (err) => {
        alert('Erro ao resgatar cupom: ' + (err.error?.message || err.message));
        console.error(err);
      }
    });
  }

  podeResgatar(cupom: CupomModel): boolean {
    return this.pontos?.pontos_disponiveis! >= cupom.pontos_necessarios;
  }

  voltar() {
    this.router.navigate(['/restaurante', this.restauranteId]);
  }

  // Helpers para formatação
  formatarData(dataIso: string): string {
    return new Date(dataIso).toLocaleDateString('pt-BR');
  }

  formatarDesconto(cupom: CupomModel): string {
    if (cupom.desconto_percentual && cupom.desconto_percentual > 0) {
      return `${cupom.desconto_percentual}% OFF`;
    }
    if (cupom.desconto_valor && cupom.desconto_valor > 0) {
      return `R$ ${cupom.desconto_valor.toFixed(2)} OFF`;
    }
    return 'Desconto disponível';
  }
}