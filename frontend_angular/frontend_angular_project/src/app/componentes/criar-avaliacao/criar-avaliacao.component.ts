import { Component, OnInit } from '@angular/core';
import { RestauranteService } from '../../services/restaurante.service';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { restauranteModel } from '../../model/restaurante.model';
import { ToastrService } from 'ngx-toastr';
import { AvaliacaoTagModel } from '../../model/tag.model';
import { AvaliacaoCompletaModel } from '../../model/avaliacao-completa.model';


@Component({
  selector: 'app-criar-avaliacao',
  templateUrl: './criar-avaliacao.component.html',
  styleUrls: ['./criar-avaliacao.component.css'],
})
export class CadastroAvaliacaoComponent implements OnInit {
  formulario!: FormGroup;
  idRestaurante!: number;
  idCliente!: number;
  tipoUsuario!: string;
  NomeRestaurante: string = '';
  Categoria: string = '';
  Cidade: string = '';
  AvaliacaoMedia: number = 0;
  TotalAvaliacoes: number = 0;
  restaurante?: restauranteModel; // Adicione esta linha
  isLoading: boolean = false;
  loadingMessage: string = 'Preparando sua avaliação...';
  loadingSubMessage: string = 'Estamos cozinhando seus comentários!';
  loadingMessages: string[] = [
    'Temperando sua avaliação com carinho...',
    'Adicionando um toque especial ao seu comentário...',
    'Esquentando o forno para sua opinião...',
    'Finalizando os preparativos...',
    'Quase pronto para servir!'
  ];
  imagensSelecionadas: File[] = [];
  imagensPreview: string[] = [];
  maxImagens: number = 5;
  avaliacoesTags: AvaliacaoTagModel[] = [];


  constructor(
  private fb: FormBuilder,
  private route: ActivatedRoute,
  private router: Router,
  private jwtHelper: JwtHelperService,
  private serviceAvaliacao: AvaliacaoService,
  private restauranteService: RestauranteService, // <-- adicione aqui
  private translate: TranslateService,
  private toastr?: ToastrService
) {}

  ngOnInit(): void {
    // 1) Só clientes podem criar avaliação
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) {
      this.router.navigate(['/login']);
      return;
    }
    const payload = this.jwtHelper.decodeToken(token);
    this.tipoUsuario = payload.tipo;
    this.idCliente = Number(payload.sub);
    if (this.tipoUsuario !== 'cliente') {
      this.router.navigate(['/menu']);
      return;
    }

    // 2) Pega id_restaurante da rota e busca os dados
    this.idRestaurante = Number(this.route.snapshot.paramMap.get('id_restaurante'));
    if (!this.idRestaurante) {
      this.router.navigate(['/menu']);
      return;
    }

    this.restauranteService.buscarPorId(this.idRestaurante).subscribe((resto: restauranteModel) => {
      this.restaurante = resto;
      this.NomeRestaurante = resto.Nome;
      this.Categoria = resto.tipo_restaurante;
      this.Cidade = resto.Cidade;
    });

    // 3) Monta form
    this.inicializarFormulario();

