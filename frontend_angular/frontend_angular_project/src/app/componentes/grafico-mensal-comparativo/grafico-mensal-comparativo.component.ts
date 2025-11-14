// grafico-mensal-comparativo.component.ts
import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { ChartData, ChartType } from 'chart.js';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { RestauranteService } from '../../services/restaurante.service';

@Component({
  selector: 'app-grafico-mensal-comparativo',
  templateUrl: './grafico-mensal-comparativo.component.html',
  styleUrls: ['./grafico-mensal-comparativo.component.css']
})
export class GraficoMensalComparativoComponent implements OnInit {
  @Input() restauranteId!: number;

  filtroForm: FormGroup;
  restaurantesDisponiveis: any[] = [];
  
  // Controles de expansão
  metricasExpandidas: boolean = false;
  restaurantesExpandidos: boolean = false;
  
  chartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };

  chartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          usePointStyle: true,
          padding: 15
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        backgroundColor: 'white',
        titleColor: '#3D352E',
        bodyColor: '#3D352E',
        borderColor: '#EAE3DB',
        borderWidth: 1,
        padding: 12,
        displayColors: true,
        callbacks: {
          label: (context: any) => {
            return `${context.dataset.label}: ${context.parsed.y.toFixed(2)}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 5,
        title: {
          display: true,
          text: 'Média de Notas'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Mês'
        }
      }
    }
  };

  chartType: ChartType = 'line';

  metricas = [
    { value: 'restaurante', label: 'Avaliações Restaurante', checked: true },
    { value: 'pratos', label: 'Avaliações Pratos', checked: true },
    { value: 'ponderada', label: 'Média Ponderada', checked: true }
  ];

  cores = [
    '#d97746', '#1A5653', '#6a9c89', '#8E3200', '#4C9447'
  ];

  constructor(
    private fb: FormBuilder,
    private avaliacaoService: AvaliacaoService,
    private restauranteService: RestauranteService
  ) {
    this.filtroForm = this.fb.group({
      dataInicio: [new Date(new Date().setMonth(new Date().getMonth() - 6))],
      dataFim: [new Date()],
      restaurantesComparacao: this.fb.array([])
    });
  }

  ngOnInit(): void {
    // Expandir métricas por padrão para melhor UX
    this.metricasExpandidas = true;
    
    this.carregarRestaurantesDisponiveis();
    this.carregarDados();
  }

  get restaurantesComparacao(): FormArray {
    return this.filtroForm.get('restaurantesComparacao') as FormArray;
  }

  // Getter para contar métricas selecionadas
  get metricasSelecionadasCount(): number {
    return this.metricas.filter(m => m.checked).length;
  }

  // Getter para verificar se há métricas selecionadas
  get hasMetricasSelecionadas(): boolean {
    return this.metricasSelecionadasCount > 0;
  }

  // Getter para verificar se há restaurantes selecionados
  get hasRestaurantesSelecionados(): boolean {
    return this.restaurantesComparacao.length > 0;
  }

  // Getter para contar restaurantes selecionados
  get restaurantesSelecionadosCount(): number {
    return this.restaurantesComparacao.length;
  }

  // Getter para verificar se há restaurantes disponíveis
  get hasRestaurantesDisponiveis(): boolean {
    return this.restaurantesDisponiveis.length > 0;
  }

  // Getter para verificar se há dados no gráfico
  get hasChartData(): boolean {
    return !!(this.chartData.datasets && this.chartData.datasets.length > 0);
  }

  carregarRestaurantesDisponiveis(): void {
    this.restauranteService.listar().subscribe({
      next: (restaurantes) => {
        this.restaurantesDisponiveis = restaurantes.filter(
          (r: any) => r.ID !== this.restauranteId
        );
      },
      error: (erro) => console.error('Erro ao carregar restaurantes:', erro)
    });
  }

  toggleRestauranteComparacao(restauranteId: number): void {
    const index = this.restaurantesComparacao.value.indexOf(restauranteId);
    
    if (index > -1) {
      this.restaurantesComparacao.removeAt(index);
    } else {
      this.restaurantesComparacao.push(this.fb.control(restauranteId));
    }
  }

  isRestauranteSelecionado(restauranteId: number): boolean {
    return this.restaurantesComparacao.value.includes(restauranteId);
  }

  carregarDados(): void {
    const valores = this.filtroForm.value;
    const idsComparacao = valores.restaurantesComparacao.join(',');
    
    this.avaliacaoService.buscarAnaliseMensalComparativa(
      this.restauranteId,
      valores.dataInicio.toISOString(),
      valores.dataFim.toISOString(),
      idsComparacao
    ).subscribe({
      next: (dados) => this.processarDados(dados),
      error: (erro) => console.error('Erro ao carregar dados:', erro)
    });
  }

  processarDados(dados: any): void {
    if (!dados.restaurantes || dados.restaurantes.length === 0) {
      return;
    }

    // Extrair todos os meses únicos
    const mesesSet = new Set<string>();
    dados.restaurantes.forEach((rest: any) => {
      rest.dados_mensais.forEach((mes: any) => {
        mesesSet.add(mes.mes);
      });
    });
    const meses = Array.from(mesesSet).sort();

    const datasets: any[] = [];

    // Criar datasets para cada restaurante e métrica
    dados.restaurantes.forEach((rest: any, restIndex: number) => {
      const corBase = this.cores[restIndex % this.cores.length];
      const prefixo = rest.eh_principal ? '★ ' : '';

      // Dataset para média de restaurante
      if (this.metricas.find(m => m.value === 'restaurante')?.checked) {
        datasets.push({
          label: `${prefixo}${rest.restaurante_nome} - Restaurante`,
          data: meses.map(mes => {
            const dado = rest.dados_mensais.find((d: any) => d.mes === mes);
            return dado ? dado.media_restaurante : null;
          }),
          borderColor: corBase,
          backgroundColor: `${corBase}33`,
          borderWidth: rest.eh_principal ? 3 : 2,
          borderDash: rest.eh_principal ? [] : [5, 5],
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: corBase,
          pointBorderWidth: 2,
          pointRadius: rest.eh_principal ? 5 : 4
        });
      }

      // Dataset para média de pratos
      if (this.metricas.find(m => m.value === 'pratos')?.checked) {
        datasets.push({
          label: `${prefixo}${rest.restaurante_nome} - Pratos`,
          data: meses.map(mes => {
            const dado = rest.dados_mensais.find((d: any) => d.mes === mes);
            return dado ? dado.media_pratos : null;
          }),
          borderColor: this.ajustarCor(corBase, -30),
          backgroundColor: `${this.ajustarCor(corBase, -30)}33`,
          borderWidth: rest.eh_principal ? 3 : 2,
          borderDash: rest.eh_principal ? [] : [5, 5],
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: this.ajustarCor(corBase, -30),
          pointBorderWidth: 2,
          pointRadius: rest.eh_principal ? 5 : 4
        });
      }

      // Dataset para média ponderada
      if (this.metricas.find(m => m.value === 'ponderada')?.checked) {
        datasets.push({
          label: `${prefixo}${rest.restaurante_nome} - Média Ponderada`,
          data: meses.map(mes => {
            const dado = rest.dados_mensais.find((d: any) => d.mes === mes);
            return dado ? dado.media_ponderada : null;
          }),
          borderColor: this.ajustarCor(corBase, 30),
          backgroundColor: `${this.ajustarCor(corBase, 30)}33`,
          borderWidth: rest.eh_principal ? 4 : 2,
          borderDash: [],
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: this.ajustarCor(corBase, 30),
          pointBorderWidth: 2,
          pointRadius: rest.eh_principal ? 6 : 4
        });
      }
    });

    this.chartData = {
      labels: meses,
      datasets
    };
  }

  ajustarCor(cor: string, ajuste: number): string {
    // Função auxiliar para ajustar tonalidade da cor
    const hex = cor.replace('#', '');
    const r = Math.max(0, Math.min(255, parseInt(hex.substr(0, 2), 16) + ajuste));
    const g = Math.max(0, Math.min(255, parseInt(hex.substr(2, 2), 16) + ajuste));
    const b = Math.max(0, Math.min(255, parseInt(hex.substr(4, 2), 16) + ajuste));
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  toggleMetrica(metricaValue: string): void {
    const metrica = this.metricas.find(m => m.value === metricaValue);
    if (metrica) {
      metrica.checked = !metrica.checked;
      this.carregarDados();
    }
  }

  aplicarFiltros(): void {
    this.carregarDados();
  }

  // Métodos para controlar as listas expansíveis
  toggleMetricasExpandidas(): void {
    this.metricasExpandidas = !this.metricasExpandidas;
  }

  toggleRestaurantesExpandidos(): void {
    this.restaurantesExpandidos = !this.restaurantesExpandidos;
  }
}