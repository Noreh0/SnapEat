import { JwtHelperService } from '@auth0/angular-jwt';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';
import { ApiService } from '../../services/api.service';
import { ClienteService } from '../../services/cliente.service';
import { RestauranteService } from '../../services/restaurante.service';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { ThemeService, Theme } from '../../services/theme.service';

@Component({
  selector: 'app-cabecalho',
  templateUrl: './cabecalho.component.html',
  styleUrls: ['./cabecalho.component.css'],
  animations: [
    // Animação para o header aparecer suavemente
    trigger('headerAnimation', [
      state('in', style({ opacity: 1, transform: 'translateY(0)' })),
      transition('void => *', [
        style({ opacity: 0, transform: 'translateY(-100%)' }),
        animate('600ms cubic-bezier(0.4, 0, 0.2, 1)')
      ])
    ]),
    
    // Animação para links da navegação
    trigger('navItemAnimation', [
      state('idle', style({ transform: 'scale(1)', opacity: 1 })),
      state('hover', style({ transform: 'scale(1.05)', opacity: 0.9 })),
      transition('idle <=> hover', animate('200ms ease-in-out'))
    ]),
    
    // Animação para mudança de tema
    trigger('themeToggle', [
      transition('* => *', [
        animate('300ms ease-in-out', keyframes([
          style({ transform: 'rotate(0deg) scale(1)', offset: 0 }),
          style({ transform: 'rotate(180deg) scale(1.2)', offset: 0.5 }),
          style({ transform: 'rotate(360deg) scale(1)', offset: 1 })
        ]))
      ])
    ]),
    
    // Animação para mensagens de feedback
    trigger('messageSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ opacity: 0, transform: 'translateX(100%)' }))
      ])
    ])
  ]
})
export class CabecalhoComponent implements OnInit, OnDestroy {
  currentLanguage: string = 'en';
  currentTheme: Theme = 'light';
  nomeUsuario: string | null = null;
  logado = false;
  tipo: string | null = null;
  id: string | null = null;
  email: string | null = null;
  base: any;
  
  // Estados para animações e feedback
  headerState = 'in';
  isConnected = navigator.onLine;
  isLoading = false;
  loadingMessage = '';
  
  // Sistema de mensagens
  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' | 'warning' | 'info' = 'info';
  
  // Subscriptions para limpeza no OnDestroy
  private authSubscription: Subscription | null = null;
  private routerSubscription: Subscription | null = null;
  private themeSubscription: Subscription | null = null;
  private connectivitySubscription: Subscription | null = null;

  constructor(
    private jwthelper: JwtHelperService,
    private router: Router,
    private translate: TranslateService,
    private apiService: ApiService,
    private cliente: ClienteService,
    private restaurante: RestauranteService,
    private auth: AutenticacaoService,
    private http: HttpClient,
    private themeService: ThemeService
  ) {}

  perfilRestauranteLink(): string[] {
    const id = this.id || localStorage.getItem('id');
    return id ? ['/perfil-restaurante', id] : ['/login'];
  }

