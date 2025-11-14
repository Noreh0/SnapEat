// restaurante.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DenunciaService } from '../../services/denuncia.service';
import { RestauranteService } from '../../services/restaurante.service';
import { restauranteModel } from '../../model/restaurante.model';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { AvaliacaoService } from '../../services/avaliacao.service'; 
import { JwtHelperService } from '@auth0/angular-jwt';
import { trigger, state, style, transition, animate } from '@angular/animations';

@Component({
  selector: 'app-restaurante',
  templateUrl: './restaurante.component.html',
  styleUrls: ['./restaurante.component.css'],
  animations: [
    trigger('expandCollapse', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('300ms ease-out', style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate('300ms ease-in', style({ height: 0, opacity: 0 }))
      ])
    ]),
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),
    trigger('slideUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px) scale(0.95)' }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ])
    ])
  ]
})
export class RestauranteComponent implements OnInit {
  restaurante!: restauranteModel;
  avaliacoes: AvaliacaoModel[] = [];
  filteredAvaliacoes: AvaliacaoModel[] = [];
  selectedFilter = 0;

  mediaAval = 0;
  totalAval = 0;
  filtroDataInicio: string = ''; // Data inicial do filtro
  filtroDataFim: string = ''; // Data final do filtro
  ClienteComponent = false;       // indica se usuário logado é cliente
  Email = '';                     // email (ou sub) do usuário logado
  usuarioId?: number | string;    // identity
  tipoUsuario?: string;
  imagensExpandidas: Set<number> = new Set(); // IDs das avaliações com imagens expandidas
  imagemModalAberto = false;
  imagemSelecionada: string = '';
  
  // Propriedades para o modal de denúncia
  modalDenunciaAberto = false;
  modalSucessoAberto = false;
  showDenunciaModal = false;
  showSuccessModal = false;
  avaliacaoSelecionada: AvaliacaoModel | null = null;
  motivoDenuncia = '';
  enviandoDenuncia = false;
  erroFormulario = '';
  motivoError = '';


  constructor(
    private svc: RestauranteService,
    private avaliacaoService: AvaliacaoService,
    private route: ActivatedRoute,
    private denunciaSvc: DenunciaService,
    private jwtHelper: JwtHelperService
  ) {}

