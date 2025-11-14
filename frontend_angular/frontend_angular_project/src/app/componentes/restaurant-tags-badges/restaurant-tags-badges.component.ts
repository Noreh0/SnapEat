import { Component, Input, OnChanges } from '@angular/core';
import { TagConquistada } from '../../model/restaurante.model';

@Component({
  selector: 'app-restaurant-tags-badges',
  templateUrl: './restaurant-tags-badges.component.html',
  styleUrls: ['./restaurant-tags-badges.component.css']
})
export class RestaurantTagsBadgesComponent implements OnChanges {
  @Input() tags: TagConquistada[] = [];
  @Input() maxTags: number = 3; // Mostrar no máximo 3 badges
  
  get tagsExibidas(): TagConquistada[] {
    // Ordenar por ranking e pegar as melhores (incluir tags sem ranking também)
    return this.tags
      .filter(tag => tag.posicao_ranking <= 3 || !tag.posicao_ranking) // Top 3 + sem ranking
      .sort((a, b) => {
        // Tags com ranking vêm primeiro, depois sem ranking
        if (a.posicao_ranking && !b.posicao_ranking) return -1;
        if (!a.posicao_ranking && b.posicao_ranking) return 1;
        if (a.posicao_ranking && b.posicao_ranking) return a.posicao_ranking - b.posicao_ranking;
        return a.nome.localeCompare(b.nome);
      })
      .slice(0, this.maxTags);
  }
  
  get tagsRestantes(): number {
    return Math.max(0, this.tags.length - this.maxTags);
  }
  
  getIconeTag(tag: TagConquistada): string {
    // Mapeamento de ícones por categoria
    const iconesPorCategoria: { [key: string]: string } = {
      'atendimento': '👔',
      'comida': '🍽️',
      'ambiente': '🏪',
      'preco': '💰',
      'localizacao': '📍'
    };
    
    return tag.icone || iconesPorCategoria[tag.categoria.toLowerCase()] || '⭐';
  }
  
  getNivelExcelencia(tag: TagConquistada): string {
    if (tag.posicao_ranking === 1) return 'Ouro';
    if (tag.posicao_ranking === 2) return 'Prata';
    if (tag.posicao_ranking === 3) return 'Bronze';
    return '';
  }
  
  getClasseNivel(tag: TagConquistada): string {
    if (tag.posicao_ranking === 1) return 'nivel-ouro';
    if (tag.posicao_ranking === 2) return 'nivel-prata';
    if (tag.posicao_ranking === 3) return 'nivel-bronze';
    return 'nivel-padrao'; // Para tags sem ranking
  }

  /**
   * Função para debug - verificar se as tags estão chegando corretamente
   */
  ngOnChanges(): void {
    console.log('🏷️ RestaurantTagsBadges - Tags recebidas:', this.tags);
    console.log('   Total de tags:', this.tags.length);
    console.log('   Tags exibidas:', this.tagsExibidas.length);
    
    if (this.tags.length === 0) {
      console.warn('⚠️ Nenhuma tag foi recebida para exibição');
    }
  }
}