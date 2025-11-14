// grafico-evolucao.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

@Component({
  selector: 'app-grafico-evolucao',
  templateUrl: './grafico-evolucao.component.html',
  styleUrls: ['./grafico-evolucao.component.css']
})
export class GraficoEvolucaoComponent implements OnInit, OnDestroy {
  @Input() restauranteId!: number;

  private subscription: Subscription = new Subscription();

  // Formulário de controle
  filtroForm: FormGroup;

  // Dados do gráfico
  chartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };

  chartOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false, // Importante: permite que o gráfico se ajuste ao container
    aspectRatio: 2, // Define uma proporção adequada
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          padding: 10,
          boxWidth: 12,
          font: {
            size: 11
          }
        }
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          afterBody: (context) => {
            const index = context[0].dataIndex;
            return this.obterInfoExtra(index);
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
          text: 'Média de Notas',
          font: {
            size: 12
          }
        },
        ticks: {
          font: {
            size: 10
          }
        }
      },
      x: {
        title: {
          display: true,
          text: 'Período',
          font: {
            size: 12
          }
        },
        ticks: {
          font: {
            size: 10
          },
          maxRotation: 45,
          minRotation: 0
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    },
    layout: {
      padding: {
        top: 10,
        bottom: 10,
        left: 10,
        right: 10
      }
    }
  };

  chartType: ChartType = 'line';

  // Opções de configuração
  tiposComparacao = [
    { value: 'ambos', label: 'Comentários e Pratos' },
    { value: 'comentarios', label: 'Apenas Comentários' },
    { value: 'pratos', label: 'Apenas Pratos' }
  ];

  intervalos = [
    { value: 'dia', label: 'Diário' },
    { value: 'semana', label: 'Semanal' },
    { value: 'mes', label: 'Mensal' }
  ];

  // Dados adicionais para tooltips
  dadosAdicionais: any[] = [];

  constructor(
    private fb: FormBuilder,
    private avaliacaoService: AvaliacaoService
  ) {
    // Inicializar datas corretamente
    const hoje = new Date();
    const tressMesesAtras = new Date();
    tressMesesAtras.setMonth(hoje.getMonth() - 3);

    this.filtroForm = this.fb.group({
      dataInicio: [this.formatarDataParaInput(tressMesesAtras)],
      dataFim: [this.formatarDataParaInput(hoje)],
      tipoComparacao: ['ambos'],
      intervalo: ['dia']
    });
    
    // Adicionar listeners para mudanças no form com debounce
    this.subscription.add(
      this.filtroForm.valueChanges
        .pipe(
          debounceTime(300), // Aguarda 300ms após a última mudança
          distinctUntilChanged() // Só executa se os valores realmente mudaram
        )
        .subscribe(() => {
          console.log('📝 Form alterado, carregando dados...');
          this.carregarDados();
        })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  ngOnInit(): void {
    // Debug: verificar se o restauranteId foi passado
    if (!this.restauranteId) {
      console.error('❌ restauranteId não foi fornecido para o gráfico de evolução');
      return;
    }
    
    console.log('🚀 Inicializando gráfico de evolução para restaurante:', this.restauranteId);
    this.carregarDados();
  }

  private formatarDataParaInput(data: Date): string {
    // Formato YYYY-MM-DD para input type="date"
    return data.toISOString().split('T')[0];
  }

  private formatarDataParaAPI(dataString: string): string {
    // Converter string do input para ISO string para API
    return new Date(dataString + 'T00:00:00').toISOString();
  }

  carregarDados(): void {
    const valores = this.filtroForm.value;
    
    console.log('🔄 Carregando dados com filtros:', valores);
    
    // Verificar se as datas são válidas
    if (!valores.dataInicio || !valores.dataFim) {
      console.warn('⚠️ Datas não definidas, aguardando...');
      return;
    }
    
    try {
      const dataInicioFormatada = this.formatarDataParaAPI(valores.dataInicio);
      const dataFimFormatada = this.formatarDataParaAPI(valores.dataFim);
      
      console.log('📅 Datas formatadas:', {
        inicio: dataInicioFormatada,
        fim: dataFimFormatada,
        tipo: valores.tipoComparacao,
        intervalo: valores.intervalo
      });
      
      this.avaliacaoService.buscarEvolucaoAvaliacoes(
        this.restauranteId,
        dataInicioFormatada,
        dataFimFormatada,
        valores.tipoComparacao,
        valores.intervalo
      ).subscribe({
        next: (dados) => {
          console.log('📊 Dados recebidos:', dados);
          this.processarDados(dados);
        },
        error: (erro) => {
          console.error('❌ Erro ao carregar dados:', erro);
        }
      });
    } catch (error) {
      console.error('❌ Erro no formato das datas:', error);
    }
  }

  processarDados(dados: any): void {
    console.log('🔄 Processando dados do gráfico:', dados);
    
    if (!dados || !dados.series || dados.series.length === 0) {
      console.warn('⚠️ Nenhum dado encontrado para o gráfico');
      this.chartData = {
        labels: [],
        datasets: []
      };
      this.dadosAdicionais = [];
      return;
    }

    // Extrair labels (períodos) - usar da primeira série que tenha dados
    const primeiraSerieComDados = dados.series.find((s: any) => s.dados && s.dados.length > 0);
    if (!primeiraSerieComDados) {
      console.warn('⚠️ Nenhuma série com dados encontrada');
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    const labels = primeiraSerieComDados.dados.map((d: any) => d.periodo);
    
    // Criar datasets
    const datasets = dados.series
      .filter((serie: any) => serie.dados && serie.dados.length > 0)
      .map((serie: any) => {
        const cor = serie.tipo === 'comentarios' ? '#d97746' : '#1A5653';
        
        return {
          label: serie.nome,
          data: serie.dados.map((d: any) => d.media || 0),
          borderColor: cor,
          backgroundColor: `${cor}33`,
          borderWidth: 2,
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: cor,
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        };
      });

    console.log('📊 Dados processados:', { labels, datasets });

    this.chartData = {
      labels,
      datasets
    };

    // Armazenar dados adicionais para tooltips
    this.dadosAdicionais = primeiraSerieComDados.dados || [];
  }

  obterInfoExtra(index: number): string[] {
    if (!this.dadosAdicionais[index]) return [];
    
    const dados = this.dadosAdicionais[index];
    const info: string[] = [];
    
    info.push(`Total de avaliações: ${dados.total}`);
    
    if (dados.sentimentos) {
      info.push(`Positivas: ${dados.sentimentos.positivo}`);
      info.push(`Neutras: ${dados.sentimentos.neutro}`);
      info.push(`Negativas: ${dados.sentimentos.negativo}`);
    }
    
    return info;
  }



  resetarFiltros(): void {
    const hoje = new Date();
    const tressMesesAtras = new Date();
    tressMesesAtras.setMonth(hoje.getMonth() - 3);

    this.filtroForm.patchValue({
      dataInicio: this.formatarDataParaInput(tressMesesAtras),
      dataFim: this.formatarDataParaInput(hoje),
      tipoComparacao: 'ambos',
      intervalo: 'dia'
    });
    // O carregarDados() será chamado automaticamente pelo valueChanges
  }
}