  ngOnInit(): void {
    this.inicializarUsuario();
    const id = +this.route.snapshot.paramMap.get('id')!;
    // No método que inicializa os dados do restaurante, ajuste a forma como a URL da imagem é tratada:

    // Na função ngOnInit ou outra função que carrega o restaurante:
    this.svc.buscarPorId(id).subscribe((r: restauranteModel) => {
      // Garantir que a URL da imagem está completa
      if (r.imagem_url && !r.imagem_url.startsWith('http')) {
        // Se a URL não começar com http, é um caminho relativo do Firebase Storage
        // Deixar como está, pois o HTML vai lidar com isso
      }
      this.restaurante = r;
      this.mediaAval = r.mediaAvaliacoes ?? 0;
      this.totalAval = r.totalAvaliacoes ?? 0;
    });

    this.avaliacaoService.buscarPorRestaurante(id).subscribe((list: AvaliacaoModel[]) => {
      this.avaliacoes = list
        .filter(a => a.visivel !== false) // só por segurança
        .sort((a,b) =>
          new Date(b.data_avaliacao ?? '').getTime() - new Date(a.data_avaliacao ?? '').getTime()
        );
      this.filteredAvaliacoes = [...this.avaliacoes];
      if (this.avaliacoes.length) {
        const soma = this.avaliacoes.reduce((acc,a)=> acc + (a.Nota || 0), 0);
        this.mediaAval = soma / this.avaliacoes.length;
        this.totalAval = this.avaliacoes.length;
      } else {
        this.mediaAval = 0;
        this.totalAval = 0;
      }
    });
  }
  private inicializarUsuario() {
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) return;
    const payload: any = this.jwtHelper.decodeToken(token);
    // Ajuste conforme payload real:
    this.Email = payload.sub || '';        // se sub for email
    this.usuarioId = payload.sub || payload.identity;
    this.tipoUsuario = payload.tipo;
    this.ClienteComponent = this.tipoUsuario === 'cliente';
  }
  toggleImagens(avaliacaoId: number): void {
    if (this.imagensExpandidas.has(avaliacaoId)) {
      this.imagensExpandidas.delete(avaliacaoId);
    } else {
      this.imagensExpandidas.add(avaliacaoId);
    }
  }
  imagensEstaoExpandidas(avaliacaoId: number): boolean {
    return this.imagensExpandidas.has(avaliacaoId);
  }
  abrirImagemModal(imagemUrl: string): void {
    this.imagemSelecionada = imagemUrl;
    this.imagemModalAberto = true;
    document.body.style.overflow = 'hidden';
  }
  fecharImagemModal(): void {
    this.imagemModalAberto = false;
    this.imagemSelecionada = '';
    document.body.style.overflow = '';
  }
  getTextoToggleImagens(avaliacaoId: number, totalImagens: number): string {
    const expandido = this.imagensEstaoExpandidas(avaliacaoId);
    const textoImagens = totalImagens === 1 ? 'foto' : 'fotos';
    return expandido 
      ? 'Ocultar fotos' 
      : `Ver ${totalImagens} ${textoImagens}`;
  }
  /** chamado sempre que muda o dropdown de filtro */
  filterAvaliacoes() {
    const inicio = this.filtroDataInicio ? new Date(this.filtroDataInicio) : null;
    const fim = this.filtroDataFim ? new Date(this.filtroDataFim) : null;

    this.filteredAvaliacoes = this.avaliacoes.filter(a => {
      const dataAval = a.data_avaliacao ? new Date(a.data_avaliacao) : null;
      const dataOk =
        (!inicio || (dataAval && dataAval >= inicio)) &&
        (!fim || (dataAval && dataAval <= fim));
      const notaOk = this.selectedFilter === 0 || a.Nota === this.selectedFilter;
      return dataOk && notaOk;
    });
  }

  /** renderiza ★ e ☆ conforme a nota */
  podeDenunciar(a: AvaliacaoModel): boolean {
    if (!this.ClienteComponent) return false;
    // Evitar denunciar a própria
    // Se o token não traz ID do cliente, compare por email (necessário que avaliação traga Email do cliente - senão adapte)
    return a.ID_Cliente !== this.usuarioId;
  }

  abrirDenuncia(a: AvaliacaoModel) {
    if (!this.podeDenunciar(a)) return;
    
    this.avaliacaoSelecionada = a;
    this.motivoDenuncia = '';
    this.erroFormulario = '';
    this.motivoError = '';
    this.modalDenunciaAberto = true;
    this.showDenunciaModal = true;
    document.body.style.overflow = 'hidden';
  }

  // Métodos para controlar o modal de denúncia
  fecharModalDenuncia(): void {
    this.modalDenunciaAberto = false;
    this.showDenunciaModal = false;
    this.avaliacaoSelecionada = null;
    this.motivoDenuncia = '';
    this.erroFormulario = '';
    this.motivoError = '';
    document.body.style.overflow = '';
  }

  cancelarDenuncia(): void {
    this.fecharModalDenuncia();
  }

  fecharModalSucesso(): void {
    this.modalSucessoAberto = false;
    this.showSuccessModal = false;
    document.body.style.overflow = '';
  }

  validarFormulario(): boolean {
    const motivo = this.motivoDenuncia.trim();
    
    if (motivo.length < 5) {
      this.erroFormulario = 'O motivo deve ter pelo menos 5 caracteres.';
      this.motivoError = 'O motivo deve ter pelo menos 5 caracteres.';
      return false;
    }
    
    if (motivo.length > 500) {
      this.erroFormulario = 'O motivo não pode exceder 500 caracteres.';
      this.motivoError = 'O motivo não pode exceder 500 caracteres.';
      return false;
    }
    
    this.erroFormulario = '';
    this.motivoError = '';
    return true;
  }

  validarMotivo(): void {
    this.validarFormulario();
  }

  contarCaracteres(): number {
    return this.motivoDenuncia.length;
  }

  isFormValido(): boolean {
    const motivo = this.motivoDenuncia.trim();
    return motivo.length >= 5 && motivo.length <= 500;
  }

  podeEnviarDenuncia(): boolean {
    return this.isFormValido();
  }

  enviarDenuncia(): void {
    if (!this.avaliacaoSelecionada || !this.validarFormulario() || this.enviandoDenuncia) {
      return;
    }

    this.enviandoDenuncia = true;
    this.erroFormulario = '';

    console.log('🔍 Enviando denúncia:', {
      avaliacao_id: this.avaliacaoSelecionada.ID,
      motivo: this.motivoDenuncia.trim()
    });

    this.denunciaSvc.criar(this.avaliacaoSelecionada.ID!, this.motivoDenuncia.trim()).subscribe({
      next: () => {
        this.enviandoDenuncia = false;
        this.fecharModalDenuncia();
        this.modalSucessoAberto = true;
        this.showSuccessModal = true;
        document.body.style.overflow = 'hidden';
      },
      error: (err) => {
        console.error('Erro ao enviar denúncia:', err);
        this.enviandoDenuncia = false;
        this.erroFormulario = err.error?.message || 'Erro ao enviar denúncia. Tente novamente mais tarde.';
        this.motivoError = err.error?.message || 'Erro ao enviar denúncia. Tente novamente mais tarde.';
      }
    });
  }

  renderStars(n: number): string {
    const full = '★'.repeat(Math.round(n));
    const empty = '☆'.repeat(5 - Math.round(n));
    return full + empty;
  }
}
