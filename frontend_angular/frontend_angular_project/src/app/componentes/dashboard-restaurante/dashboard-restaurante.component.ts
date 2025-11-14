import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RestauranteService } from '../../services/restaurante.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { restauranteModel } from '../../model/restaurante.model';
import { ToastrService } from 'ngx-toastr';
import { TranslateService } from '@ngx-translate/core';
import { trigger, transition, style, animate, keyframes, query, stagger } from '@angular/animations';
import { Subscription, fromEvent, merge, of, timer } from 'rxjs';
import { debounceTime, distinctUntilChanged, retry, catchError, finalize, switchMap, tap } from 'rxjs/operators';

// Interfaces para tipagem aprimorada
interface FeedbackMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  autoClose?: boolean;
  timeout?: number;
}

interface LoadingState {
  dashboard: boolean;
  metricas: boolean;
  avaliacoes: boolean;
  processamento: boolean;
  relatorio: boolean;
}


@Component({
  selector: 'app-dashboard-restaurante',
  templateUrl: './dashboard-restaurante.component.html',
  styleUrls: [
    './dashboard-restaurante.component.css',
    './dashboard-restaurante-animations.css'
  ],
  animations: [
    // Animação principal da página
    trigger('pageAnimation', [
      transition(':enter', [
        query('.dashboard-header', [
          style({ opacity: 0, transform: 'translateY(-30px)' }),
          animate('600ms cubic-bezier(0.35, 0, 0.25, 1)', 
            style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true }),
        query('.metrics-section', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          animate('700ms 200ms cubic-bezier(0.35, 0, 0.25, 1)', 
            style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true }),
        query('.charts-section', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          animate('800ms 400ms cubic-bezier(0.35, 0, 0.25, 1)', 
            style({ opacity: 1, transform: 'translateY(0)' }))
        ], { optional: true })
      ])
    ]),

    // Animação para cards de métricas
    trigger('cardAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8) translateY(20px)' }),
        animate('500ms cubic-bezier(0.35, 0, 0.25, 1)', 
          style({ opacity: 1, transform: 'scale(1) translateY(0)' }))
      ])
    ]),

    // Animação para listas de avaliações
    trigger('listAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateX(-20px)' }),
          stagger(100, [
            animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', 
              style({ opacity: 1, transform: 'translateX(0)' }))
          ])
        ], { optional: true })
      ])
    ]),

    // Animação para sistema de feedback
    trigger('feedbackAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(300px) scale(0.8)' }),
        animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', 
          style({ opacity: 1, transform: 'translateX(0) scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', 
          style({ opacity: 0, transform: 'translateX(300px) scale(0.8)' }))
      ])
    ]),

    // Animação para estados vazios
    trigger('emptyStateAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('600ms cubic-bezier(0.35, 0, 0.25, 1)', 
          style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),

    // Animação para botões
    trigger('buttonAnimation', [
      transition('* => loading', [
        style({ transform: 'scale(1)' }),
        animate('200ms ease-in', style({ transform: 'scale(0.95)' })),
        animate('200ms ease-out', style({ transform: 'scale(1)' }))
      ])
    ]),

    // Animação para modal
    trigger('modalAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('400ms cubic-bezier(0.35, 0, 0.25, 1)', 
          style({ opacity: 1, transform: 'scale(1)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', 
          style({ opacity: 0, transform: 'scale(0.9)' }))
      ])
    ])
  ]
})
export class DashboardRestauranteComponent implements OnInit, OnDestroy {
  public restaurante!: restauranteModel;
  public mediaAval = 0;
  public totalAval = 0;
  public avaliacoes: Array<{
    clienteNome: string;
    Nota: number;
    Comentario: string;
    data_avaliacao: string;
    sentimento_auto?: string;
  }> = [];
  
  public sentimentStats: any = {};
  public hasEnoughReviews: boolean = false;
  public processandoAnalise: boolean = false;

