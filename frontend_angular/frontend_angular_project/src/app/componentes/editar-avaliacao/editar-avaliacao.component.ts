import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, AbstractControl,
  ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { RestauranteService } from '../../services/restaurante.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { restauranteModel } from '../../model/restaurante.model';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { ToastrService } from 'ngx-toastr'; // Se estiver usando
import { AvaliacaoTagModel } from '../../model/tag.model';

@Component({
  selector: 'app-editar-avaliacao',
  templateUrl: './editar-avaliacao.component.html',
  styleUrl: './editar-avaliacao.component.css',
})
export class EditarAvaliacaoComponent implements OnInit {
  formulario!: FormGroup;
  restaurante!: restauranteModel;
  avaliacao!: AvaliacaoModel;
  isSubmitting: boolean = false;
  sentimentoOriginal: string | null | undefined = null;
  defaultAvatar = 'assets/images/default-restaurant.png';
  imagensSelecionadas: File[] = [];
  imagensPreview: string[] = [];
  uploadingImages: boolean = false;
  avaliacoesTags: AvaliacaoTagModel[] = [];
  tagsOriginais: AvaliacaoTagModel[] = [];

  constructor(
    private jwthelper: JwtHelperService,
    private avSvc: AvaliacaoService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private restSvc: RestauranteService,
    private toastr?: ToastrService
  ) {}

