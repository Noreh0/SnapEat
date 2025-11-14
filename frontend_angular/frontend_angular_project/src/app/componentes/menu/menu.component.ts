import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { trigger, state, style, transition, animate, query, stagger } from '@angular/animations';
import { restauranteModel } from '../../model/restaurante.model';
import { RestauranteService, BuscaProximosParams } from '../../services/restaurante.service';
import { NotificacaoService } from '../../services/notificacao.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { TIPOS_RESTAURANTE } from '../../model/tipos-restaurante';
import { FiltroAvancadoParams } from '../filtro-avancado/filtro-avancado.component';
import { environment } from '../../../environments/environment.prod';

@Component({
  selector: 'app-menu',
  templateUrl: './menu.component.html',
  styleUrls: ['./menu.component.css'],
  animations: [
    // Animação principal do container
    trigger('containerFadeIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    
    // Animação staggered para cards
    trigger('cardsAnimation', [
      transition('* => *', [
        query('.restaurante-card:enter', [
          style({ opacity: 0, transform: 'translateY(30px) scale(0.95)' }),
          stagger('100ms', [
            animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
              style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
          ])
        ], { optional: true })
      ])
    ]),
    
    // Animação para seções colapsáveis
    trigger('sectionToggle', [
      transition(':enter', [
        style({ opacity: 0, height: '0px', overflow: 'hidden' }),
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ opacity: 1, height: '*' }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.4, 0, 0.6, 1)', 
          style({ opacity: 0, height: '0px', overflow: 'hidden' }))
      ])
    ]),
    
    // Animação para loading states
    trigger('loadingPulse', [
      state('loading', style({ opacity: 0.6 })),
      state('loaded', style({ opacity: 1 })),
      transition('loading <=> loaded', animate('300ms ease-in-out'))
    ]),
    
    // Animação para mensagens de erro/sucesso
    trigger('messageSlide', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', 
          style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ]),
    
    // Animação para filtros
    trigger('filterAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('300ms ease-out', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ])
  ]
})
export class MenuComponent implements OnInit {
  id = 0;
  tipoDoUsuario: string | null = null;
  isCliente = false;
  isRestaurante = false;
  listaRestaurante: restauranteModel[] = [];
  listaRestauranteFiltrada: restauranteModel[] = [];
  restaurantesProximos: any[] = [];
  carregandoProximos = false;
  erroProximos = '';
  paginaAtual = 1;
  haMaisRestaurantes = true;
  filtro = '';
  filtro_tipo = '';
  tipos = TIPOS_RESTAURANTE;
  recomendados: restauranteModel[] = [];
  filtroAvancado: FiltroAvancadoParams = {};
  resultadosBuscaAvancada: restauranteModel[] = [];
  buscaAvancadaRealizada = false;
  carregandoBusca = false;
  private apiBaseUrl = environment.apiUrl;
  secaoRecomendadosExpandida = true;
  secaoProximosExpandida = true;
  secaoBuscaExpandida = true;
  
  // Estados de loading e erro aprimorados
  carregandoInicial = true;
  carregandoRecomendados = false;
  carregandoFiltros = false;
  erroCarregamento = '';
  erroRecomendados = '';
  erroFiltros = '';
  
  // Sistema de mensagens
  mensagemSucesso = '';
  mensagemErro = '';
  mostrarMensagem = false;
  
  // Estados de conectividade
  online = navigator.onLine;
  tentandoReconectar = false;

  constructor(
    private jwtHelper: JwtHelperService,     // <— jwtHelper, não jwthelper
    private service: RestauranteService,
    private router: Router,
    private translate: TranslateService,
    private notif: NotificacaoService,
  ) {}

  ngOnInit(): void {
    this.configurarEventosConectividade();
    this.inicializarMenu();
  }

  private configurarEventosConectividade(): void {
    window.addEventListener('online', () => {
      this.online = true;
      this.tentandoReconectar = false;
      this.mostrarMensagemSucesso('Conexão restabelecida!');
      this.recarregarDados();
    });
    
    window.addEventListener('offline', () => {
      this.online = false;
      this.mostrarMensagemErro('Conexão perdida. Alguns recursos podem não funcionar.');
    });
  }

  private inicializarMenu(): void {
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) {
      this.mostrarMensagemErro('Sessão expirada. Redirecionando para login...');
      setTimeout(() => this.router.navigate(['/login']), 2000);
      return;
    }
    
