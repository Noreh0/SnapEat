// restaurante.component.ts
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RestauranteService } from '../../services/restaurante.service';
import { restauranteModel } from '../../model/restaurante.model';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { AvaliacaoService } from '../../services/avaliacao.service'; // Adjust the import path

@Component({
  selector: 'app-restaurante',
  templateUrl: './restaurante.component.html',
  styleUrls: ['./restaurante.component.css'],
})
export class RestauranteComponent implements OnInit {
  restaurante!: restauranteModel;
  avaliacoes: AvaliacaoModel[] = [];
  filteredAvaliacoes: AvaliacaoModel[] = [];
  selectedFilter = 0;

  mediaAval = 0;
  totalAval = 0;

  constructor(
    private svc: RestauranteService,
    private avaliacaoService: AvaliacaoService,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const id = +this.route.snapshot.paramMap.get('id')!;
    // carrega restaurante
    this.svc.buscarPorId(id).subscribe((r) => {
      this.restaurante = r;
      this.mediaAval = r.mediaAvaliacoes ?? 0;
      this.totalAval = r.totalAvaliacoes ?? 0;
    });
    // carrega avaliações e inicializa listas
    this.avaliacaoService.buscarPorRestaurante(id).subscribe((list: AvaliacaoModel[]) => {
      this.avaliacoes = list.sort(
        (a: AvaliacaoModel, b: AvaliacaoModel) =>
          new Date(b.data ?? '').getTime() - new Date(a.data ?? '').getTime()
      );
      this.filteredAvaliacoes = [...this.avaliacoes];
    });
  }

  /** chamado sempre que muda o dropdown de filtro */
  filterAvaliacoes() {
    if (this.selectedFilter > 0) {
      this.filteredAvaliacoes = this.avaliacoes.filter(
        (a) => a.Nota === this.selectedFilter
      );
    } else {
      this.filteredAvaliacoes = [...this.avaliacoes];
    }
  }

  /** renderiza ★ e ☆ conforme a nota */
  renderStars(n: number): string {
    const full = '★'.repeat(Math.round(n));
    const empty = '☆'.repeat(5 - Math.round(n));
    return full + empty;
  }
}