  // Sistema de feedback avançado
  public feedbackMessages: FeedbackMessage[] = [];
  private feedbackIdCounter = 0;

  // Estados de loading detalhados
  public loadingState: LoadingState = {
    dashboard: false,
    metricas: false,
    avaliacoes: false,
    processamento: false,
    relatorio: false
  };

  // Sistema de conectividade e retry
  public isOnline = navigator.onLine;
  private subscriptions = new Subscription();
  private retryAttempts = new Map<string, number>();
  private maxRetryAttempts = 3;
  // Controle de filtros e busca
  public filtroTexto = '';
  public filtroEstrela = 0;
  public filtroDataInicio: string = '';
  public filtroDataFim: string = '';
  public filtroPeriodo: string = '30';

  public avaliacoesFiltradas: typeof this.avaliacoes = [];
  public avaliacoesPorMes: { [key: string]: any } = {};
  public graficoAtivo: 'evolucao' | 'mensal' | 'pratos' = 'evolucao';
  public graficoExpandido: 'evolucao' | 'mensal' | 'pratos' | null = null;
  
  public graficos = [
    { id: 'evolucao' as const, titulo: 'Evolução das Avaliações', icone: 'fas fa-chart-line' },
    { id: 'mensal' as const, titulo: 'Análise Mensal Comparativa', icone: 'fas fa-chart-bar' },
    { id: 'pratos' as const, titulo: 'Desempenho dos Pratos', icone: 'fas fa-utensils' }
  ];
  public hoje: string = new Date().toISOString().slice(0,10);
  public isOwner = false;

  constructor(
    private svc: RestauranteService,
    private avalSvc: AvaliacaoService,
    private route: ActivatedRoute,
    private auth: AutenticacaoService,
    private router: Router,
    private toastr: ToastrService,
    public translate: TranslateService
  ) {  }

  ngOnInit(): void {
    this.setupConnectivityMonitoring();
    this.loadingState.dashboard = true;
    
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) {
      this.showFeedbackMessage('error', 'Erro de Navegação', 
        'ID do restaurante não informado!', true, 3000);
      this.router.navigate(['/menu']);
      return;
    }
    
    const id = +idStr;
    if (!id || id <= 0) {
      this.showFeedbackMessage('error', 'Erro de Validação', 
        'ID do restaurante inválido!', true, 3000);
      this.router.navigate(['/menu']);
      return;
    }
    
    // Verificar estado salvo no localStorage
    const savedState = localStorage.getItem(`rest_${id}_processed`);
    if (savedState === 'true') {
      this.hasEnoughReviews = true;
    }
    