    try {
      const payload = this.jwtHelper.decodeToken(token);
      this.id = Number(payload.sub);
      this.tipoDoUsuario = payload.tipo as string;
      
      this.isCliente = this.tipoDoUsuario === 'cliente';
      this.isRestaurante = this.tipoDoUsuario === 'restaurante';

      console.log('🏪 Tipo do usuário logado:', this.tipoDoUsuario, {
        isCliente: this.isCliente,
        isRestaurante: this.isRestaurante
      });

      if (this.isRestaurante) {
        console.log('🔄 Restaurante detectado, redirecionando para dashboard...');
        this.mostrarMensagemInfo('Redirecionando para seu dashboard...');
        setTimeout(() => {
          this.router.navigate(['/dashboard-restaurante', this.id]);
        }, 2000);
        return;
      }

      if (this.isCliente) {
        this.carregarDadosIniciais();
      }
    } catch (error) {
      console.error('Erro ao decodificar token:', error);
      this.mostrarMensagemErro('Erro de autenticação. Faça login novamente.');
      this.router.navigate(['/login']);
    }
  }

  private carregarDadosIniciais(): void {
    this.carregandoInicial = true;
    this.erroCarregamento = '';
    
    this.service.listar().subscribe({
      next: (lista) => {
        this.listaRestaurante = lista;
        this.listaRestauranteFiltrada = lista;
        this.carregandoInicial = false;
        
        if (lista.length === 0) {
          this.mostrarMensagemInfo('Nenhum restaurante encontrado no momento.');
          return;
        }
        
        // Carregar recomendações
        this.carregarRecomendacoes(lista);
        this.buscarRestaurantesProximos();
      },
      error: (error) => {
        this.carregandoInicial = false;
        this.erroCarregamento = 'Erro ao carregar restaurantes';
        console.error('Erro ao carregar restaurantes:', error);
        this.mostrarMensagemErro('Erro ao carregar restaurantes. Tente novamente.');
      }
    });
  }

  carregarRecomendacoes(lista: restauranteModel[]): void {
    const tipo = lista.find(r => !!r.tipo_restaurante)?.tipo_restaurante;
    if (!tipo) return;
    
    this.carregandoRecomendados = true;
    this.erroRecomendados = ''; // Limpar erro anterior
    
    this.service.buscarRecomendados(tipo).subscribe({
      next: (recs) => {
        this.recomendados = recs;
        this.carregandoRecomendados = false;
        
        if (recs.length > 0) {
          this.mostrarMensagemSucesso('Recomendações atualizadas!');
        }
      },
      error: (error) => {
        this.carregandoRecomendados = false;
        this.erroRecomendados = 'Erro ao carregar recomendações';
        console.error('Erro ao carregar recomendações:', error);
        this.mostrarMensagemErro('Erro ao carregar recomendações. Tente novamente.');
      }
    });
  }
  async buscarRestaurantesProximos() {
    if (!this.isCliente) return;
    
    try {
      this.carregandoProximos = true;
      this.erroProximos = '';
      
      const position = await this.service.obterLocalizacaoAtual();
      const params: BuscaProximosParams = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        categoria: undefined,
        raio_km: 5
      };
      
      this.service.buscarProximos(params).subscribe({
        next: (res) => {
          this.restaurantesProximos = res;
          this.carregandoProximos = false;
          if (res.length === 0) {
            this.erroProximos = 'Nenhum restaurante encontrado próximo à sua localização';
          }
        },
        error: (err) => {
          this.carregandoProximos = false;
          console.error('Erro ao buscar restaurantes próximos:', err);
          
          if (err.status === 0) {
            this.erroProximos = 'Erro de conexão. Verifique sua internet.';
          } else if (err.status === 403) {
            this.erroProximos = 'Acesso negado ao serviço de localização';
          } else {
            this.erroProximos = err.error?.message || 'Erro ao buscar restaurantes próximos';
          }
          
          this.mostrarMensagemErro(this.erroProximos);
        }
      });
    } catch (error: any) {
      this.carregandoProximos = false;
      console.error('Erro de localização:', error);
      
      if (error.code === 1) {
        this.erroProximos = 'Permissão de localização negada. Ative a localização para ver restaurantes próximos.';
      } else if (error.code === 2) {
        this.erroProximos = 'Localização não disponível. Verifique suas configurações de GPS.';
      } else if (error.code === 3) {
        this.erroProximos = 'Timeout ao obter localização. Tente novamente.';
      } else {
        this.erroProximos = 'Erro ao obter sua localização';
      }
      
      this.mostrarMensagemErro(this.erroProximos);
    }
  }

  carregarMaisRestaurantes() {
    this.service.listar().subscribe((lista) => {
      this.listaRestaurante.push(...lista);
      if (!this.listaRestaurante.length) {
        this.haMaisRestaurantes = false;
      }
    });
  }
  aplicarFiltroAvancado(filtro: FiltroAvancadoParams): void {
    if (!this.isCliente) return;
    
    this.carregandoBusca = true;
    this.filtroAvancado = filtro;
    
    this.service.buscaAvancada(filtro).subscribe({
      next: (resultado) => {
        this.resultadosBuscaAvancada = resultado;
        this.buscaAvancadaRealizada = true;
        this.carregandoBusca = false;
        
        if (resultado.length === 0) {
          this.mostrarMensagemInfo('Nenhum restaurante encontrado com os filtros aplicados');
        } else {
          this.mostrarMensagemSucesso(`${resultado.length} restaurante(s) encontrado(s)`);
        }
      },
      error: (error) => {
        this.carregandoBusca = false;
        console.error('Erro na busca avançada:', error);
        
        const mensagemErro = error.error?.message || 'Erro ao realizar busca avançada';
        this.mostrarMensagemErro(mensagemErro);
      }
    });
  }
  pesquisarRestaurantes() {
    // ✅ Só executar se for cliente
    if (!this.isCliente) return;
    
    let lista = this.listaRestaurante;
    if (this.filtro_tipo) {
      lista = lista.filter(resto => resto.tipo_restaurante === this.filtro_tipo);
    }
    if (this.filtro) {
      lista = lista.filter(resto =>
        resto.Nome.toLowerCase().includes(this.filtro.toLowerCase())
      );
    }
    this.listaRestauranteFiltrada = lista;
  }

  filtrarRestaurantes() {
    if (!this.isCliente) return;
    
    if (!this.filtro_tipo) {
      this.listaRestauranteFiltrada = [...this.listaRestaurante];
      return;
    }
    
    this.carregandoFiltros = true;
    this.erroFiltros = '';
    
    this.service.listarTipo(this.paginaAtual, this.filtro_tipo).subscribe({
      next: (lista) => {
        this.listaRestauranteFiltrada = lista;
        this.carregandoFiltros = false;
        
        if (lista.length === 0) {
          this.mostrarMensagemInfo(`Nenhum restaurante do tipo "${this.filtro_tipo}" encontrado`);
        }
      },
      error: (error) => {
        this.carregandoFiltros = false;
        this.erroFiltros = 'Erro ao filtrar restaurantes';
        console.error('Erro ao filtrar por tipo:', error);
        this.mostrarMensagemErro('Erro ao aplicar filtro. Tente novamente.');
      }
    });
  }

  buscarRecomendacoes() {
    const tipo = this.filtro_tipo || undefined;
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          this.notif.recomendacoes({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            tipo
          }).subscribe((lista) => this.recomendados = lista);
        },
        () => {
          this.notif.recomendacoes({ tipo }).subscribe((lista) => this.recomendados = lista);
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      this.notif.recomendacoes({ tipo }).subscribe((lista) => this.recomendados = lista);
    }
  }
  // Não faz mais sentido manter get() que usa jwthelper — use diretamente jwtHelper acima.
  toggleRecomendados(): void {
    this.secaoRecomendadosExpandida = !this.secaoRecomendadosExpandida;
  }

  toggleProximos(): void {
    this.secaoProximosExpandida = !this.secaoProximosExpandida;
  }

  toggleBuscaAvancada(): void {
    this.secaoBuscaExpandida = !this.secaoBuscaExpandida;
  }

  larguraRestaurante(restaurante: restauranteModel): string {
    return restaurante.descricao.length >= 256 ? 'restaurante-g' : 'restaurante-p';
  }
  // Crie uma função helper no menu.component.ts
  // Substitua o nome incorreto do método por este:
  getImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) {
      return 'assets/images/default-restaurant.png';
    }
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    return this.apiBaseUrl + imageUrl;
  }

  // ✅ Método para verificar se o usuário pode acessar o menu
  podeAcessarMenu(): boolean {
    return this.isCliente;
  }

  // ✅ Sistema de mensagens de feedback
  private mostrarMensagemSucesso(mensagem: string): void {
    this.mensagemSucesso = mensagem;
    this.mensagemErro = '';
    this.mostrarMensagem = true;
    this.auto_ocultarMensagem();
  }

  private mostrarMensagemErro(mensagem: string): void {
    this.mensagemErro = mensagem;
    this.mensagemSucesso = '';
    this.mostrarMensagem = true;
    this.auto_ocultarMensagem();
  }

  private mostrarMensagemInfo(mensagem: string): void {
    // Para mensagens informativas, usamos o mesmo sistema de sucesso
    this.mostrarMensagemSucesso(mensagem);
  }

  private auto_ocultarMensagem(): void {
    setTimeout(() => {
      this.mostrarMensagem = false;
      this.mensagemSucesso = '';
      this.mensagemErro = '';
    }, 4000);
  }
  
  // ✅ Método público para fechar mensagem manualmente
  fecharMensagem(): void {
    this.mostrarMensagem = false;
    this.mensagemSucesso = '';
    this.mensagemErro = '';
  }

  // ✅ Recarregar dados quando conectividade é restaurada
  recarregarDados(): void {
    if (this.isCliente) {
      this.carregarDadosIniciais();
    }
  }

  // ✅ Método para tentar reconectar
  tentarReconectar(): void {
    this.tentandoReconectar = true;
    this.recarregarDados();
  }

  // ✅ TrackBy function para otimizar performance
  trackByRestauranteId(index: number, restaurante: restauranteModel): any {
    return restaurante.ID || index;
  }

  // ✅ Método para redirecionar restaurante manualmente
  redirecionarParaDashboard(): void {
    if (this.isRestaurante) {
      this.router.navigate(['/dashboard-restaurante', this.id]);
    }
  }
}
