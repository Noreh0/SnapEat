import { Component, OnInit, Output, EventEmitter, Input, ChangeDetectorRef } from '@angular/core';
import { TagModel, AvaliacaoTagModel } from '../../model/tag.model';
import { TagService } from '../../services/tag.service';

@Component({
  selector: 'app-tags-selector',
  templateUrl: './tags-selector.component.html',
  styleUrls: ['./tags-selector.component.css']
})
export class TagsSelectorComponent implements OnInit {
  @Input() restauranteId?: number;
  @Input() tagsExistentes?: AvaliacaoTagModel[];
  @Output() tagsChanged = new EventEmitter<AvaliacaoTagModel[]>();
  
  tags: TagModel[] = [];
  tagsAgrupadas: { [categoria: string]: TagModel[] } = {};
  avaliacoesTags: AvaliacaoTagModel[] = [];
  isLoading: boolean = false;

  categorias = [
    { key: 'atendimento', label: 'Atendimento', icon: 'fas fa-user-tie' },
    { key: 'comida', label: 'Comida', icon: 'fas fa-utensils' },
    { key: 'ambiente', label: 'Ambiente', icon: 'fas fa-store' },
    { key: 'preco', label: 'Preço', icon: 'fas fa-dollar-sign' },
    { key: 'localizacao', label: 'Localização', icon: 'fas fa-map-marker-alt' }
  ];

  constructor(
    private tagService: TagService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.carregarTags();
    if (this.tagsExistentes && this.tagsExistentes.length > 0) {
      console.log('📥 Carregando tags existentes:', this.tagsExistentes);
      this.avaliacoesTags = [...this.tagsExistentes];
    }
  }

  carregarTags(): void {
    this.isLoading = true;
    console.log('🔍 Iniciando carregamento de tags...');
    console.log('   URL completa:', `${this.tagService['BASE']}/`);
    
    this.tagService.listarTags().subscribe({
      next: (tags) => {
        console.log('📦 Resposta bruta do backend:', tags);
        console.log('   Tipo da resposta:', typeof tags);
        console.log('   É array?:', Array.isArray(tags));
        console.log('   Total de tags recebidas:', tags ? tags.length : 'N/A');
        
        // ✅ CORREÇÃO: Garantir que tags é um array
        const tagsArray = Array.isArray(tags) ? tags : [];
        
        this.tags = tagsArray.filter(t => {
          console.log(`   📋 Verificando tag: ${t.nome} (ativo: ${t.ativo})`);
          return t.ativo !== false; // Aceitar undefined ou true
        });
        
        console.log('✅ Tags ativas filtradas:', this.tags);
        console.log('   Total após filtro:', this.tags.length);
        
        if (this.tags.length === 0) {
          console.warn('⚠️ Nenhuma tag ativa encontrada!');
        }
        
        this.agruparTags();
        console.log('🗂️ Tags agrupadas por categoria:', this.tagsAgrupadas);
        
        this.isLoading = false;
        
        // ✅ IMPORTANTE: Forçar detecção de mudanças
        this.cdr.detectChanges();
        console.log('🔄 Change detection executada');
      },
      error: (err) => {
        console.error('❌ Erro ao carregar tags:', err);
        console.error('   Status:', err.status);
        console.error('   Mensagem:', err.message);
        console.error('   URL tentada:', err.url);
        
        this.isLoading = false;
        this.tags = []; // Limpar tags em caso de erro
        this.cdr.detectChanges();
      }
    });
  }

    agruparTags(): void {
    this.tagsAgrupadas = {};
    
    console.log('🔄 Agrupando tags...');
    
    this.tags.forEach(tag => {
      const categoriaRaw = (tag.categoria || 'outros').toString().toLowerCase().trim();
      
      // ✅ CORREÇÃO: Type assertion para garantir compatibilidade de tipos
      const categoria = categoriaRaw as 'atendimento' | 'comida' | 'ambiente' | 'preco' | 'localizacao' | 'outros';
      
      console.log(`   Tag: ${tag.nome}, Categoria (normalizada): ${categoria}`);
      
      if (!this.tagsAgrupadas[categoria]) {
        this.tagsAgrupadas[categoria] = [];
      }
      this.tagsAgrupadas[categoria].push(tag);
    });
    
    console.log('✅ Agrupamento concluído:', this.tagsAgrupadas);
  }

  onNotaChange(tag: TagModel, nota: number): void {
    console.log(`⭐ CLIQUE DETECTADO!`);
    console.log(`   Tag ID: ${tag.ID}`);
    console.log(`   Tag Nome: ${tag.nome}`);
    console.log(`   Nota clicada: ${nota}`);
    console.log(`   Estado atual antes da mudança:`, this.avaliacoesTags);
    
    const index = this.avaliacoesTags.findIndex(at => at.ID_Tag === tag.ID);
    console.log(`   Índice encontrado no array: ${index}`);
    
    if (index >= 0) {
      if (nota === 0) {
        console.log(`   🗑️ Removendo tag ${tag.ID}`);
        this.avaliacoesTags.splice(index, 1);
      } else {
        console.log(`   📝 Atualizando nota da tag ${tag.ID} de ${this.avaliacoesTags[index].nota} para ${nota}`);
        this.avaliacoesTags[index].nota = nota;
      }
    } else if (nota > 0) {
      console.log(`   ➕ Adicionando nova tag ${tag.ID} com nota ${nota}`);
      this.avaliacoesTags.push({
        ID_Tag: tag.ID!,
        nota: nota,
        tag: tag
      });
    }
    
    console.log(`   Estado atual após a mudança:`, this.avaliacoesTags);
    this.cdr.detectChanges();
    
    this.tagsChanged.emit(this.avaliacoesTags);
    console.log(`   ✅ Evento emitido!`);
  }
  getTagsFromCategoria(categoriaKey: string): TagModel[] {
    return this.tagsAgrupadas[categoriaKey] || [];
  }

  getNotaAtual(tagId: number): number {
    const avaliacao = this.avaliacoesTags.find(at => at.ID_Tag === tagId);
    return avaliacao ? avaliacao.nota : 0;
  }

  getCategoriaInfo(categoriaKey: string) {
    return this.categorias.find(c => c.key === categoriaKey) || 
           { key: categoriaKey, label: categoriaKey, icon: 'fas fa-tag' };
  }
}