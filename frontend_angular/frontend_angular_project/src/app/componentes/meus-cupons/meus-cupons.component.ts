import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CupomService } from '../../services/cupom.service';
import { JwtHelperService } from '@auth0/angular-jwt';

export interface CupomResgatado {
  ID?: number;
  cupom_id: number;
  cliente_id: number;
  restaurante_id: number;
  codigo_resgate: string;
  data_resgate: string;
  usado: boolean;
  data_uso?: string;
  // Dados do cupom relacionado
  cupom_titulo: string;
  cupom_descricao?: string;
  desconto_percentual?: number;
  desconto_valor?: number;
  valor_minimo?: number;
  data_validade: string;
  restaurante_nome: string;
  pontos_usados: number;
}

@Component({
  selector: 'app-meus-cupons',
  templateUrl: './meus-cupons.component.html',
  styleUrls: ['./meus-cupons.component.css'],
})
export class MeusCuponsComponent implements OnInit {
  clienteId!: number;
  cuponsResgatados: CupomResgatado[] = [];
  loading = true;
  error = '';
  filtroTexto = '';
  cuponsResgatadosFiltrados: CupomResgatado[] = [];

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cupomService: CupomService,
    private jwtHelper: JwtHelperService
  ) {}

  ngOnInit() {
    this.initializeCliente();
    
    if (this.clienteId) {
      this.carregarMeusCupons();
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

  carregarMeusCupons() {
    this.loading = true;
    this.error = '';

    this.cupomService.meusCuponsResgatados(this.clienteId).subscribe({
      next: (cupons: CupomResgatado[]) => {
        this.cuponsResgatados = cupons;
        this.cuponsResgatadosFiltrados = [...cupons];
        this.loading = false;
      },
      error: (err: any) => {
        this.error = err.message || 'Erro ao carregar seus cupons';
        this.loading = false;
        console.error('Erro ao carregar cupons resgatados:', err);
      }
    });
  }

  filtrarCupons() {
    if (!this.filtroTexto.trim()) {
      this.cuponsResgatadosFiltrados = [...this.cuponsResgatados];
      return;
    }

    const termo = this.filtroTexto.toLowerCase().trim();
    this.cuponsResgatadosFiltrados = this.cuponsResgatados.filter(cupom =>
      cupom.cupom_titulo.toLowerCase().includes(termo) ||
      cupom.restaurante_nome.toLowerCase().includes(termo) ||
      cupom.codigo_resgate.toLowerCase().includes(termo) ||
      (cupom.cupom_descricao && cupom.cupom_descricao.toLowerCase().includes(termo))
    );
  }

  limparFiltro() {
    this.filtroTexto = '';
    this.cuponsResgatadosFiltrados = [...this.cuponsResgatados];
  }

  copiarCodigo(codigo: string) {
    navigator.clipboard.writeText(codigo).then(() => {
      alert('Código copiado para a área de transferência!');
    }).catch(err => {
      console.error('Erro ao copiar código:', err);
      // Fallback para browsers mais antigos
      const textArea = document.createElement('textarea');
      textArea.value = codigo;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      alert('Código copiado para a área de transferência!');
    });
  }

  voltar() {
    this.router.navigate(['/perfilCliente', this.clienteId]);
  }

  // Helpers para formatação
  formatarData(dataIso: string): string {
    return new Date(dataIso).toLocaleDateString('pt-BR');
  }

  formatarDataHora(dataIso: string): string {
    return new Date(dataIso).toLocaleString('pt-BR');
  }

  formatarDesconto(cupom: CupomResgatado): string {
    if (cupom.desconto_percentual && cupom.desconto_percentual > 0) {
      return `${cupom.desconto_percentual}% OFF`;
    }
    if (cupom.desconto_valor && cupom.desconto_valor > 0) {
      return `R$ ${cupom.desconto_valor.toFixed(2)} OFF`;
    }
    return 'Desconto disponível';
  }

  isExpirado(cupom: CupomResgatado): boolean {
    return new Date(cupom.data_validade) < new Date();
  }

  getStatusClass(cupom: CupomResgatado): string {
    if (cupom.usado) return 'usado';
    if (this.isExpirado(cupom)) return 'expirado';
    return 'ativo';
  }

  getStatusLabel(cupom: CupomResgatado): string {
    if (cupom.usado) return 'Usado';
    if (this.isExpirado(cupom)) return 'Expirado';
    return 'Pronto para usar';
  }

  // Getters para estatísticas
  get cuponsAtivos(): number {
    return this.cuponsResgatados.filter(c => !c.usado && !this.isExpirado(c)).length;
  }

  get cuponsUsados(): number {
    return this.cuponsResgatados.filter(c => c.usado).length;
  }

  get cuponsExpirados(): number {
    return this.cuponsResgatados.filter(c => !c.usado && this.isExpirado(c)).length;
  }

  get totalPontosUsados(): number {
    return this.cuponsResgatados.reduce((total, c) => total + c.pontos_usados, 0);
  }
}