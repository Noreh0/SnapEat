import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChartDataset, ChartOptions, ChartType } from 'chart.js';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { RestauranteService } from '../../services/restaurante.service';
@Component({
  selector: 'app-grafico',
  templateUrl: './grafico.component.html',
  styleUrl: './grafico.component.css',
})
export class GraficoComponent implements OnInit {
  public barChartData: ChartDataset<'bar'>[] = [
    { data: [65, 59, 80], label: 'Série A' }
  ];
  public barChartLabels: string[] = [
    'Nota 1',
    'Nota 2',
    'Nota 3',
    'Nota 4',
    'Nota 5',
  ];

  public barChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Eixo X',
        }
      },
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Eixo Y',
        }
      }
    }
  };
  

  public barChartLegend = true;
  public barChartType: ChartType = 'bar';
  avaliacao: AvaliacaoModel[] = [];
  @Input() Nome!: string;
  constructor(
    private route: ActivatedRoute,
    private restauranteService: RestauranteService,
    private avaliacaoService: AvaliacaoService
  ) {}
  id = this.route.snapshot.paramMap.get('id_restaurante');
  nota1 = 0;
  nota2 = 0;
  nota3 = 0;
  nota4 = 0;
  nota5 = 0;

  ngOnInit(): void {
    this.restauranteService
      .buscarPorId(parseInt(this.id!))
      .subscribe((restaurantes) => {
        for (let restaurante of restaurantes) {
          this.Nome = restaurante.Nome;
          this.avaliacaoService
            .listarPorIdRestaurante(restaurante.ID!)
            .subscribe((avaliacoes) => {
              console.log(avaliacoes);
              for (let avaliacao of avaliacoes) {
                console.log('Dentro do for');
                switch (avaliacao.Nota!) {
                  case 1:
                    this.nota1 += 1;
                    break;
                  case 2:
                    this.nota2 += 1;
                    break;
                  case 3:
                    this.nota3 += 1;
                    break;
                  case 4:
                    this.nota4 += 1;
                    break;
                  case 5:
                    this.nota5 += 1;
                    break;
                }
              }
              this.gerarGrafico(
                this.nota1,
                this.nota2,
                this.nota3,
                this.nota4,
                this.nota5
              );
            });
        }
      });
  }

  gerarGrafico(
    nota1: number,
    nota2: number,
    nota3: number,
    nota4: number,
    nota5: number
  ): void {
    const notas_atualizadas = [nota1, nota2, nota3, nota4, nota5];
    this.barChartData = [
      {
        data: notas_atualizadas,
        label: 'Quantidades',
        backgroundColor: 'blue',
      },
    ];
  }
}
