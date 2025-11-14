import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { RestauranteService } from '../../services/restaurante.service';
import { PratoService } from '../../services/prato.service';
import { restauranteModel } from '../../model/restaurante.model';
import { Prato } from '../../model/prato.model';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { trigger, transition, style, animate, keyframes, query, stagger } from '@angular/animations';
import { Subscription, fromEvent, merge, of, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, retry, catchError, finalize, switchMap, tap } from 'rxjs/operators';

// Interfaces para tipagem
interface FeedbackMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  autoClose?: boolean;
  timeout?: number;
}

interface LoadingState {
  restaurante: boolean;
  pratos: boolean;
  destaques: boolean;
  geral: boolean;
}

@Component({
  selector: 'app-cardapio',
  templateUrl: './cardapio.component.html',
  styleUrls: ['./cardapio.component.css'],
  animations: [
    // Animação principal da página
    trigger('pageAnimation', [
      transition(':enter', [
        query('.page-header', [
          style({ opacity: 0, transform: 'translateY(-30px)' }),
          animate('600ms cubic-bezier(0.35, 0, 0.25, 1)', 
            style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true }),
        query('.destaques-section', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          animate('700ms 200ms cubic-bezier(0.35, 0, 0.25, 1)', 
            style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true }),
        query('.filtros-section', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          animate('800ms 400ms cubic-bezier(0.35, 0, 0.25, 1)', 
            style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true })
      ])
    ]),

    // Animação para cards de destaque
    trigger('destaqueAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px) scale(0.95)' }),
        animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', 
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.55, 0, 0.55, 1)', 
          style({ opacity: 0, transform: 'translateY(-10px) scale(0.95)' }))
      ])
    ]),

    // Animação para lista de destaques
    trigger('destaquesListAnimation', [
      transition('* => *', [
        query('.destaque-card:enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', [
            animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', 
              style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),

    // Animação para cards de pratos
    trigger('pratoCardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px) scale(0.9)' }),
        animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('400ms cubic-bezier(0.55, 0, 0.55, 1)', 
          style({ opacity: 0, transform: 'translateY(-20px) scale(0.9)' }))
      ])
    ]),

    // Animação para lista de pratos
    trigger('pratosListAnimation', [
      transition('* => *', [
        query('.prato-card:enter', [
          style({ opacity: 0, transform: 'translateY(30px)' }),
          stagger('80ms', [
            animate('600ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
              style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),

    // Animação para mensagens de feedback
    trigger('feedbackAnimation', [
      transition(':enter', [
        style({ 
          opacity: 0, 
          transform: 'translateX(100%) scale(0.8)',
          filter: 'blur(5px)'
        }),
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', keyframes([
          style({ 
            opacity: 0.3, 
            transform: 'translateX(50%) scale(0.9)',
            filter: 'blur(3px)',
            offset: 0.3
          }),
          style({ 
            opacity: 0.8, 
            transform: 'translateX(10%) scale(0.98)',
            filter: 'blur(1px)',
            offset: 0.7
          }),
          style({ 
            opacity: 1, 
            transform: 'translateX(0) scale(1)',
            filter: 'blur(0)',
            offset: 1
          })
        ]))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.55, 0, 0.55, 1)', 
          style({ 
            opacity: 0, 
            transform: 'translateX(100%) scale(0.8)',
            filter: 'blur(5px)'
          }))
      ])
    ]),

    // Animação para estado vazio
    trigger('emptyStateAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('500ms 300ms cubic-bezier(0.35, 0, 0.25, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),

    // Animação para botões
    trigger('buttonAnimation', [
      transition('* => loading', [
        style({ transform: 'scale(1)' }),
        animate('200ms ease-in', style({ transform: 'scale(0.95)' })),
        animate('200ms ease-out', style({ transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class CardapioComponent implements OnInit, OnDestroy {
  public isCliente = false;
  public restauranteId!: number;
  public restaurante!: restauranteModel;
  public pratos: Prato[] = [];
  public filteredPratos: Prato[] = [];
  public destaques: Prato[] = [];
  public searchTerm = '';
  public carregandoDestaques = false;

  // Sistema de feedback avançado
  public feedbackMessages: FeedbackMessage[] = [];
  private feedbackIdCounter = 0;

  // Estados de loading detalhados
  public loadingState: LoadingState = {
    restaurante: false,
    pratos: false,
    destaques: false,
    geral: false
  };

  // Sistema de conectividade e retry
  public isOnline = navigator.onLine;
  private subscriptions = new Subscription();
  private retryAttempts = new Map<string, number>();
  private maxRetryAttempts = 3;

  // Controle de busca com debounce
  private searchSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private restSvc: RestauranteService,
    private pratoSvc: PratoService,
    private auth: AutenticacaoService
  ) {}

  ngOnInit(): void {
    this.configurarEventosConectividade();
    this.inicializarComponente();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }
  }

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    // Cleanup se necessário
  }

  /**
   * Configura monitoramento de conectividade
   */
  private configurarEventosConectividade(): void {
    const online$ = fromEvent(window, 'online').pipe(
      tap(() => {
        this.isOnline = true;
        this.showFeedbackMessage('success', 'Conexão Restabelecida', 
          'Conectado à internet. Dados atualizados.', true, 3000);
        this.recarregarDadosSeNecessario();
      })
    );

    const offline$ = fromEvent(window, 'offline').pipe(
      tap(() => {
        this.isOnline = false;
        this.showFeedbackMessage('warning', 'Sem Conexão', 
          'Você está offline. Alguns dados podem estar desatualizados.', false);
      })
    );

    this.subscriptions.add(merge(online$, offline$).subscribe());
  }

  /**
   * Inicializa o componente com validação
   */
  private inicializarComponente(): void {
    try {
      const usuario = this.auth.usuarioAtual;
      this.isCliente = usuario?.tipo === 'cliente';
      this.restauranteId = +this.route.snapshot.paramMap.get('id')!;
      
      if (!this.restauranteId || this.restauranteId <= 0) {
        this.showFeedbackMessage('error', 'Erro de Navegação', 
          'ID do restaurante inválido. Redirecionando...', true, 3000);
        setTimeout(() => this.router.navigate(['/menu']), 3000);
        return;
      }

      console.log('🔍 Inicializando cardápio:', {
        restauranteId: this.restauranteId,
        isCliente: this.isCliente,
        isOnline: this.isOnline
      });

      if (!this.isOnline) {
        this.showFeedbackMessage('warning', 'Modo Offline', 
          'Tentando carregar dados armazenados localmente...', true, 3000);
      }
      
      this.carregarDados();
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      this.showFeedbackMessage('error', 'Erro de Inicialização', 
        'Falha ao inicializar a página. Tente recarregar.', true, 5000);
    }
  }

  /**
   * Carrega todos os dados do cardápio
   */
  private carregarDados(): void {
    this.loadingState.geral = true;
    this.showFeedbackMessage('info', 'Carregando', 
      'Buscando informações do restaurante e cardápio...', true, 2000);

    // Carregar dados em paralelo
    Promise.all([
      this.carregarRestaurante(),
      this.carregarPratos()
    ]).then(() => {
      this.loadingState.geral = false;
      this.showFeedbackMessage('success', 'Cardápio Carregado', 
        'Informações atualizadas com sucesso!', true, 2000);
      
      // Carregar destaques após ter os pratos
      this.carregarDestaques();
    }).catch((error: any) => {
      this.loadingState.geral = false;
      console.error('❌ Erro ao carregar dados:', error);
      this.showFeedbackMessage('error', 'Erro no Carregamento', 
        'Falha ao carregar alguns dados. Verifique sua conexão.', true, 5000);
    });
  }

  /**
   * Carrega dados do restaurante
   */
  private async carregarRestaurante(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingState.restaurante = true;
      
      this.executeWithRetry('restaurante', () => 
        this.restSvc.buscarPorId(this.restauranteId)
      ).subscribe({
        next: (r: restauranteModel) => {
          this.restaurante = r;
          this.loadingState.restaurante = false;
          console.log('✅ Restaurante carregado:', r.Nome);
          resolve();
        },
        error: (error: any) => {
          this.loadingState.restaurante = false;
          console.error('❌ Erro ao carregar restaurante:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Carrega pratos do restaurante
   */
  private async carregarPratos(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingState.pratos = true;
      
      this.executeWithRetry('pratos', () => 
        this.pratoSvc.getByRestaurante(this.restauranteId)
      ).subscribe({
        next: (list: Prato[]) => {
          this.pratos = list;
          this.filteredPratos = [...list];
          this.loadingState.pratos = false;
          console.log('✅ Pratos carregados:', list.length);
          resolve();
        },
        error: (error: any) => {
          this.loadingState.pratos = false;
          console.error('❌ Erro ao carregar pratos:', error);
          reject(error);
        }
      });
    });
  }
  /**
   * Carrega destaques com tratamento de erro aprimorado
   */
  carregarDestaques(limit = 3, min = 1): void {
    this.loadingState.destaques = true;
    this.carregandoDestaques = true;
    
    this.executeWithRetry('destaques', () => 
      this.pratoSvc.getDestaques(this.restauranteId, limit, min)
    ).subscribe({
      next: (ds: Prato[]) => {
        this.destaques = ds;
        this.loadingState.destaques = false;
        this.carregandoDestaques = false;
        console.log('✅ Destaques carregados:', ds.length);
        
        if (ds.length > 0) {
          this.showFeedbackMessage('success', 'Destaques Atualizados', 
            `${ds.length} pratos em destaque carregados!`, true, 2000);
        }
      },
      error: (error: any) => {
        console.error('❌ Erro ao carregar destaques:', error);
        this.destaques = [];
        this.loadingState.destaques = false;
        this.carregandoDestaques = false;
        
        let errorMessage = 'Não foi possível carregar os destaques.';
        if (!this.isOnline) {
          errorMessage = 'Sem conexão. Destaques indisponíveis no momento.';
        }
        
        this.showFeedbackMessage('warning', 'Destaques Indisponíveis', 
          errorMessage, true, 3000);
      }
    });
  }

  /**
   * Atualiza destaques com feedback
   */
  public refreshDestaques(): void {
    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Conecte-se à internet para atualizar os destaques.', true, 3000);
      return;
    }

    this.showFeedbackMessage('info', 'Atualizando Destaques', 
      'Buscando novos pratos em destaque...', true, 1500);
    this.carregarDestaques();
  }

  /**
   * Busca com debounce e feedback melhorado
   */
  onSearch(): void {
    // Cancela busca anterior se existir
    if (this.searchSubscription) {
      this.searchSubscription.unsubscribe();
    }

    // Implementa debounce na busca
    this.searchSubscription = of(this.searchTerm).pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => {
        const term = this.searchTerm.trim().toLowerCase();
        
        if (term.length > 0) {
          this.showFeedbackMessage('info', 'Buscando', 
            `Procurando por "${term}"...`, true, 1000);
        }
        
        const previousCount = this.filteredPratos.length;
        this.filteredPratos = term
          ? this.pratos.filter(p => p.Nome.toLowerCase().includes(term))
          : [...this.pratos];
        
        // Feedback sobre resultado da busca
        if (term.length > 0) {
          const resultCount = this.filteredPratos.length;
          if (resultCount === 0) {
            this.showFeedbackMessage('warning', 'Nenhum Resultado', 
              `Nenhum prato encontrado para "${term}". Tente outro termo.`, true, 3000);
          } else if (resultCount !== previousCount) {
            this.showFeedbackMessage('success', 'Busca Concluída', 
              `${resultCount} ${resultCount === 1 ? 'prato encontrado' : 'pratos encontrados'}!`, true, 2000);
          }
        }
      })
    ).subscribe();
  }

  /**
   * Limpa busca e feedback
   */
  public limparBusca(): void {
    this.searchTerm = '';
    this.filteredPratos = [...this.pratos];
    this.showFeedbackMessage('info', 'Busca Limpa', 
      'Mostrando todos os pratos do cardápio.', true, 1500);
  }

  /**
   * Navegar para avaliações com validação
   */
  public verAvaliacoes(prato: Prato): void {
    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Conecte-se à internet para ver as avaliações.', true, 3000);
      return;
    }
    
    this.showFeedbackMessage('info', 'Redirecionando', 
      `Abrindo avaliações de ${prato.Nome}...`, true, 1000);
    this.router.navigate(['/prato', prato.ID, 'avaliacoes']);
  }

  /**
   * Navegar para criar avaliação com validação
   */
  public avaliarPrato(prato: Prato): void {
    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Conecte-se à internet para avaliar o prato.', true, 3000);
      return;
    }
    
    this.showFeedbackMessage('info', 'Redirecionando', 
      `Abrindo formulário para avaliar ${prato.Nome}...`, true, 1000);
    this.router.navigate(['/prato', prato.ID, 'avaliacoes', 'criar']);
  }

  starsArray(n?: number) {
    const v = Math.round(n || 0);
    return Array(v).fill(0);
  }

  // ===================================
  // SISTEMA DE FEEDBACK AVANÇADO
  // ===================================

  /**
   * Exibe mensagem de feedback ao usuário
   */
  showFeedbackMessage(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    autoClose: boolean = true,
    timeout: number = 4000
  ): void {
    const id = `feedback-${++this.feedbackIdCounter}`;
    const feedbackMessage: FeedbackMessage = {
      id,
      type,
      title,
      message,
      autoClose,
      timeout
    };

    this.feedbackMessages.push(feedbackMessage);

    if (autoClose) {
      timer(timeout).subscribe(() => {
        this.closeFeedbackMessage(id);
      });
    }
  }

  /**
   * Fecha mensagem de feedback específica
   */
  public closeFeedbackMessage(id: string): void {
    const index = this.feedbackMessages.findIndex(msg => msg.id === id);
    if (index > -1) {
      this.feedbackMessages.splice(index, 1);
    }
  }

  /**
   * Fecha todas as mensagens de feedback
   */
  closeAllFeedbackMessages(): void {
    this.feedbackMessages = [];
  }

  /**
   * Executa operação com sistema de retry automático
   */
  private executeWithRetry<T>(
    operationKey: string,
    operation: () => any,
    maxRetries: number = this.maxRetryAttempts
  ): any {
    const currentAttempts = this.retryAttempts.get(operationKey) || 0;

    return operation().pipe(
      retry({
        count: maxRetries,
        delay: (error: any, retryCount: number) => {
          console.warn(`🔄 Tentativa ${retryCount + 1}/${maxRetries + 1} para ${operationKey}:`, error);
          
          if (retryCount < maxRetries) {
            const delay = Math.min(1000 * Math.pow(2, retryCount), 5000);
            this.showFeedbackMessage('info', 'Tentando Novamente', 
              `Tentativa ${retryCount + 1}/${maxRetries + 1} em ${delay/1000}s...`, true, delay - 100);
            return timer(delay);
          }
          
          throw error;
        }
      }),
      tap(() => {
        // Reset counter on success
        this.retryAttempts.delete(operationKey);
      }),
      catchError((error: any) => {
        this.retryAttempts.set(operationKey, currentAttempts + 1);
        
        let userMessage = 'Erro inesperado. Tente novamente.';
        if (error.status === 0) {
          userMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (error.status >= 500) {
          userMessage = 'Erro no servidor. Tente novamente em alguns instantes.';
        } else if (error.status === 404) {
          userMessage = 'Conteúdo não encontrado.';
        } else if (error.status === 403) {
          userMessage = 'Acesso negado.';
        }

        throw error;
      })
    );
  }

  /**
   * Recarrega dados quando conexão é restabelecida
   */
  private recarregarDadosSeNecessario(): void {
    if (!this.restaurante || this.pratos.length === 0) {
      this.carregarDados();
    } else {
      // Apenas atualiza destaques se os dados principais já existem
      this.refreshDestaques();
    }
  }

  // ===================================
  // UTILITÁRIOS DE STATUS
  // ===================================

  /**
   * Verifica se está carregando algum dado
   */
  isLoading(): boolean {
    return Object.values(this.loadingState).some(loading => loading);
  }

  /**
   * Obtém classe CSS para indicador de conectividade
   */
  getConnectivityClass(): string {
    return this.isOnline ? 'online' : 'offline';
  }

  /**
   * Obtém texto do status de conectividade
   */
  public getConnectivityText(): string {
    return this.isOnline ? 'Online' : 'Offline';
  }

  /**
   * Força atualização dos dados
   */
  public forceRefresh(): void {
    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Conecte-se à internet para atualizar os dados.', true, 3000);
      return;
    }

    this.showFeedbackMessage('info', 'Atualizando', 
      'Recarregando cardápio completo...', true, 2000);
    this.carregarDados();
  }

  /**
   * TrackBy function para otimizar renderização
   */
  public trackByPratoId(index: number, prato: Prato): number {
    return prato.ID;
  }
}