    this.aplicarFiltroPeriodo();
    this.carregarDashboardCompleto(id);
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    this.feedbackMessages.forEach(msg => {
      if (msg.autoClose) {
        clearTimeout(Number(msg.id));
      }
    });
  }

  @HostListener('window:online', [])
  onOnline(): void {
    this.isOnline = true;
    this.showFeedbackMessage('success', 'Conectividade Restaurada', 
      'Conexão com a internet foi restabelecida.', true, 3000);
  }

  @HostListener('window:offline', [])
  onOffline(): void {
    this.isOnline = false;
    this.showFeedbackMessage('warning', 'Sem Conexão', 
      'Você está offline. Algumas funcionalidades podem não estar disponíveis.', false);
  }

  /**
   * Configurar monitoramento de conectividade
   */
  private setupConnectivityMonitoring(): void {
    const online$ = fromEvent(window, 'online');
    const offline$ = fromEvent(window, 'offline');
    
    this.subscriptions.add(
      merge(online$, offline$).subscribe(() => {
        this.isOnline = navigator.onLine;
      })
    );
  }

  /**
   * Carrega o dashboard completo com tratamento de erro
   */
  private carregarDashboardCompleto(id: number): void {
    this.loadingState.dashboard = true;
    
    this.executeWithRetry('dashboard', () => 
      this.svc.buscarPorId(id)
    ).subscribe({
      next: (r: any) => {
        console.log('📊 Dados do restaurante recebidos:', r);
        this.restaurante = r;
        this.mediaAval = Number(r.mediaAvaliacoes) || 0;
        this.totalAval = Number(r.totalAvaliacoes) || 0;
        
        console.log('📈 Métricas iniciais:', {
          mediaAval: this.mediaAval,
          totalAval: this.totalAval
        });
        
        this.isOwner = this.auth.usuarioAtual?.tipo === 'restaurante' &&
                    Number(this.auth.usuarioAtual?.sub) === r.ID;
        
        this.showFeedbackMessage('success', 'Dashboard Carregado', 
          `Dados de ${r.Nome} carregados com sucesso!`, true, 2000);
                    
        // Carregar dados relacionados
        this.carregarMetricasSentimento(id);
        this.carregarAvaliacoes(id);
        this.verificarAvaliacoesProcessadas(id);
      },
      error: (err: any) => {
        this.showFeedbackMessage('error', 'Erro no Carregamento', 
          'Não foi possível carregar os dados do restaurante. Verifique sua conexão.', true, 5000);
        console.error('Erro ao carregar dashboard:', err);
      },
      complete: () => {
        this.loadingState.dashboard = false;
      }
    });
  }
  // Em dashboard-restaurante.component.ts, adicionar um método para obter a média
  public getMediaRestaurante(): string {
    const media = this.mediaAval || 0;
    return `${media.toFixed(1)}/5.0 estrelas`;
  }

  public getTituloGraficoExpandidoCompleto(): { titulo: string; icone: string } {
    if (!this.graficoExpandido) return { titulo: '', icone: '' };
    const grafico = this.graficos.find(g => g.id === this.graficoExpandido);
    return { 
      titulo: grafico?.titulo || '', 
      icone: grafico?.icone || '' 
    };
  }

  public aplicarFiltroPeriodo(): void {
    const hoje = new Date();
    
    if (this.filtroPeriodo === 'custom') {
      // Não fazer nada, usuário vai preencher as datas manualmente
      return;
    }
    
    const diasAtras = parseInt(this.filtroPeriodo);
    const dataInicio = new Date(hoje);
    dataInicio.setDate(dataInicio.getDate() - diasAtras);
    
    this.filtroDataInicio = dataInicio.toISOString().split('T')[0];
    this.filtroDataFim = hoje.toISOString().split('T')[0];
    
    this.filtrarAvaliacoes();
  }
  public getPeriodoTexto(): string {
    if (!this.filtroDataInicio || !this.filtroDataFim) {
      return 'dos últimos 30 dias';
    }
    
    if (this.filtroPeriodo !== 'custom') {
      const dias = parseInt(this.filtroPeriodo);
      if (dias === 30) return 'dos últimos 30 dias';
      if (dias === 60) return 'dos últimos 60 dias';
      if (dias === 90) return 'dos últimos 90 dias';
      if (dias === 180) return 'dos últimos 6 meses';
      if (dias === 365) return 'do último ano';
    }
    
    const inicio = this.formatarData(this.filtroDataInicio);
    const fim = this.formatarData(this.filtroDataFim);
    return `de ${inicio} até ${fim}`;
  }
  verificarAvaliacoesProcessadas(restauranteId: number): void {
    this.avalSvc.getMetricasSentimento(restauranteId).subscribe({
      next: (metricas) => {
        const totalSentimentos = (metricas.positivo || 0) + (metricas.neutro || 0) + (metricas.negativo || 0);
        this.hasEnoughReviews = totalSentimentos >= 3;
        
        this.sentimentStats = metricas;
        
        localStorage.setItem(`rest_${restauranteId}_processed`, this.hasEnoughReviews ? 'true' : 'false');
      },
      error: (err: any) => {
        console.error('Erro ao verificar avaliações processadas:', err);
        const savedState = localStorage.getItem(`rest_${restauranteId}_processed`);
        this.hasEnoughReviews = savedState === 'true' || this.avaliacoes.length >= 3;
      }
    });
  }
    
  carregarMetricasSentimento(restauranteId: number): void {
    this.loadingState.metricas = true;
    
    this.executeWithRetry('metricas-sentimento', () => 
      this.avalSvc.getMetricasSentimento(restauranteId)
    ).subscribe({
      next: (metricas: any) => {
        this.sentimentStats = metricas;
        this.showFeedbackMessage('success', 'Métricas Carregadas', 
          'Análise de sentimento atualizada!', true, 1500);
      },
      error: (err: any) => {
        console.error('Erro ao carregar métricas de sentimento:', err);
        this.sentimentStats = { 
          positivo: 0, 
          neutro: 0, 
          negativo: 0,
          percentuais: { positivo: 0, neutro: 0, negativo: 0 }
        };
        this.showFeedbackMessage('error', 'Erro nas Métricas', 
          'Não foi possível carregar as métricas de sentimento.', true, 4000);
      },
      complete: () => {
        this.loadingState.metricas = false;
      }
    });
  }

  private parseDate(s: string): Date {
    if (!s) return new Date(NaN);
    const iso = s.includes('T') ? s : s.replace(' ', 'T');
    return new Date(iso);
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
  
  public filtrarPorNota(nota: number): void {
    this.filtroEstrela = nota || 0;
    this.filtrarAvaliacoes();
  }

  public formatarData(data: string): string {
    const d = this.parseDate(data);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  }

  public filtrarAvaliacoes(): void {
    // Debug: remover em produção
    console.log('🔍 Iniciando filtro com:', {
      filtroTexto: this.filtroTexto,
      filtroEstrela: this.filtroEstrela,
      filtroDataInicio: this.filtroDataInicio,
      filtroDataFim: this.filtroDataFim,
      totalAvaliacoes: this.avaliacoes.length
    });

    const inicio: Date | null = this.filtroDataInicio
      ? new Date(`${this.filtroDataInicio}T00:00:00`)
      : null;

    const fim: Date | null = this.filtroDataFim
      ? this.endOfDay(new Date(`${this.filtroDataFim}T00:00:00`))
      : null;

    this.avaliacoesFiltradas = this.avaliacoes.filter((a) => {
      const dataAval = this.parseDate(a.data_avaliacao);
      
      // Texto
      const textoOk =
        !this.filtroTexto ||
        a.Comentario?.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        a.clienteNome?.toLowerCase().includes(this.filtroTexto.toLowerCase());

      // Nota (0 significa "todas as notas")
      const notaAvaliacao = Number(a.Nota);
      const filtroNota = Number(this.filtroEstrela);
      const estrelaOk =
        filtroNota === 0 || Math.round(notaAvaliacao) === filtroNota;

      // Datas (aplica só se selecionadas)
      const dataOk =
        (!inicio || (dataAval && dataAval >= inicio)) &&
        (!fim || (dataAval && dataAval <= fim));

      const passa = textoOk && estrelaOk && dataOk;
      
      if (!passa && this.filtroEstrela > 0) {
        console.log('❌ Avaliação rejeitada:', {
          nota: a.Nota,
          notaNumber: notaAvaliacao,
          notaArredondada: Math.round(notaAvaliacao),
          filtroEstrela: this.filtroEstrela,
          filtroNumber: filtroNota,
          estrelaOk,
          textoOk,
          dataOk,
          cliente: a.clienteNome
        });
      }

      return passa;
    });

    console.log('✅ Filtro concluído:', {
      avaliacoesEncontradas: this.avaliacoesFiltradas.length,
      filtroEstrela: this.filtroEstrela
    });
  }

  public limparFiltros(): void {
    this.filtroTexto = '';
    this.filtroEstrela = 0;
    this.filtroPeriodo = '30';
    this.aplicarFiltroPeriodo(); // Volta para padrão de 30 dias
    this.filtrarAvaliacoes(); // Aplicar filtros limpos
    
    this.showFeedbackMessage('info', 'Filtros Limpos', 
      'Todos os filtros foram removidos.', true, 1500);
  }

  public downloadInsights(): void {
    if (!this.restaurante) {
      this.showFeedbackMessage('error', 'Erro', 
        'Restaurante não disponível para gerar relatório.', true, 3000);
      return;
    }

    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Conecte-se à internet para gerar o relatório.', true, 3000);
      return;
    }
    
    this.loadingState.relatorio = true;
    
    this.showFeedbackMessage('info', 'Gerando Relatório', 
      'Preparando arquivo de insights...', true, 2000);
    
    this.executeWithRetry('relatorio', () => 
      this.avalSvc.downloadInsightsReport(this.restaurante.ID)
    ).subscribe({
      next: (blob: Blob) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `insights-${this.restaurante.Nome}-${new Date().toISOString().split('T')[0]}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
        
        this.showFeedbackMessage('success', 'Download Concluído', 
          'Relatório de insights baixado com sucesso!', true, 4000);
      },
      error: (err: any) => {
        console.error('Erro ao baixar relatório', err);
        this.showFeedbackMessage('error', 'Erro no Download', 
          'Não foi possível gerar o relatório. Verifique sua conexão e tente novamente.', true, 5000);
      },
      complete: () => {
        this.loadingState.relatorio = false;
      }
    });
  }

  public processarAvaliacoes(): void {
    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Conecte-se à internet para processar as avaliações.', true, 3000);
      return;
    }

    this.loadingState.processamento = true;
    this.processandoAnalise = true;
    
    this.showFeedbackMessage('info', 'Processando Avaliações', 
      'Analisando sentimentos das avaliações...', true, 2000);
    
    this.executeWithRetry('processamento', () => 
      this.avalSvc.processarAvaliacoes(this.restaurante.ID)
    ).subscribe({
      next: (res: any) => {
        if (res.processadas > 0) {
          this.showFeedbackMessage('success', 'Processamento Concluído', 
            `${res.processadas} avaliações processadas com sucesso!`, true, 4000);
        } else {
          this.showFeedbackMessage('info', 'Já Processado', 
            'Todas as avaliações já foram processadas anteriormente.', true, 3000);
        }
        
        // Recarregar os dados para mostrar a análise atualizada
        this.carregarMetricasSentimento(this.restaurante.ID);
        this.verificarAvaliacoesProcessadas(this.restaurante.ID);
        this.carregarAvaliacoes(this.restaurante.ID);
      },
      error: (err: any) => {
        this.showFeedbackMessage('error', 'Erro no Processamento', 
          'Não foi possível processar as avaliações. Tente novamente mais tarde.', true, 5000);
        console.error('Erro ao processar avaliações:', err);
      },
      complete: () => {
        this.loadingState.processamento = false;
        this.processandoAnalise = false;
      }
    });
  }

  private carregarAvaliacoes(id: number): void {
    this.loadingState.avaliacoes = true;
    
    this.executeWithRetry('avaliacoes', () => 
      this.avalSvc.buscarPorRestaurante(id)
    ).subscribe({
      next: (list: any[]) => {
        console.log('Avaliações recarregadas:', list);

        this.avaliacoes = list.map((a: any) => ({
          clienteNome: a.Nome_Cliente || a.clienteNome || a.nome_cliente || 'Usuário Anônimo',
          Nota: Number(a.Nota), // Garantir que seja um número
          Comentario: a.Comentario,
          data_avaliacao: a.data_avaliacao,
          sentimento_auto: a.sentimento_auto
        }));

        console.log('📊 Avaliações carregadas:', {
          total: this.avaliacoes.length,
          notasDisponiveis: this.avaliacoes.map(a => ({ nota: a.Nota, cliente: a.clienteNome }))
        });

        // Recalcular métricas se necessário
        if (this.avaliacoes.length > 0) {
          const totalAvaliacoesCarregadas = this.avaliacoes.length;
          const somaNotas = this.avaliacoes.reduce((sum, a) => sum + a.Nota, 0);
          const mediaCalculada = somaNotas / totalAvaliacoesCarregadas;
          
          // Atualizar métricas se os dados iniciais estavam incorretos
          if (this.totalAval === 0 || this.mediaAval === 0) {
            this.totalAval = totalAvaliacoesCarregadas;
            this.mediaAval = mediaCalculada;
            console.log('🔄 Métricas recalculadas:', {
              totalAval: this.totalAval,
              mediaAval: this.mediaAval
            });
          }
        }

        // Processar avaliacoes por mês
        this.processarAvaliacoesPorMes();
        this.avaliacoesFiltradas = [...this.avaliacoes];
        this.filtrarAvaliacoes();

        this.showFeedbackMessage('success', 'Avaliações Carregadas', 
          `${this.avaliacoes.length} avaliações carregadas com sucesso!`, true, 2000);
      },
      error: (err: any) => {
        console.error('Erro ao recarregar avaliações:', err);
        this.showFeedbackMessage('error', 'Erro nas Avaliações', 
          'Não foi possível carregar as avaliações. Tente novamente.', true, 4000);
      },
      complete: () => {
        this.loadingState.avaliacoes = false;
      }
    });
  }
  
  private processarAvaliacoesPorMes(): void {
    const avaliacoesPorMes: { [key: string]: {
      total: number;
      soma: number;
      avaliacoes: any[];
      nome?: string;  // Adicionar como opcional
      media?: number; // Adicionar como opcional
    }} = {};
    // Inicializar os últimos 6 meses
    const hoje = new Date();
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesChave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      const nomeMes = `${meses[data.getMonth()]}/${String(data.getFullYear()).slice(2)}`;
      
      avaliacoesPorMes[mesChave] = {
        total: 0,
        soma: 0,
        avaliacoes: [],
        nome: nomeMes
      };
    }
    
    // Agrupar avaliações por mês
    for (const aval of this.avaliacoes) {
      if (aval.data_avaliacao) {
        const data = new Date(aval.data_avaliacao);
        const mesChave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        if (avaliacoesPorMes[mesChave]) {
          avaliacoesPorMes[mesChave].total += 1;
          avaliacoesPorMes[mesChave].soma += aval.Nota;
          avaliacoesPorMes[mesChave].avaliacoes.push(aval);
        }
      }
    }
    
    // Calcular médias
    Object.keys(avaliacoesPorMes).forEach(key => {
      const mes = avaliacoesPorMes[key];
      mes.media = mes.total > 0 ? mes.soma / mes.total : 0;
    });
    
    this.avaliacoesPorMes = avaliacoesPorMes;
  }
    
  public renderStars(n: number): string {
    const full = '★'.repeat(Math.round(n));
    const empty = '☆'.repeat(5 - Math.round(n));
    return full + empty;
  }

  public toggleFiltroEstrela(s: number): void {
    this.filtroEstrela = this.filtroEstrela === s ? 0 : s;
    this.filtrarAvaliacoes();
  }

  public getImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) {
      return 'assets/images/default-restaurant.png';
    }
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    return 'http://localhost:5000' + imageUrl;
  }
  
  // Novas métricas para o dashboard
  public getAvaliacoesMesAtual(): number {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    
    const total = this.avaliacoesPorMes[mesAtual]?.total || 0;
    console.log('Avaliações do mês atual:', total); // ✅ Debug
    return Number(total);
  }
  
  public getVariacaoMediaMensal(): string {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const mesAnterior = `${hoje.getFullYear()}-${String(hoje.getMonth()).padStart(2, '0')}`;
    
    const mediaAtual = this.avaliacoesPorMes[mesAtual]?.media || 0;
    const mediaAnterior = this.avaliacoesPorMes[mesAnterior]?.media || 0;
    
    if (mediaAnterior === 0) return '0';
    
    const variacao = ((mediaAtual - mediaAnterior) / mediaAnterior) * 100;
    return variacao.toFixed(1);
  }
  public selecionarGrafico(tipo: 'evolucao' | 'mensal' | 'pratos'): void {
    this.graficoAtivo = tipo;
  }

  public proximoGrafico(): void {
    const index = this.graficos.findIndex(g => g.id === this.graficoAtivo);
    const proximo = (index + 1) % this.graficos.length;
    this.graficoAtivo = this.graficos[proximo].id;
  }

  public graficoAnterior(): void {
    const index = this.graficos.findIndex(g => g.id === this.graficoAtivo);
    const anterior = (index - 1 + this.graficos.length) % this.graficos.length;
    this.graficoAtivo = this.graficos[anterior].id;
  }
  public expandirGrafico(tipo: 'evolucao' | 'mensal' | 'pratos'): void {
    this.graficoExpandido = tipo;
    document.body.style.overflow = 'hidden'; // Prevenir scroll do body
    
    this.showFeedbackMessage('info', 'Gráfico Expandido', 
      `Visualizando ${this.graficos.find(g => g.id === tipo)?.titulo} em tela cheia.`, true, 2000);
  }

  public fecharGraficoExpandido(): void {
    this.graficoExpandido = null;
    document.body.style.overflow = 'auto';
  }

  public getTituloGraficoAtivo(): string {
    return this.graficos.find(g => g.id === this.graficoAtivo)?.titulo || '';
  }

  public getTituloGraficoExpandido(): string {
    if (!this.graficoExpandido) return '';
    const grafico = this.graficos.find(g => g.id === this.graficoExpandido);
    return grafico?.titulo || '';
  }

  public getMediaRestauranteNumero(): number {
    // Garantir que retorna um número válido
    const media = this.mediaAval || 0;
    console.log('Média do restaurante:', media); // ✅ Debug
    return Number(media);
  }

  public getTotalAvaliacoes(): number {
    const total = this.totalAval || 0;
    console.log('Total de avaliações:', total); // ✅ Debug
    return Number(total);
  }
  /**
   * Calcula a média das avaliações do mês atual
   */
  public getMediaMesAtual(): number {
    const hoje = new Date();
    const mesAtual  = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    
    return this.avaliacoesPorMes[mesAtual]?.media || 0;
  }

  /**
   * Sistema de Feedback Avançado
   */
  public showFeedbackMessage(
    type: 'success' | 'error' | 'warning' | 'info',
    title: string,
    message: string,
    autoClose: boolean = true,
    timeout: number = 3000
  ): void {
    const id = `feedback_${++this.feedbackIdCounter}_${Date.now()}`;
    
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
      setTimeout(() => {
        this.closeFeedbackMessage(id);
      }, timeout);
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
  public clearAllFeedback(): void {
    this.feedbackMessages = [];
  }

  /**
   * Executa operação com retry automático
   */
  private executeWithRetry<T>(
    operation: string, 
    fn: () => any, 
    maxAttempts: number = this.maxRetryAttempts
  ): any {
    const currentAttempt = this.retryAttempts.get(operation) || 0;
    
    return fn().pipe(
      retry({
        count: maxAttempts - 1,
        delay: (error: any, retryCount: number) => {
          const delay = Math.pow(2, retryCount) * 1000; // Exponential backoff
          console.log(`Tentativa ${retryCount + 1} para ${operation} em ${delay}ms`);
          
          if (retryCount < maxAttempts - 1) {
            this.showFeedbackMessage('warning', 'Tentando Novamente', 
              `Tentativa ${retryCount + 1} de ${maxAttempts} para ${operation}...`, true, 2000);
          }
          
          return timer(delay);
        }
      }),
      catchError((error: any) => {
        this.retryAttempts.set(operation, currentAttempt + 1);
        
        if (!this.isOnline) {
          this.showFeedbackMessage('error', 'Sem Conexão', 
            'Verifique sua conexão com a internet e tente novamente.', false);
        } else {
          this.showFeedbackMessage('error', 'Erro na Operação', 
            `Falha em ${operation} após ${maxAttempts} tentativas.`, true, 5000);
        }
        
        throw error;
      }),
      finalize(() => {
        // Resetar contador após sucesso
        this.retryAttempts.delete(operation);
      })
    );
  }

  /**
   * Obtém texto do status de conectividade
   */
  public getConnectivityText(): string {
    return this.isOnline ? 'Online' : 'Offline';
  }

  /**
   * Verifica se alguma operação está carregando
   */
  public isAnyLoading(): boolean {
    return Object.values(this.loadingState).some(loading => loading);
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

    const restauranteId = this.restaurante?.ID;
    if (!restauranteId) {
      this.showFeedbackMessage('error', 'Erro', 'Restaurante não encontrado.', true, 3000);
      return;
    }

    this.showFeedbackMessage('info', 'Atualizando Dashboard', 
      'Recarregando todos os dados...', true, 2000);

    // Recarregar todos os dados
    this.carregarDashboardCompleto(restauranteId);
  }

  /**
   * TrackBy function para otimizar renderização
   */
  public trackByAvaliacaoId(index: number, avaliacao: any): string {
    return `${avaliacao.clienteNome}_${avaliacao.data_avaliacao}_${index}`;
  }

  public trackByFeedbackId(index: number, feedback: FeedbackMessage): string {
    return feedback.id;
  }

  public trackByKey(index: number, item: any): string {
    return item.key || index;
  }

  /**
   * Métodos para funcionalidades do template
   */
  public atualizarGraficos(): void {
    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Conecte-se à internet para atualizar os gráficos.', true, 3000);
      return;
    }

    const restauranteId = this.restaurante?.ID;
    if (!restauranteId) {
      this.showFeedbackMessage('error', 'Erro', 'Restaurante não encontrado.', true, 3000);
      return;
    }

    this.loadingState.dashboard = true;
    this.showFeedbackMessage('info', 'Atualizando Gráficos', 
      'Recarregando dados dos gráficos...', true, 2000);

    // Simular atualização dos gráficos
    timer(2000).subscribe(() => {
      this.loadingState.dashboard = false;
      this.showFeedbackMessage('success', 'Gráficos Atualizados', 
        'Todos os gráficos foram atualizados com sucesso!', true, 3000);
    });
  }

  public temFiltrosAtivos(): boolean {
    return !!(this.filtroTexto || 
              this.filtroEstrela > 0 || 
              this.filtroPeriodo !== '30' || 
              this.filtroDataInicio || 
              this.filtroDataFim);
  }

  public getButtonTooltip(action: string): string {
    if (!this.isOnline) {
      return 'Sem conexão com a internet';
    }

    switch (action) {
      case 'clear':
        return this.temFiltrosAtivos() ? 'Limpar todos os filtros' : 'Nenhum filtro ativo';
      case 'refresh':
        return 'Atualizar dados das avaliações';
      default:
        return '';
    }
  }

  public atualizarAvaliacoes(): void {
    if (!this.isOnline) {
      this.showFeedbackMessage('warning', 'Sem Conexão', 
        'Conecte-se à internet para atualizar as avaliações.', true, 3000);
      return;
    }

    const restauranteId = this.restaurante?.ID;
    if (!restauranteId) {
      this.showFeedbackMessage('error', 'Erro', 'Restaurante não encontrado.', true, 3000);
      return;
    }

    this.showFeedbackMessage('info', 'Atualizando Avaliações', 
      'Recarregando dados das avaliações...', true, 2000);

    // Recarregar avaliações
    this.carregarAvaliacoes(restauranteId);
  }
}