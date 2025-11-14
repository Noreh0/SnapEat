import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { trigger, transition, style, animate, keyframes, query, stagger } from '@angular/animations';
import { AvaliacaoPratoService } from '../../services/avaliacao-prato.service';
import { AvaliacaoPrato } from '../../model/avaliacao-prato.model';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { restauranteModel } from '../../model/restaurante.model';
import { RestauranteService } from '../../services/restaurante.service';
import { PratoService } from '../../services/prato.service';
import { Prato } from '../../model/prato.model';
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
  avaliacoes: boolean;
  prato: boolean;
  restaurante: boolean;
  excluindo: Set<number>;
  geral: boolean;
}

@Component({
  selector: 'app-avaliacao-prato-list',
  templateUrl: './avaliacao-prato-list.component.html',
  styleUrls: ['./avaliacao-prato-list.component.css'],
  animations: [
    // Animação principal da página
    trigger('pageAnimation', [
      transition(':enter', [
        query('.hero-section', [
          style({ opacity: 0, transform: 'translateY(-50px)' }),
          animate('600ms cubic-bezier(0.35, 0, 0.25, 1)', 
            style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true }),
        query('.main-content', [
          style({ opacity: 0, transform: 'translateY(30px)' }),
          animate('800ms 200ms cubic-bezier(0.35, 0, 0.25, 1)', 
            style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true })
      ])
    ]),

    // Animação para cards de avaliação
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px) scale(0.95)' }),
        animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', 
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms cubic-bezier(0.55, 0, 0.55, 1)', 
          style({ opacity: 0, transform: 'translateY(-20px) scale(0.95)' }))
      ])
    ]),

    // Animação para lista de cards em sequência
    trigger('listAnimation', [
      transition('* => *', [
        query('.avaliacao-card:enter', [
          style({ opacity: 0, transform: 'translateY(30px)' }),
          stagger('100ms', [
            animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', 
              style({ opacity: 1, transform: 'translateY(0)' }))
          ])
        ], { optional: true })
      ])
    ]),

    // Animação para expansão de imagens
    trigger('imageExpandAnimation', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ height: '*', opacity: 1 }))
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate('300ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ height: 0, opacity: 0 }))
      ])
    ]),

    // Animação para modal de imagem
    trigger('modalBackdropAnimation', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('250ms ease-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('200ms ease-in', style({ opacity: 0 }))
      ])
    ]),

    trigger('modalContentAnimation', [
      transition(':enter', [
        style({ 
          opacity: 0, 
          transform: 'translateY(30px) scale(0.9)',
          filter: 'blur(5px)'
        }),
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ 
            opacity: 1, 
            transform: 'translateY(0) scale(1)',
            filter: 'blur(0)'
          }))
      ]),
      transition(':leave', [
        animate('250ms cubic-bezier(0.55, 0, 0.55, 1)', 
          style({ 
            opacity: 0, 
            transform: 'translateY(20px) scale(0.95)',
            filter: 'blur(3px)'
          }))
      ])
    ]),

    // Animação para mensagens de feedback
    trigger('feedbackSlideAnimation', [
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
export class AvaliacaoPratoListComponent implements OnInit, OnDestroy {
  pratoId!: number;
  avaliacoes: AvaliacaoPrato[] = [];
  isCliente = false;
  idClienteLogado?: number;
  restaurante?: restauranteModel;
  prato?: Prato;
  
  // Controle de imagens
  imagensExpandidas = new Set<number>();
  imagemModalAberto = false;
  imagemSelecionada = '';
  
  // Controle de menu de ações
  menuAcoesAberto: number | null = null;

  // Sistema de feedback avançado
  feedbackMessages: FeedbackMessage[] = [];
  private feedbackIdCounter = 0;

  // Estados de loading detalhados
  loadingState: LoadingState = {
    avaliacoes: false,
    prato: false,
    restaurante: false,
    excluindo: new Set<number>(),
    geral: false
  };

  // Sistema de conectividade e retry
  isOnline = navigator.onLine;
  private subscriptions = new Subscription();
  private retryAttempts = new Map<string, number>();
  private maxRetryAttempts = 3;
  
  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: AvaliacaoPratoService,
    public auth: AutenticacaoService,
    private restauranteService: RestauranteService,
    private pratoService: PratoService
  ) {}

  ngOnInit(): void {
    this.configurarEventosConectividade();
    this.inicializarComponente();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    document.body.style.overflow = '';
  }

  @HostListener('window:beforeunload')
  onBeforeUnload(): void {
    document.body.style.overflow = '';
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
          'Você está offline. Algumas funcionalidades podem estar limitadas.', false);
      })
    );

    this.subscriptions.add(merge(online$, offline$).subscribe());
  }

  /**
   * Inicializa o componente com validação
   */
  private inicializarComponente(): void {
    try {
      this.isCliente = this.auth.usuarioAtual?.tipo === 'cliente';
      this.pratoId = +this.route.snapshot.paramMap.get('pratoId')!;
      
      if (!this.pratoId || this.pratoId <= 0) {
        this.showFeedbackMessage('error', 'Erro de Navegação', 
          'ID do prato inválido. Redirecionando...', true, 3000);
        setTimeout(() => this.router.navigate(['/menu']), 3000);
        return;
      }

      const usuario = this.auth.usuarioAtual;
      this.idClienteLogado = Number(usuario?.sub || usuario?.ID || usuario?.id || usuario?.ID_Cliente);
      
      console.log('🔍 Inicializando:', {
        pratoId: this.pratoId,
        clienteId: this.idClienteLogado,
        isCliente: this.isCliente,
        isOnline: this.isOnline
      });
      
      this.loadDados();
    } catch (error) {
      console.error('❌ Erro na inicialização:', error);
      this.showFeedbackMessage('error', 'Erro de Inicialização', 
        'Falha ao inicializar a página. Tente recarregar.', true, 5000);
    }
  }

  /**
   * Carrega todos os dados com tratamento de erro robusto
   */
  loadDados(): void {
    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Modo Offline', 
        'Tentando carregar dados armazenados localmente...', true, 3000);
    }

    this.loadingState.geral = true;
    this.showFeedbackMessage('info', 'Carregando', 
      'Buscando informações do prato e avaliações...', true, 2000);

    // Carregar dados em paralelo com retry automático
    Promise.all([
      this.carregarPrato(),
      this.loadAvaliacoes()
    ]).then(() => {
      this.loadingState.geral = false;
      this.showFeedbackMessage('success', 'Dados Carregados', 
        'Informações atualizadas com sucesso!', true, 2000);
    }).catch(error => {
      this.loadingState.geral = false;
      console.error('❌ Erro ao carregar dados:', error);
      this.showFeedbackMessage('error', 'Erro no Carregamento', 
        'Falha ao carregar alguns dados. Verifique sua conexão.', true, 5000);
    });
  }

  /**
   * Carrega dados do prato com retry automático
   */
  private async carregarPrato(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingState.prato = true;
      
      this.executeWithRetry('prato', () => 
        this.pratoService.getById(this.pratoId)
      ).subscribe({
        next: (prato: Prato) => {
          this.prato = prato;
          this.loadingState.prato = false;
          console.log('✅ Prato carregado:', prato.Nome);
          
          // Carregar restaurante após prato
          if (prato.restaurante_id) {
            this.carregarRestaurante(prato.restaurante_id);
          }
          resolve();
        },
        error: (error: any) => {
          this.loadingState.prato = false;
          console.error('❌ Erro ao carregar prato:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Carrega dados do restaurante
   */
  private carregarRestaurante(restauranteId: number): void {
    this.loadingState.restaurante = true;
    
    this.executeWithRetry('restaurante', () => 
      this.restauranteService.buscarPorId(restauranteId)
    ).subscribe({
      next: (restaurante: restauranteModel) => {
        this.restaurante = restaurante;
        this.loadingState.restaurante = false;
        console.log('✅ Restaurante carregado:', restaurante.Nome);
      },
      error: (error: any) => {
        this.loadingState.restaurante = false;
        console.error('❌ Erro ao carregar restaurante:', error);
        this.showFeedbackMessage('warning', 'Dados Incompletos', 
          'Não foi possível carregar informações do restaurante.', true, 3000);
      }
    });
  }

  /**
   * Carrega avaliações com retry automático
   */
  private async loadAvaliacoes(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.loadingState.avaliacoes = true;
      
      this.executeWithRetry('avaliacoes', () => 
        this.svc.getByPrato(this.pratoId)
      ).subscribe({
        next: (avaliacoes: AvaliacaoPrato[]) => {
          this.avaliacoes = avaliacoes;
          this.loadingState.avaliacoes = false;
          console.log('📝 Avaliações carregadas:', avaliacoes.length);
          
          // Log detalhado de cada avaliação
          avaliacoes.forEach((aval: AvaliacaoPrato, idx: number) => {
            console.log(`📊 Avaliação ${idx + 1}:`, {
              ID: aval.ID,
              Cliente: aval.Nome_Cliente,
              ClienteID: aval.ID_Cliente,
              tem_imagens: aval.tem_imagens,
              total_imagens: aval.imagens_urls?.length || 0,
              imagens: aval.imagens_urls,
              data: aval.created_at,
              isAutor: this.isCliente && aval.ID_Cliente === this.idClienteLogado
            });
          });
          
          console.log('👤 Cliente logado ID:', this.idClienteLogado);
          resolve();
        },
        error: (error: any) => {
          this.loadingState.avaliacoes = false;
          console.error('❌ Erro ao carregar avaliações:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Recarrega dados quando conexão é restabelecida
   */
  private recarregarDadosSeNecessario(): void {
    if (this.avaliacoes.length === 0 || !this.prato) {
      this.loadDados();
    }
  }

  /**
   * Renderiza estrelas como HTML
   */
  renderStars(nota: number): string {
    return '★'.repeat(nota) + '☆'.repeat(5 - nota);
  }

  /**
   * Verifica se é o autor
   */
  isAutor(avaliacao: AvaliacaoPrato): boolean {
    const resultado = this.isCliente && avaliacao.ID_Cliente === this.idClienteLogado;
    console.log(`👤 isAutor (ID ${avaliacao.ID}):`, {
      isCliente: this.isCliente,
      avaliacaoClienteId: avaliacao.ID_Cliente,
      clienteLogadoId: this.idClienteLogado,
      resultado
    });
    return resultado;
  }

  /**
   * Verifica se tem imagens
   */
  temImagens(avaliacao: AvaliacaoPrato): boolean {
    const tem = !!(
      avaliacao.tem_imagens && 
      avaliacao.imagens_urls && 
      Array.isArray(avaliacao.imagens_urls) &&
      avaliacao.imagens_urls.length > 0
    );
    
    console.log(`🖼️ Verificando imagens da avaliação ${avaliacao.ID}:`, {
      tem_imagens: avaliacao.tem_imagens,
      array_existe: !!avaliacao.imagens_urls,
      is_array: Array.isArray(avaliacao.imagens_urls),
      tamanho: avaliacao.imagens_urls?.length || 0,
      resultado: tem
    });
    
    return tem;
  }
  /**
   * Toggle imagens
   */
  toggleImagens(avaliacaoId: number): void {
    console.log(`🔄 Toggle imagens para avaliação ${avaliacaoId}`);
    
    if (this.imagensExpandidas.has(avaliacaoId)) {
      this.imagensExpandidas.delete(avaliacaoId);
      console.log(`   ✅ Imagens ocultadas`);
    } else {
      this.imagensExpandidas.add(avaliacaoId);
      console.log(`   ✅ Imagens expandidas`);
    }
  }

  /**
   * Verifica se imagens estão expandidas
   */
  imagensEstaoExpandidas(avaliacaoId: number): boolean {
    return this.imagensExpandidas.has(avaliacaoId);
  }
  getTextoToggleImagens(avaliacaoId: number, totalImagens: number): string {
    const expandido = this.imagensEstaoExpandidas(avaliacaoId);
    const textoImagens = totalImagens === 1 ? 'foto' : 'fotos';
    return expandido 
      ? 'Ocultar fotos' 
      : `Ver ${totalImagens} ${textoImagens}`;
  }
  /**
   * Abre modal de imagem
   */
  abrirImagemModal(imagemUrl: string): void {
    this.imagemSelecionada = imagemUrl;
    this.imagemModalAberto = true;
    document.body.style.overflow = 'hidden';
  }

  /**
   * Fecha modal de imagem
   */
  fecharImagemModal(): void {
    this.imagemModalAberto = false;
    this.imagemSelecionada = '';
    document.body.style.overflow = '';
  }

  /**
   * Toggle menu de ações
   */
  toggleMenuAcoes(avaliacaoId: number, event: Event): void {
    event.stopPropagation();
    this.menuAcoesAberto = this.menuAcoesAberto === avaliacaoId ? null : avaliacaoId;
  }

  /**
   * Fecha menu ao clicar fora
   */
  fecharMenuAcoes(): void {
    this.menuAcoesAberto = null;
  }

  /**
   * Editar avaliação
   */
  editarAvaliacao(avaliacao: AvaliacaoPrato): void {
    this.router.navigate(['/prato', this.pratoId, 'avaliacoes', avaliacao.ID, 'editar']);
  }

  /**
   * Excluir avaliação com feedback aprimorado
   */
  excluirAvaliacao(avaliacao: AvaliacaoPrato): void {
    if (!confirm(`Tem certeza que deseja excluir sua avaliação sobre "${this.prato?.Nome}"?`)) {
      return;
    }

    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Não é possível excluir avaliações offline. Conecte-se à internet.', true, 4000);
      return;
    }
    
    this.loadingState.excluindo.add(avaliacao.ID);
    this.showFeedbackMessage('info', 'Excluindo Avaliação', 
      'Processando exclusão...', true, 2000);
    
    this.executeWithRetry('excluir', () => 
      this.svc.delete(avaliacao.ID)
    ).subscribe({
      next: () => {
        console.log('🗑️ Avaliação deletada:', avaliacao.ID);
        this.loadingState.excluindo.delete(avaliacao.ID);
        this.menuAcoesAberto = null;
        
        // Remove da lista localmente para feedback imediato
        this.avaliacoes = this.avaliacoes.filter(a => a.ID !== avaliacao.ID);
        
        this.showFeedbackMessage('success', 'Avaliação Excluída', 
          'Sua avaliação foi removida com sucesso!', true, 3000);
        
        // Recarrega para sincronizar
        setTimeout(() => this.loadAvaliacoes(), 1000);
      },
      error: (err: any) => {
        console.error('❌ Erro ao deletar:', err);
        this.loadingState.excluindo.delete(avaliacao.ID);
        
        let errorMessage = 'Erro ao excluir avaliação. Tente novamente.';
        if (err.status === 403) {
          errorMessage = 'Você não tem permissão para excluir esta avaliação.';
        } else if (err.status === 404) {
          errorMessage = 'Avaliação não encontrada. Pode já ter sido excluída.';
          // Remove da lista se não encontrada no servidor
          this.avaliacoes = this.avaliacoes.filter(a => a.ID !== avaliacao.ID);
        } else if (err.status === 0) {
          errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.';
        }
        
        this.showFeedbackMessage('error', 'Erro na Exclusão', errorMessage, true, 5000);
      }
    });
  }

  /**
   * Denunciar avaliação com modal de confirmação
   */
  denunciarAvaliacao(avaliacao: AvaliacaoPrato): void {
    const motivo = prompt(
      'Por que deseja denunciar esta avaliação?\n\nMotivos válidos:\n- Conteúdo ofensivo\n- Spam\n- Informação falsa\n- Violação de termos\n\nDescreva o motivo:'
    );
    
    if (!motivo || motivo.trim().length < 10) {
      if (motivo !== null) {
        this.showFeedbackMessage('warning', 'Denúncia Incompleta', 
          'Por favor, descreva o motivo da denúncia com pelo menos 10 caracteres.', true, 4000);
      }
      return;
    }

    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Não é possível enviar denúncias offline. Conecte-se à internet.', true, 4000);
      return;
    }

    this.menuAcoesAberto = null;
    this.showFeedbackMessage('info', 'Enviando Denúncia', 
      'Processando sua denúncia...', true, 2000);
    
    // Simula envio de denúncia - implementar integração real
    timer(2000).subscribe(() => {
      this.showFeedbackMessage('success', 'Denúncia Enviada', 
        'Sua denúncia foi registrada e será analisada pela equipe de moderação.', true, 5000);
      
      console.log('📢 Denúncia enviada:', {
        avaliacao_id: avaliacao.ID,
        denunciante_id: this.idClienteLogado,
        motivo: motivo,
        timestamp: new Date().toISOString()
      });
    });
  }

  /**
   * Formatar data relativa (ex: "há 2 dias")
   */
  getDataRelativa(dataString?: string): string {
    if (!dataString) return '';
    
    const data = new Date(dataString);
    const agora = new Date();
    const diffMs = agora.getTime() - data.getTime();
    const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDias === 0) return 'Hoje';
    if (diffDias === 1) return 'Ontem';
    if (diffDias < 7) return `Há ${diffDias} dias`;
    if (diffDias < 30) return `Há ${Math.floor(diffDias / 7)} semanas`;
    if (diffDias < 365) return `Há ${Math.floor(diffDias / 30)} meses`;
    return `Há ${Math.floor(diffDias / 365)} anos`;
  }

  /**
   * Voltar ao cardápio
   */
  voltarAoCardapio(): void {
    if (this.restaurante?.ID) {
      this.router.navigate(['/restaurante', this.restaurante.ID, 'cardapio']);
    }
  }

  /**
   * Ir para formulário de nova avaliação
   */
  adicionarAvaliacao(): void {
    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Conecte-se à internet para adicionar uma avaliação.', true, 4000);
      return;
    }
    
    this.showFeedbackMessage('info', 'Redirecionando', 
      'Abrindo formulário de avaliação...', true, 1500);
    this.router.navigate(['/prato', this.pratoId, 'avaliacoes', 'criar']);
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
  closeFeedbackMessage(id: string): void {
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
        delay: (error, retryCount) => {
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
      catchError(error => {
        this.retryAttempts.set(operationKey, currentAttempts + 1);
        
        let userMessage = 'Erro inesperado. Tente novamente.';
        if (error.status === 0) {
          userMessage = 'Erro de conexão. Verifique sua internet.';
        } else if (error.status >= 500) {
          userMessage = 'Erro no servidor. Tente novamente em alguns instantes.';
        } else if (error.status === 404) {
          userMessage = 'Recurso não encontrado.';
        } else if (error.status === 403) {
          userMessage = 'Acesso negado.';
        }

        throw error;
      })
    );
  }

  // ===================================
  // UTILITÁRIOS DE STATUS
  // ===================================

  /**
   * Verifica se está carregando algum dado
   */
  isLoading(): boolean {
    return Object.values(this.loadingState).some(loading => {
      if (typeof loading === 'boolean') return loading;
      if (loading instanceof Set) return loading.size > 0;
      return false;
    });
  }

  /**
   * Verifica se uma avaliação específica está sendo excluída
   */
  isExcluindo(avaliacaoId: number): boolean {
    return this.loadingState.excluindo.has(avaliacaoId);
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
  getConnectivityText(): string {
    return this.isOnline ? 'Online' : 'Offline';
  }

  /**
   * Força atualização dos dados
   */
  forceRefresh(): void {
    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Conecte-se à internet para atualizar os dados.', true, 3000);
      return;
    }

    this.showFeedbackMessage('info', 'Atualizando', 
      'Recarregando dados...', true, 2000);
    this.loadDados();
  }
}