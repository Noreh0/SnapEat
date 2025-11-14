import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { trigger, state, style, transition, animate, keyframes, query, stagger } from '@angular/animations';
import { AvaliacaoPratoService } from '../../services/avaliacao-prato.service';
import { AvaliacaoPrato } from '../../model/avaliacao-prato.model';
import { Prato } from '../../model/prato.model';
import { PratoService } from '../../services/prato.service';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { finalize, catchError, retry, timeout } from 'rxjs/operators';
import { of, timer } from 'rxjs';

interface ImagemPreview {
  url: string;
  tipo: 'existente' | 'nova';
  file?: File;
}

@Component({
  selector: 'app-avaliacao-prato-form',
  templateUrl: './avaliacao-prato-form.component.html',
  styleUrls: ['./avaliacao-prato-form.component.css'],
  animations: [
    // Animação para entrada da página
    trigger('pageAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(30px)' }),
        animate('600ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateY(0)' })
        )
      ])
    ]),

    // Animação para elementos do formulário
    trigger('formElementAnimation', [
      state('in', style({ opacity: 1, transform: 'translateX(0)' })),
      transition('void => *', [
        style({ opacity: 0, transform: 'translateX(-20px)' }),
        animate('400ms cubic-bezier(0.4, 0, 0.2, 1)')
      ])
    ]),

    // Animação para preview de imagens
    trigger('imagePreviewAnimation', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'scale(1)' })
        )
      ]),
      transition(':leave', [
        animate('250ms ease-in', 
          style({ opacity: 0, transform: 'scale(0.8)' })
        )
      ])
    ]),

    // Animação em lista para imagens
    trigger('imageListAnimation', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(20px)' }),
          stagger('100ms', [
            animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', 
              style({ opacity: 1, transform: 'translateY(0)' })
            )
          ])
        ], { optional: true })
      ])
    ]),

    // Animação para mensagens de feedback
    trigger('messageSlide', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('300ms cubic-bezier(0.4, 0, 0.2, 1)', 
          style({ opacity: 1, transform: 'translateX(0)' })
        )
      ]),
      transition(':leave', [
        animate('250ms ease-in', 
          style({ opacity: 0, transform: 'translateX(100%)' })
        )
      ])
    ]),

    // Animação para botões
    trigger('buttonAnimation', [
      state('idle', style({ transform: 'scale(1)' })),
      state('loading', style({ transform: 'scale(0.98)' })),
      transition('idle <=> loading', animate('200ms ease-in-out'))
    ])
  ]
})
export class AvaliacaoPratoFormComponent implements OnInit {
  formulario!: FormGroup;
  pratoId!: number;
  avalId?: number;
  prato?: Prato;
  isSubmitting = false;
  
  // Estados para animações e feedback
  isConnected = navigator.onLine;
  isLoading = false;
  loadingOperation = '';
  
  // Sistema de mensagens
  showMessage = false;
  messageText = '';
  messageType: 'success' | 'error' | 'warning' | 'info' = 'info';
  
  // Estados do formulário
  formTouched = false;
  validationErrors: { [key: string]: string } = {};
  
  // Gerenciamento de imagens
  imagensPreviews: ImagemPreview[] = [];
  imagensExistentes: string[] = []; // URLs das imagens já salvas
  novasImagens: File[] = []; // Novos arquivos a serem enviados
  imagensParaRemover: string[] = []; // URLs a serem deletadas
  maxImagens: number = 5;
  