  logout() {
    this.setLoading(true, 'Fazendo logout...');
    
    this.auth.logout().subscribe({
      next: () => {
        this.setLoading(false);
        this.showFeedbackMessage('Logout realizado com sucesso!', 'success');
        this.atualizarEstadoAutenticacao(false);
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1000);
      },
      error: (error) => {
        this.setLoading(false);
        console.error('Erro durante logout:', error);
        this.showFeedbackMessage('Erro no logout, mas você foi desconectado localmente', 'warning');
        
        // Mesmo se houver erro, limpamos o estado local
        localStorage.clear();
        this.atualizarEstadoAutenticacao(false);
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
      }
    });  
  }

  ngOnInit(): void {
    // Configurar monitoramento de conectividade
    this.configurarEventosConectividade();
    
    // Monitorar mudanças no estado de autenticação
    this.authSubscription = this.auth.authState$.subscribe(logado => {
      this.atualizarEstadoAutenticacao(logado);
    });
    
    // Monitorar navegação para atualizar o estado quando necessário
    this.routerSubscription = this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe(() => {
        this.verificarEstadoAutenticacao();
      });
    
    // Monitorar mudanças no tema
    this.themeSubscription = this.themeService.theme$.subscribe(theme => {
      this.currentTheme = theme;
    });
    
    // Verificar o estado inicial
    this.verificarEstadoAutenticacao();
    
    // Definir idioma inicial a partir do serviço de tradução
    this.currentLanguage = this.translate.currentLang || this.translate.defaultLang;
    this.translate.onLangChange.subscribe(event => {
      this.currentLanguage = event.lang;
      this.showFeedbackMessage(`Idioma alterado para ${event.lang === 'pt' ? 'Português' : 'Inglês'}`, 'success');
    });

    // Inicializar escuta para preferências do sistema
    this.themeService.listenToSystemPreference();
  }
  
  ngOnDestroy(): void {
    // Limpar todas as inscrições para evitar memory leaks
    if (this.authSubscription) {
      this.authSubscription.unsubscribe();
    }
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
    if (this.themeSubscription) {
      this.themeSubscription.unsubscribe();
    }
    if (this.connectivitySubscription) {
      this.connectivitySubscription.unsubscribe();
    }
  }
  
  private verificarEstadoAutenticacao(): void {
    const logado = this.auth.isAuthenticated();
    this.atualizarEstadoAutenticacao(logado);
  }
  
  private atualizarEstadoAutenticacao(logado: boolean): void {
    this.logado = logado;
    
    if (logado) {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const payload = this.jwthelper.decodeToken(token);
          this.tipo = payload.tipo || localStorage.getItem('tipo');
          this.id = String(payload.sub) || localStorage.getItem('id');
          this.nomeUsuario = payload.nome || '';
          
          // Se não temos o nome no payload, buscar do backend
          if (!this.nomeUsuario) {
            this.buscarNomeUsuario();
          }
        } catch (error) {
          console.error('Erro ao decodificar token JWT:', error);
          this.limparEstadoAutenticacao();
        }
      } else {
        this.limparEstadoAutenticacao();
      }
    } else {
      this.limparEstadoAutenticacao();
    }
  }
  
  private limparEstadoAutenticacao(): void {
    this.nomeUsuario = null;
    this.tipo = null;
    this.id = null;
    this.logado = false;
  }

  goHome(): void {
    this.router.navigate(['/']);
  }
  
  buscarNomeUsuario(): void {
    // Usar a versão segura com feedback
    this.buscarNomeUsuarioSeguro();
  }
  
  setSessionData(): void {
    const token = localStorage.getItem('token');
    const decoded = token ? this.jwthelper.decodeToken(token) : null;
    const tipo = localStorage.getItem('tipo');
    this.tipo = (tipo === 'cliente' || tipo === 'restaurante') ? tipo : null;
    this.id = localStorage.getItem('id');
    this.logado = !!token && !!decoded;
  }

  changeLanguage(): void {
    this.setLoading(true, 'Alterando idioma...');
    
    try {
      this.currentLanguage = this.currentLanguage === 'en' ? 'pt' : 'en';
      this.translate.use(this.currentLanguage);
      
      setTimeout(() => {
        this.setLoading(false);
        this.showFeedbackMessage(
          `Idioma alterado para ${this.currentLanguage === 'pt' ? 'Português' : 'Inglês'}`, 
          'success'
        );
      }, 500);
      
    } catch (error) {
      this.setLoading(false);
      console.error('Erro ao alterar idioma:', error);
      this.showFeedbackMessage('Erro ao alterar idioma', 'error');
    }
  }

  /**
   * Alternar entre tema claro e escuro
   */
  toggleTheme(): void {
    try {
      this.themeService.toggleTheme();
      const themeText = this.currentTheme === 'dark' ? 'Tema Escuro' : 'Tema Claro';
      this.showFeedbackMessage(`${themeText} ativado`, 'success');
      console.log('🎨 Tema alterado para:', this.themeService.currentTheme);
    } catch (error) {
      console.error('Erro ao alterar tema:', error);
      this.showFeedbackMessage('Erro ao alterar tema', 'error');
    }
  }

  /**
   * Verificar se está no modo escuro
   */
  isDarkMode(): boolean {
    return this.themeService.isDarkMode();
  }

  // === MÉTODOS DE UTILIDADE E FEEDBACK ===
  
  /**
   * Controla o estado de loading
   */
  setLoading(loading: boolean, message: string = ''): void {
    this.isLoading = loading;
    this.loadingMessage = message;
  }

  /**
   * Exibe mensagem de feedback para o usuário
   */
  showFeedbackMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.messageText = message;
    this.messageType = type;
    this.showMessage = true;
    
    // Auto-fechar mensagens de sucesso e info após 3 segundos
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        this.closeFeedbackMessage();
      }, 3000);
    }
    // Mensagens de erro e warning ficam até serem fechadas manualmente
  }

  /**
   * Fecha a mensagem de feedback
   */
  closeFeedbackMessage(): void {
    this.showMessage = false;
    setTimeout(() => {
      this.messageText = '';
      this.messageType = 'info';
    }, 300);
  }

  /**
   * Configura eventos de conectividade
   */
  configurarEventosConectividade(): void {
    // Monitorar conectividade
    window.addEventListener('online', () => {
      this.isConnected = true;
      this.showFeedbackMessage('Conexão com internet restaurada', 'success');
    });

    window.addEventListener('offline', () => {
      this.isConnected = false;
      this.showFeedbackMessage('Sem conexão com a internet', 'warning');
    });
  }

  /**
   * Navegação segura com feedback
   */
  safeNavigate(route: string[]): void {
    if (!this.isConnected) {
      this.showFeedbackMessage('Sem conexão com a internet. Verifique sua conexão.', 'warning');
      return;
    }

    try {
      this.router.navigate(route);
    } catch (error) {
      console.error('Erro na navegação:', error);
      this.showFeedbackMessage('Erro ao navegar. Tente novamente.', 'error');
    }
  }

  /**
   * Buscar nome do usuário com tratamento de erro
   */
  buscarNomeUsuarioSeguro(): void {
    if (!this.id || !this.tipo) {
      this.showFeedbackMessage('Informações do usuário indisponíveis', 'warning');
      return;
    }

    this.setLoading(true, 'Carregando informações do usuário...');

    if (this.tipo === 'cliente') {
      this.cliente.buscarPorId(+this.id).subscribe({
        next: (res: any) => {
          this.setLoading(false);
          this.nomeUsuario = res?.Nome || 'Usuário';
        },
        error: (error: any) => {
          this.setLoading(false);
          console.error('Erro ao buscar cliente:', error);
          this.showFeedbackMessage('Não foi possível carregar informações do cliente', 'warning');
          this.nomeUsuario = 'Cliente';
        }
      });
    } else if (this.tipo === 'restaurante') {
      this.restaurante.buscarPorId(+this.id).subscribe({
        next: (res: any) => {
          this.setLoading(false);
          this.nomeUsuario = res?.Nome || 'Usuário';
        },
        error: (error: any) => {
          this.setLoading(false);
          console.error('Erro ao buscar restaurante:', error);
          this.showFeedbackMessage('Não foi possível carregar informações do restaurante', 'warning');
          this.nomeUsuario = 'Restaurante';
        }
      });
    }
  }

  /**
   * Função utilitária para retry de operações
   */
  retryOperation(operation: () => void, maxAttempts: number = 3): void {
    let attempts = 0;
    
    const executeOperation = () => {
      attempts++;
      try {
        operation();
      } catch (error) {
        if (attempts < maxAttempts) {
          console.log(`Tentativa ${attempts} falhou, tentando novamente...`);
          setTimeout(executeOperation, 1000 * attempts);
        } else {
          console.error('Operação falhou após múltiplas tentativas:', error);
          this.showFeedbackMessage('Operação falhou após múltiplas tentativas', 'error');
        }
      }
    };
    
    executeOperation();
  }
}