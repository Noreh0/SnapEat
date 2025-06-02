import { Component, OnInit } from '@angular/core';
import { ActivatedRoute }      from '@angular/router';
import { ChartDataset, ChartOptions, ChartType } from 'chart.js';

import { AvaliacaoModel }      from '../../model/avaliacao.model';
import { AvaliacaoService }    from '../../services/avaliacao.service';
import { RestauranteService }  from '../../services/restaurante.service';

@Component({
  selector: 'app-grafico',
  templateUrl: './grafico.component.html',
  styleUrls: ['./grafico.component.css'],
})
export class GraficoComponent implements OnInit {
  restauranteID!: number;
  Nome = '';

  // inicializa com zeros
  public barChartLabels: string[] = ['Nota 1','Nota 2','Nota 3','Nota 4','Nota 5'];
  public barChartData: ChartDataset<'bar'>[] = [
    { data: [0,0,0,0,0], label: 'Quantidade' }
  ];
  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    scales: {
      x: { beginAtZero: true, title: { display: true, text: 'Nota' } },
      y: { beginAtZero: true, title: { display: true, text: 'Quantidade' } },
    }
  };
  public barChartType: ChartType = 'bar';
  public barChartLegend = true;

  constructor(
    private route: ActivatedRoute,
    private restauranteService: RestauranteService,
    private avaliacaoService: AvaliacaoService
  ) {}

  ngOnInit(): void {
    // 1) Pega o ID do restaurante da rota
    const idStr = this.route.snapshot.paramMap.get('id_restaurante');
    this.restauranteID = idStr ? +idStr : 0;
    if (!this.restauranteID) { return; }

    // 2) Busca nome do restaurante
    this.restauranteService.buscarPorId(this.restauranteID).subscribe({
      next: r => {
        this.Nome = r.Nome;
        // 3) Só depois de ter o Nome, carrega as avaliações
        this.loadAvaliacoes();
      },
      error: err => console.error('Erro ao buscar restaurante:', err)
    });
  }

  private loadAvaliacoes(): void {
    this.avaliacaoService.buscarPorRestaurante(this.restauranteID)
      .subscribe({
        next: (lista: AvaliacaoModel[]) => this.processarAvaliacoes(lista),
        error: err => console.error('Erro ao buscar avaliações:', err)
      });
  }

  private processarAvaliacoes(avals: AvaliacaoModel[]): void {
    // contador para cada nota de 1 a 5
    const contagens = [0,0,0,0,0];
    for (const a of avals) {
      if (a.Nota && a.Nota >= 1 && a.Nota <= 5) {
        contagens[a.Nota - 1] += 1;
      }
    }
    this.atualizarGrafico(contagens);
  }

  private atualizarGrafico(contagens: number[]): void {
    this.barChartData = [
      { data: contagens, label: 'Quantidade' }
    ];
  }
}