  id_cliente = this.route.snapshot.paramMap.get('id_cliente');
  ngOnInit(): void {
    const idAvalStr = this.route.snapshot.paramMap.get('id_avaliacao');
    if (!idAvalStr) {
      alert('ID da avaliação não encontrado.');
      this.router.navigate(['/']);
      return;
    }
    
    const idAval = Number(idAvalStr);
    
    this.avSvc.buscarPorId(idAval).subscribe({
      next: (avaliacao) => {
        this.avaliacao = avaliacao;
        this.sentimentoOriginal = avaliacao.sentimento_auto;
        
        if (avaliacao.tags && avaliacao.tags.length > 0) {
          this.avaliacoesTags = [...avaliacao.tags];
          this.tagsOriginais = [...avaliacao.tags];
          console.log('📌 Tags carregadas da avaliação:', this.avaliacoesTags);
        }
        if (avaliacao.ID_Restaurante) {
          this.restSvc.buscarPorId(avaliacao.ID_Restaurante).subscribe((restaurante) => {
            this.restaurante = restaurante;
          });
        }

        this.formulario = this.fb.group({
          Nota: [avaliacao.Nota, [Validators.required]],
          Comentario: [avaliacao.Comentario, [Validators.required, Validators.minLength(10)]],
        });
      },
      error: (err) => {
        alert('Avaliação não encontrada ou você não tem permissão para editá-la.');
        console.error(err);
        this.router.navigate(['/']);
      }
    });
  }
  handleImageError(event: Event) {
    (event.target as HTMLImageElement).src = this.defaultAvatar;
  }
  get f(): { [key: string]: AbstractControl } {
    return this.formulario.controls;
  }
  /** clica na estrela */
  setRating(star: number): void {
    this.formulario.get('Nota')?.setValue(star);
  }
  onImageSelect(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files) {
      const files = Array.from(input.files);
      
      // Limitar a 5 imagens
      if (this.imagensSelecionadas.length + files.length > 5) {
        if (this.toastr) {
          this.toastr.warning('Máximo de 5 imagens por avaliação');
        } else {
          alert('Máximo de 5 imagens por avaliação');
        }
        return;
      }
      
      // Validar tamanho (máx 5MB por imagem)
      for (const file of files) {
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
  removerImagem(index: number): void {
    this.imagensSelecionadas.splice(index, 1);
    this.imagensPreview.splice(index, 1);
  }
  removerImagemExistente(imagemUrl: string): void {
    if (!confirm('Deseja realmente remover esta imagem?')) {
      return;
    }
    
    this.avSvc.removerImagemAvaliacao(this.avaliacao.ID!, imagemUrl).subscribe({
      next: () => {
        // Remover da lista local
        const index = this.avaliacao.imagens_urls?.indexOf(imagemUrl);
        if (index !== undefined && index > -1) {
          this.avaliacao.imagens_urls?.splice(index, 1);
        }
        
        if (this.toastr) {
          this.toastr.success('Imagem removida com sucesso');
        } else {
          alert('Imagem removida com sucesso');
        }
      },
      error: (err) => {
        console.error('Erro ao remover imagem:', err);
        if (this.toastr) {
          this.toastr.error('Erro ao remover imagem');
        } else {
          alert('Erro ao remover imagem');
        }
      }
    });
  }

  /** salva alterações */
  onSubmit(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    this.isSubmitting = true;
    
    console.log('📝 Iniciando atualização da avaliação');
    console.log('   Tags selecionadas:', this.avaliacoesTags);

    // ✅ CORREÇÃO: Criar FormData ao invés de objeto
    const formData = new FormData();
    
    formData.append('ID', this.avaliacao.ID!.toString());
    formData.append('ID_Cliente', this.avaliacao.ID_Cliente!.toString());
    formData.append('ID_Restaurante', this.avaliacao.ID_Restaurante!.toString());
    formData.append('Nota', this.f['Nota'].value.toString());
    formData.append('Comentario', this.f['Comentario'].value || '');
    
    // ✅ Adicionar tags ao FormData
    if (this.avaliacoesTags && this.avaliacoesTags.length > 0) {
      console.log('   Adicionando tags ao FormData:', this.avaliacoesTags);
      
      this.avaliacoesTags.forEach((tag) => {
        formData.append(`tag_${tag.ID_Tag}`, tag.nota.toString());
        console.log(`   tag_${tag.ID_Tag}=${tag.nota}`);
      });
    } else {
      console.warn('⚠️ Nenhuma tag selecionada');
    }
    
    // ✅ Adicionar novas imagens
    if (this.imagensSelecionadas.length > 0) {
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

    // ✅ Usar método apropriado do service
    this.avSvc.atualizarComImagensETagsFormData(formData).subscribe({
      next: (avaliacaoAtualizada) => {
        this.isSubmitting = false;
        
        let mensagem = 'Avaliação atualizada com sucesso!';
        
        if (this.imagensSelecionadas.length > 0) {
          mensagem += ` ${this.imagensSelecionadas.length} foto(s) adicionada(s).`;
        }
        
        if (this.avaliacoesTags.length > 0) {
          mensagem += ` ${this.avaliacoesTags.length} aspecto(s) avaliado(s).`;
        }
        
        if (avaliacaoAtualizada.sentimento_auto !== this.sentimentoOriginal) {
          mensagem += ` Tom ${this.traduzirSentimento(avaliacaoAtualizada.sentimento_auto)} detectado.`;
        }
        
        if (this.toastr) {
          this.toastr.success(mensagem);
        } else {
          alert(mensagem);
        }
        
        this.router.navigate(['/perfilCliente', this.avaliacao.ID_Cliente]);
      },
      error: (err) => {
        this.isSubmitting = false;
        console.error('❌ Erro ao atualizar avaliação:', err);
        console.error('   Status:', err.status);
        console.error('   Mensagem:', err.error);
        
        if (this.toastr) {
          const mensagemErro = err.error?.message || 'Erro ao atualizar a avaliação.';
          this.toastr.error(mensagemErro, 'Erro');
        } else {
          alert('Ocorreu um erro ao salvar as alterações.');
        }
      }
    });
  }
  onTagsChanged(tags: AvaliacaoTagModel[]): void {
    this.avaliacoesTags = tags;
    console.log('🏷️ Tags atualizadas no componente de edição:', this.avaliacoesTags);
  }
  cancel(): void {
    this.router.navigate(['/perfilCliente', this.avaliacao.ID_Cliente]);
  }
  traduzirSentimento(sentimento?: string): string {
    switch(sentimento?.toLowerCase()) {
      case 'positivo': return 'positivo';
      case 'negativo': return 'negativo';
      case 'neutro': 
      default: return 'neutro';
    }
  }


  editarAvaliacao() {
    this.avSvc
      .editar(this.formulario.value)
      .subscribe(() =>
        this.router.navigate([`/perfilCliente/${this.id_cliente}`])
      );
  }
  get() {
    const token = localStorage.getItem('token');
    const decodetoken = this.jwthelper.decodeToken(token!);
    if (decodetoken == null) {
      return null;
    }
    const email = decodetoken.sub;
    return email;
  }
  get_id() {
    return localStorage.getItem('id');
  }
  get_tipo() {
    return localStorage.getItem('tipo');
  }
  getLingua() {
    return this.translate.currentLang;
  }
  ValidaPlaceholderComentario(): string {
    return this.translate.currentLang === 'en'
      ? 'Tell us about your experience...'
      : 'Conte como foi sua experiência...';
  }
}