    // 4) Busca avaliações existentes para mostrar a média
    this.serviceAvaliacao.buscarPorRestaurante(this.idRestaurante).subscribe((avals: any[]) => {
      this.TotalAvaliacoes = avals.length;
      if (avals.length > 0) {
        this.AvaliacaoMedia = avals.reduce((acc: number, av: any) => acc + av.Nota, 0) / avals.length;
      } else {
        this.AvaliacaoMedia = 0;
      }
    });
  }


  private inicializarFormulario() {
    this.formulario = this.fb.group({
      Nota: ['', [Validators.required]],
      Comentario: ['', [Validators.required, Validators.minLength(10)]],
    });
  }
  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      
      // Limitar a 5 imagens
      const espacoDisponivel = this.maxImagens - this.imagensSelecionadas.length;
      if (files.length > espacoDisponivel) {
        if (this.toastr) {
          this.toastr.warning(`Você pode adicionar no máximo ${espacoDisponivel} imagem(ns)`);
        } else {
          alert(`Você pode adicionar no máximo ${espacoDisponivel} imagem(ns)`);
        }
        return;
      }
      
      // Validar e adicionar imagens
      for (const file of files) {
        // Validar tamanho (máx 5MB)
        if (file.size > 5 * 1024 * 1024) {
          if (this.toastr) {
            this.toastr.error(`Imagem ${file.name} excede 5MB`);
          } else {
            alert(`Imagem ${file.name} excede 5MB`);
          }
          continue;
        }
        
        // Validar tipo
        if (!file.type.startsWith('image/')) {
          if (this.toastr) {
            this.toastr.error(`${file.name} não é uma imagem válida`);
          } else {
            alert(`${file.name} não é uma imagem válida`);
          }
          continue;
        }
        
        this.imagensSelecionadas.push(file);
        
        // Gerar preview
        const reader = new FileReader();
        reader.onload = (e: any) => {
          this.imagensPreview.push(e.target.result);
        };
        reader.readAsDataURL(file);
      }
    }
  }
  onTagsChanged(tags: AvaliacaoTagModel[]): void {
    this.avaliacoesTags = tags;
  }
  
  removerImagem(index: number): void {
    this.imagensSelecionadas.splice(index, 1);
    this.imagensPreview.splice(index, 1);
  }

  salvarAvaliacao(): void {
  if (this.formulario.invalid) {
    this.formulario.markAllAsTouched();
    return;
  }
  
  console.log('📝 Iniciando salvamento da avaliação');
  console.log('   Tags selecionadas:', this.avaliacoesTags);
  
  this.isLoading = true;
  this.iniciarRotacaoMensagens();

  // ✅ CORREÇÃO: Criar FormData ao invés de objeto
  const formData = new FormData();
  
  formData.append('ID_Cliente', this.idCliente.toString());
  formData.append('ID_Restaurante', this.idRestaurante.toString());
  formData.append('Nota', this.formulario.value.Nota.toString());
  formData.append('Comentario', this.formulario.value.Comentario || '');
  
  // ✅ TEMPORÁRIO: Permitir criação para testes (remover em produção)
  formData.append('force_create', 'true');
  
  // ✅ IMPORTANTE: Enviar tags como FormData
  if (this.avaliacoesTags && this.avaliacoesTags.length > 0) {
    console.log('   Adicionando tags ao FormData:', this.avaliacoesTags);
    
    // Enviar cada tag individualmente
    this.avaliacoesTags.forEach((tag, index) => {
      formData.append(`tag_${tag.ID_Tag}`, tag.nota.toString());
      console.log(`   tag_${tag.ID_Tag}=${tag.nota}`);
    });
  } else {
    console.warn('⚠️ Nenhuma tag selecionada');
  }
  
  // Adicionar imagens
  if (this.imagensSelecionadas && this.imagensSelecionadas.length > 0) {
    console.log(`   Adicionando ${this.imagensSelecionadas.length} imagem(ns)`);
    this.imagensSelecionadas.forEach((imagem) => {
      formData.append('imagens', imagem, imagem.name);
    });
  }

  // Debug: Listar conteúdo do FormData
  console.log('📦 Conteúdo do FormData:');
  for (const pair of (formData as any).entries()) {
    console.log(`   ${pair[0]}:`, pair[1]);
  }

  // ✅ CORREÇÃO: Usar endpoint correto com FormData
  this.serviceAvaliacao.criarComImagensETagsFormData(formData).subscribe({
    next: (response) => {
      console.log('✅ Resposta do servidor:', response);
      setTimeout(() => {
        this.isLoading = false;
        
        if (this.toastr) {
          const mensagem = this.construirMensagemSucesso(response);
          this.toastr.success(mensagem, 'Sucesso');
        }
        
        this.router.navigate(['/restaurante', this.idRestaurante]);
      }, 1500);
    },
    error: (err: any) => {
      this.isLoading = false;
      console.error('❌ Erro ao criar avaliação:', err);
      console.error('   Status:', err.status);
      console.error('   Mensagem:', err.error);
      
      if (this.toastr) {
        if (err.status === 409 && err.error?.tipo_erro === 'duplicate_review') {
          // Tratamento específico para avaliação duplicada
          const avaliacaoExistente = err.error.avaliacao_existente;
          const mensagem = `Você já avaliou este restaurante em ${new Date(avaliacaoExistente.data).toLocaleDateString('pt-BR')} com nota ${avaliacaoExistente.nota}. Para modificar sua avaliação, vá até "Minhas Avaliações" no seu perfil.`;
          this.toastr.warning(mensagem, 'Avaliação Já Existe');
        } else {
          const mensagemErro = err.error?.message || 'Não foi possível salvar sua avaliação. Por favor, tente novamente.';
          this.toastr.error(mensagemErro, 'Erro');
        }
      }
    }
  });
}
  iniciarRotacaoMensagens(): void {
    let index = 0;
    
    // Atualizar a mensagem a cada 2 segundos
    const interval = setInterval(() => {
      if (!this.isLoading) {
        clearInterval(interval);
        return;
      }
      
      this.loadingMessage = this.loadingMessages[index];
      index = (index + 1) % this.loadingMessages.length;
      
      // Atualizar a submensagem com base no progresso
      if (index <= 1) {
        this.loadingSubMessage = 'Estamos cozinhando seus comentários!';
      } else if (index <= 3) {
        this.loadingSubMessage = 'Quase pronto para servir!';
      } else {
        this.loadingSubMessage = 'Finalizando os preparativos...';
      }
      
    }, 2000);
  }

  // Placeholders multilíngue
  getLingua(): string {
    return this.translate.currentLang;
  }
  
  ValidaPlaceholderComentario(): string {
    return this.getLingua() === 'en'
      ? 'Share details of your own experience at this place...'
      : 'Compartilhe os detalhes da sua experiência neste lugar...';
  }
  private construirMensagemSucesso(response: any): string {
    let mensagem = 'Sua avaliação foi publicada com sucesso!';
    
    if (response.tem_imagens) {
      mensagem += ` ${response.total_imagens} foto(s) adicionada(s).`;
    }
    
    if (response.tags_avaliadas) {
      mensagem += ` ${response.tags_avaliadas} aspecto(s) avaliado(s).`;
    }
    
    return mensagem;
  }

}