  // Controle de tentativas
  maxRetries = 3;
  currentRetry = 0;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc: AvaliacaoPratoService,
    private auth: AutenticacaoService,
    private pratoService: PratoService
  ) {}

  ngOnInit() {
    this.configurarEventosConectividade();
    this.inicializarFormulario();
  }

  /**
   * Configura monitoramento de conectividade
   */
  private configurarEventosConectividade(): void {
    window.addEventListener('online', () => {
      this.isConnected = true;
      this.showFeedbackMessage('Conexão restaurada! Agora você pode enviar sua avaliação.', 'success');
    });

    window.addEventListener('offline', () => {
      this.isConnected = false;
      this.showFeedbackMessage('Sem conexão com a internet. Suas alterações serão salvas localmente.', 'warning');
    });
  }

  /**
   * Inicializa o formulário com tratamento de erro
   */
  private inicializarFormulario(): void {
    try {
      this.pratoId = +this.route.snapshot.paramMap.get('pratoId')!;
      this.avalId = this.route.snapshot.paramMap.get('id') 
        ? +this.route.snapshot.paramMap.get('id')! 
        : undefined;

      if (!this.pratoId || this.pratoId <= 0) {
        throw new Error('ID do prato inválido');
      }

      const usuario = this.auth.getDecodedToken();
      const idCliente = usuario?.sub || usuario?.ID || usuario?.id || usuario?.ID_Cliente;

      if (!idCliente) {
        this.showFeedbackMessage('Você precisa estar logado para avaliar um prato.', 'error');
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 2000);
        return;
      }

      this.criarFormulario(idCliente);
      this.carregarDadosPrato();
      
      if (this.avalId) {
        this.carregarAvaliacaoExistente();
      }

    } catch (error) {
      console.error('Erro ao inicializar formulário:', error);
      this.showFeedbackMessage('Erro ao carregar o formulário. Tente novamente.', 'error');
      setTimeout(() => {
        this.router.navigate(['/menu']);
      }, 3000);
    }
  }

  /**
   * Cria o formulário reativo
   */
  private criarFormulario(idCliente: any): void {
    this.formulario = this.fb.group({
      Nota: ['', [Validators.required, Validators.min(1), Validators.max(5)]],
      Comentario: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
      ID_Cliente: [idCliente, Validators.required],
      ID_Prato: [this.pratoId, Validators.required],
    });

    // Monitorar mudanças no formulário
    this.formulario.valueChanges.subscribe(() => {
      this.formTouched = true;
      this.validarFormularioEmTempoReal();
    });
  }

  /**
   * Carrega dados do prato com tratamento de erro
   */
  private carregarDadosPrato(): void {
    this.setLoading(true, 'Carregando informações do prato...');

    this.pratoService.getById(this.pratoId).pipe(
      timeout(10000), // Timeout de 10 segundos
      retry(2),
      catchError(error => {
        console.error('Erro ao carregar prato:', error);
        this.showFeedbackMessage('Não foi possível carregar as informações do prato.', 'error');
        return of(null);
      }),
      finalize(() => this.setLoading(false))
    ).subscribe((prato: Prato | null) => {
      if (prato) {
        this.prato = prato;
        this.showFeedbackMessage('Informações do prato carregadas com sucesso!', 'success');
      } else {
        setTimeout(() => {
          this.router.navigate(['/menu']);
        }, 3000);
      }
    });
  }

  /**
   * Carrega avaliação existente para edição
   */
  private carregarAvaliacaoExistente(): void {
    if (!this.avalId) return;

    this.setLoading(true, 'Carregando sua avaliação...');

    this.svc.getById(this.avalId).pipe(
      timeout(10000),
      retry(2),
      catchError(error => {
        console.error('Erro ao carregar avaliação:', error);
        this.showFeedbackMessage('Não foi possível carregar sua avaliação para edição.', 'error');
        return of(null);
      }),
      finalize(() => this.setLoading(false))
    ).subscribe(av => {
      if (av) {
        this.preencherFormularioParaEdicao(av);
        this.showFeedbackMessage('Avaliação carregada para edição!', 'success');
      }
    });
  }

  /**
   * Preenche formulário com dados da avaliação existente
   */
  private preencherFormularioParaEdicao(avaliacao: any): void {
    this.formulario.patchValue({
      Nota: avaliacao.Nota,
      Comentario: avaliacao.Comentario,
      ID_Cliente: avaliacao.ID_Cliente,
      ID_Prato: avaliacao.ID_Prato
    });
    
    // Carregar imagens existentes
    if (avaliacao.imagens_urls && avaliacao.imagens_urls.length > 0) {
      this.imagensExistentes = [...avaliacao.imagens_urls];
      this.imagensPreviews = avaliacao.imagens_urls.map((url: string) => ({
        url,
        tipo: 'existente' as const
      }));
    }
  }

  get f() {
    return this.formulario.controls;
  }

  /**
   * Total de imagens (existentes + novas)
   */
  get totalImagens(): number {
    return this.imagensPreviews.length;
  }

  /**
   * Verifica se pode adicionar mais imagens
   */
  get podeAdicionarImagens(): boolean {
    return this.totalImagens < this.maxImagens;
  }

  /**
   * Seleciona novas imagens com validação completa
   */
  onImageSelect(event: Event): void {
    try {
      const input = event.target as HTMLInputElement;
      if (!input.files || input.files.length === 0) return;

      const files = Array.from(input.files);
      const espacoDisponivel = this.maxImagens - this.totalImagens;
      
      if (files.length > espacoDisponivel) {
        this.showFeedbackMessage(
          `Você pode adicionar no máximo ${espacoDisponivel} imagem(ns). Selecionadas: ${files.length}`, 
          'warning'
        );
        return;
      }

      const imagensValidadas: File[] = [];
      const errosValidacao: string[] = [];

      // Validar cada arquivo
      for (const file of files) {
        const validationResult = this.validateImageFile(file);
        
        if (validationResult.isValid) {
          imagensValidadas.push(file);
        } else {
          errosValidacao.push(`${file.name}: ${validationResult.error}`);
        }
      }

      // Mostrar erros se houver
      if (errosValidacao.length > 0) {
        this.showFeedbackMessage(
          `Algumas imagens não puderam ser adicionadas: ${errosValidacao.join(', ')}`, 
          'warning'
        );
      }

      // Processar imagens válidas
      if (imagensValidadas.length > 0) {
        this.processValidImages(imagensValidadas);
      }

      // Limpar input
      input.value = '';

    } catch (error) {
      console.error('Erro ao processar imagens:', error);
      this.showFeedbackMessage('Erro ao processar as imagens selecionadas.', 'error');
    }
  }

  /**
   * Valida um arquivo de imagem
   */
  private validateImageFile(file: File): { isValid: boolean; error?: string } {
    // Validar tamanho (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      return { isValid: false, error: 'excede 5MB' };
    }
    
    // Validar tipo
    if (!file.type.startsWith('image/')) {
      return { isValid: false, error: 'não é uma imagem válida' };
    }

    // Validar tipos específicos permitidos
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      return { isValid: false, error: 'formato não suportado (use JPG, PNG, GIF ou WEBP)' };
    }

    return { isValid: true };
  }

  /**
   * Processa imagens válidas gerando previews
   */
  private processValidImages(files: File[]): void {
    files.forEach((file, index) => {
      this.novasImagens.push(file);
      
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.imagensPreviews.push({
          url: e.target.result,
          tipo: 'nova',
          file: file
        });
        
        // Mostrar sucesso quando processar a última imagem
        if (index === files.length - 1) {
          this.showFeedbackMessage(
            `${files.length} imagem(ns) adicionada(s) com sucesso!`, 
            'success'
          );
        }
      };
      
      reader.onerror = () => {
        console.error('Erro ao ler arquivo:', file.name);
        this.showFeedbackMessage(`Erro ao processar ${file.name}`, 'error');
      };
      
      reader.readAsDataURL(file);
    });
  }

  /**
   * Remove uma imagem (existente ou nova)
   */
  removerImagem(index: number): void {
    const imagem = this.imagensPreviews[index];
    
    console.log(`🗑️ Removendo imagem ${index}:`, {
      tipo: imagem.tipo,
      url: imagem.url.substring(0, 50) + '...'
    });
    
    if (imagem.tipo === 'existente') {
      // Marcar para remoção no backend
      this.imagensParaRemover.push(imagem.url);
      this.imagensExistentes = this.imagensExistentes.filter(url => url !== imagem.url);
      
      console.log('📌 Imagem marcada para remoção:', imagem.url);
    } else {
      // Remover da lista de novas imagens
      if (imagem.file) {
        this.novasImagens = this.novasImagens.filter(f => f !== imagem.file);
      }
      
      console.log('📌 Nova imagem removida da lista');
    }
    
    // Remover do preview
    this.imagensPreviews.splice(index, 1);
    
    console.log('📊 Estado atual:', {
      total_previews: this.imagensPreviews.length,
      novas: this.novasImagens.length,
      existentes: this.imagensExistentes.length,
      para_remover: this.imagensParaRemover.length
    });
  }

  /**
   * Cria FormData para criação
   */
  private criarFormData(): FormData {
    const formData = new FormData();
    const valores = this.formulario.value;
    
    formData.append('Comentario', valores.Comentario);
    formData.append('Nota', valores.Nota.toString());
    formData.append('ID_Cliente', valores.ID_Cliente.toString());
    formData.append('ID_Prato', valores.ID_Prato.toString());
    
    // Adicionar novas imagens
    this.novasImagens.forEach((imagem, index) => {
      formData.append('imagens', imagem);
      console.log(`📤 Adicionando imagem ${index + 1}:`, imagem.name);
    });
    
    console.log('📦 FormData criado com:', {
      comentario: valores.Comentario.substring(0, 30) + '...',
      nota: valores.Nota,
      total_imagens: this.novasImagens.length
    });
    
    return formData;
  }

  /**
   * Cria FormData para edição
   */
  private criarFormDataEdicao(): FormData {
    const formData = new FormData();
    const valores = this.formulario.value;
    
    formData.append('Comentario', valores.Comentario);
    formData.append('Nota', valores.Nota.toString());
    
    // Enviar URLs das imagens existentes que devem ser mantidas
    if (this.imagensExistentes.length > 0) {
      formData.append('imagens_existentes', JSON.stringify(this.imagensExistentes));
      console.log('📌 Mantendo imagens existentes:', this.imagensExistentes);
    }
    
    // Enviar URLs das imagens a serem removidas
    if (this.imagensParaRemover.length > 0) {
      formData.append('imagens_remover', JSON.stringify(this.imagensParaRemover));
      console.log('🗑️ Marcando para remoção:', this.imagensParaRemover);
    }
    
    // Adicionar novas imagens
    this.novasImagens.forEach((imagem, index) => {
      formData.append('imagens', imagem);
      console.log(`📤 Adicionando nova imagem ${index + 1}:`, imagem.name);
    });
    
    console.log('📦 FormData de edição criado:', {
      total_existentes: this.imagensExistentes.length,
      total_novas: this.novasImagens.length,
      total_remover: this.imagensParaRemover.length
    });
    
    return formData;
  }

  onSubmit() {
    try {
      // Validações pré-submit
      if (!this.validateConnectivity()) return;
      
      if (this.formulario.invalid) {
        this.formulario.markAllAsTouched();
        this.showFeedbackMessage('Por favor, corrija os erros no formulário antes de continuar.', 'warning');
        return;
      }

      if (this.isSubmitting) {
        this.showFeedbackMessage('Aguarde, sua avaliação está sendo processada...', 'info');
        return;
      }

      // Iniciar processo de submissão
      this.isSubmitting = true;
      this.currentRetry = 0;
      
      const operationText = this.avalId ? 'Atualizando sua avaliação' : 'Enviando sua avaliação';
      this.setLoading(true, operationText);
      
      if (this.avalId) {
        this.executeUpdate();
      } else {
        this.executeCreation();
      }

    } catch (error) {
      console.error('Erro no submit:', error);
      this.handleSubmitError('Erro inesperado ao processar sua avaliação.');
    }
  }

  /**
   * Executa criação de nova avaliação
   */
  private executeCreation(): void {
    const formData = this.criarFormData();
    
    this.svc.criarComImagens(formData).pipe(
      timeout(30000),
      retry(2),
      catchError(error => {
        console.error('Erro ao criar avaliação:', error);
        this.handleSubmitError('Não foi possível salvar sua avaliação.');
        this.saveLocalBackup();
        throw error;
      }),
      finalize(() => this.setLoading(false))
    ).subscribe({
      next: (response) => {
        console.log('✅ Avaliação criada:', response);
        this.handleSubmitSuccess('Avaliação enviada com sucesso!');
      },
      error: () => {
        // Erro já tratado no catchError
      }
    });
  }

  /**
   * Executa atualização de avaliação existente
   */
  private executeUpdate(): void {
    const formData = this.criarFormDataEdicao();
    
    this.svc.updateComImagens(this.avalId!, formData).pipe(
      timeout(30000),
      retry(2),
      catchError(error => {
        console.error('Erro ao atualizar avaliação:', error);
        this.handleSubmitError('Não foi possível salvar as alterações.');
        this.saveLocalBackup();
        throw error;
      }),
      finalize(() => this.setLoading(false))
    ).subscribe({
      next: (response) => {
        console.log('✅ Avaliação atualizada:', response);
        this.handleSubmitSuccess('Alterações salvas com sucesso!');
      },
      error: () => {
        // Erro já tratado no catchError
      }
    });
  }

  /**
   * Trata sucesso no submit
   */
  private handleSubmitSuccess(message: string): void {
    this.showFeedbackMessage(message, 'success');
    this.formTouched = false;
    
    // Limpar backup local se existir
    localStorage.removeItem(`avaliacao_backup_${this.pratoId}`);
    
    // Navegar após delay
    setTimeout(() => {
      this.isSubmitting = false;
      this.router.navigate(['/prato', this.pratoId, 'avaliacoes']);
    }, 1500);
  }

  /**
   * Trata erro no submit
   */
  private handleSubmitError(message: string): void {
    this.isSubmitting = false;
    this.showFeedbackMessage(message, 'error');
    
    // Oferecer retry se ainda tiver conexão
    if (this.isConnected && this.currentRetry < this.maxRetries) {
      setTimeout(() => {
        const retryMessage = `Tentativa ${this.currentRetry + 1} de ${this.maxRetries}. Tentar novamente?`;
        if (confirm(retryMessage)) {
          this.currentRetry++;
          this.onSubmit();
        }
      }, 2000);
    }
  }

  cancel() {
    if (this.formTouched && !this.isSubmitting) {
      if (confirm('Você tem alterações não salvas. Deseja realmente sair?')) {
        this.router.navigate(['/prato', this.pratoId, 'avaliacoes']);
      }
    } else if (!this.isSubmitting) {
      this.router.navigate(['/prato', this.pratoId, 'avaliacoes']);
    }
  }

  // === MÉTODOS DE UTILIDADE E FEEDBACK ===

  /**
   * Controla o estado de loading
   */
  setLoading(loading: boolean, operation: string = ''): void {
    this.isLoading = loading;
    this.loadingOperation = operation;
  }

  /**
   * Exibe mensagem de feedback para o usuário
   */
  showFeedbackMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    this.messageText = message;
    this.messageType = type;
    this.showMessage = true;
    
    // Auto-fechar mensagens de sucesso e info após 4 segundos
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        this.closeFeedbackMessage();
      }, 4000);
    }
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
   * Valida formulário em tempo real
   */
  private validarFormularioEmTempoReal(): void {
    this.validationErrors = {};
    
    const controls = this.formulario.controls;
    
    if (controls['Nota'].invalid && controls['Nota'].touched) {
      if (controls['Nota'].errors?.['required']) {
        this.validationErrors['Nota'] = 'Por favor, selecione uma nota de 1 a 5 estrelas.';
      }
    }
    
    if (controls['Comentario'].invalid && controls['Comentario'].touched) {
      if (controls['Comentario'].errors?.['required']) {
        this.validationErrors['Comentario'] = 'O comentário é obrigatório.';
      } else if (controls['Comentario'].errors?.['minlength']) {
        const currentLength = controls['Comentario'].value?.length || 0;
        this.validationErrors['Comentario'] = `Comentário deve ter pelo menos 10 caracteres. Atual: ${currentLength}`;
      } else if (controls['Comentario'].errors?.['maxlength']) {
        this.validationErrors['Comentario'] = 'Comentário muito longo (máximo 500 caracteres).';
      }
    }
  }

  /**
   * Obtém mensagem de erro personalizada
   */
  getErrorMessage(field: string): string {
    return this.validationErrors[field] || '';
  }

  /**
   * Verifica se um campo tem erro
   */
  hasError(field: string): boolean {
    const control = this.formulario.get(field);
    return !!(control && control.invalid && control.touched);
  }

  /**
   * Executa operação com retry automático
   */
  private executeWithRetry<T>(
    operation: () => any,
    operationName: string,
    maxRetries: number = 3
  ): void {
    let attempts = 0;
    
    const execute = () => {
      attempts++;
      
      operation().pipe(
        timeout(15000),
        catchError((error: any) => {
          console.error(`${operationName} - Tentativa ${attempts} falhou:`, error);
          
          if (attempts < maxRetries && this.isConnected) {
            this.showFeedbackMessage(
              `Tentativa ${attempts} falhou. Tentando novamente...`, 
              'warning'
            );
            
            // Retry com delay exponencial
            setTimeout(() => {
              execute();
            }, Math.pow(2, attempts) * 1000);
            
            return of(null);
          } else {
            this.showFeedbackMessage(
              `${operationName} falhou após ${attempts} tentativas. Verifique sua conexão.`, 
              'error'
            );
            this.isSubmitting = false;
            throw error;
          }
        })
      ).subscribe();
    };
    
    execute();
  }

  /**
   * Valida conectividade antes de operações críticas
   */
  private validateConnectivity(): boolean {
    if (!this.isConnected) {
      this.showFeedbackMessage(
        'Sem conexão com a internet. Conecte-se para enviar sua avaliação.', 
        'error'
      );
      return false;
    }
    return true;
  }

  /**
   * Salva dados localmente em caso de falha
   */
  private saveLocalBackup(): void {
    try {
      const backupData = {
        pratoId: this.pratoId,
        formData: this.formulario.value,
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem(`avaliacao_backup_${this.pratoId}`, JSON.stringify(backupData));
      this.showFeedbackMessage('Dados salvos localmente como backup.', 'info');
    } catch (error) {
      console.error('Erro ao salvar backup local:', error);
    }
  }

  /**
   * Recupera dados do backup local
   */
  private loadLocalBackup(): void {
    try {
      const backupKey = `avaliacao_backup_${this.pratoId}`;
      const backupData = localStorage.getItem(backupKey);
      
      if (backupData) {
        const parsed = JSON.parse(backupData);
        const backupAge = Date.now() - new Date(parsed.timestamp).getTime();
        
        // Usar backup apenas se for recente (menos de 1 hora)
        if (backupAge < 3600000) {
          this.formulario.patchValue(parsed.formData);
          this.showFeedbackMessage('Dados recuperados do backup local.', 'info');
        }
        
        // Limpar backup usado
        localStorage.removeItem(backupKey);
      }
    } catch (error) {
      console.error('Erro ao carregar backup local:', error);
    }
  }

  /**
   * Obtém estado atual do botão de submit
   */
  getSubmitButtonState(): 'idle' | 'loading' {
    return this.isSubmitting ? 'loading' : 'idle';
  }

  /**
   * Verifica se pode submeter o formulário
   */
  canSubmit(): boolean {
    return this.formulario.valid && 
           !this.isSubmitting && 
           this.isConnected;
  }

  /**
   * Obtém texto do botão de submit
   */
  getSubmitButtonText(): string {
    if (this.isSubmitting) {
      return this.avalId ? 'Salvando...' : 'Enviando...';
    }
    return this.avalId ? 'Salvar Alterações' : 'Enviar Avaliação';
  }

  /**
   * TrackBy function para otimizar lista de imagens
   */
  trackByIndex(index: number, item: any): number {
    return index;
  }

  /**
   * Evento de sucesso no carregamento de imagem
   */
  onImageLoad(): void {
    // Callback para quando imagem carrega com sucesso
  }

  /**
   * Evento de erro no carregamento de imagem
   */
  onImageError(index: number): void {
    console.error(`Erro ao carregar imagem no índice ${index}`);
    this.showFeedbackMessage('Erro ao carregar uma das imagens', 'warning');
  }
}