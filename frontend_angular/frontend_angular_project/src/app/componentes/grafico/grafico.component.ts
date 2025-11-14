import { Component, OnInit, Input, OnChanges, SimpleChanges, EventEmitter, Output, HostListener, AfterViewInit, ViewChild, ElementRef, Injector } from '@angular/core';
import { Chart, ChartType, ChartOptions } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { RestauranteService } from '../../services/restaurante.service';
import { restauranteModel } from '../../model/restaurante.model';
import { PratoService } from '../../services/prato.service';
import { AvaliacaoPratoService } from '../../services/avaliacao-prato.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { FormControl, FormGroup } from '@angular/forms';
import { ChartDataset } from 'chart.js';

@Component({
  selector: 'app-grafico',
  templateUrl: './grafico.component.html',
  styleUrls: ['./grafico.component.css'],
})
export class GraficoComponent implements OnInit, OnChanges, AfterViewInit {
  @ViewChild(BaseChartDirective) chart: BaseChartDirective | undefined;
  @ViewChild('chartCanvas') chartCanvas: ElementRef | undefined;
  @Input() restauranteID!: number;
  // No arquivo grafico.component.ts - Adicionando um novo tipo de gráfico
  @Input() tipoGrafico: 'avaliacao' | 'mensal' | 'pratos' | 'historico' = 'avaliacao';
  @Output() notaSelecionada = new EventEmitter<number>();
  @Input() permitirInteracao: boolean = false;
  periodoSelecionado: 'ultimos7dias' | 'ultimo30dias' | 'ultimos3meses' | 'ultimo6meses' | 'ultimoAno' | 'personalizado' = 'ultimos3meses';
  
  // Dados do restaurante
  restaurante?: restauranteModel;
  Nome = '';
  exibirLegenda: boolean = true;
  exibirGrade: boolean = false;
  suavizarCurva: boolean = true;
  
  // Dados comparativos
  periodoComparacao: string | null = null;
  dadosComparacao: any = null;
  // Dados de análise
  mediaNotas = 0;
  notaMaisFrequente = 0;
  percentualNotasBaixas = 0;
  percentualNotasAltas = 0;
  dateForm = new FormGroup({
    start: new FormControl(),
    end: new FormControl()
  });
  metricasDisponiveis = [
    { id: 'mediaGeral', nome: 'Média Geral', selecionado: true },
    { id: 'mediaRestaurante', nome: 'Média Restaurante', selecionado: true },
    { id: 'mediaPratos', nome: 'Média Pratos', selecionado: true },
    { id: 'totalAvaliacoes', nome: 'Total de Avaliações', selecionado: false },
    { id: 'percentualPositivas', nome: '% Avaliações Positivas', selecionado: false }
  ];
  // Configurações do gráfico
  chartType: ChartType = 'bar';
  chartData: any = {
    labels: ['Nota 1', 'Nota 2', 'Nota 3', 'Nota 4', 'Nota 5'],
    datasets: [{
      data: [0, 0, 0, 0, 0],
      backgroundColor: [
        '#8E3200', // Canela/Chocolate
        '#D62300', // Pimentão vermelho
        '#FFC72C', // Mostarda
        '#4C9447', // Abacate
        '#1A5653', // Azul-petróleo/Oceano
      ],
      borderWidth: 0,
      borderRadius: 6,
      hoverOffset: 10
    }]
  };
  
  chartOptions: ChartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2, // Proporção fixa importante!
    animation: {
      duration: 1000,
      easing: 'easeOutQuart'
    },
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        backgroundColor: 'white',
        titleColor: '#3D352E',
        bodyColor: '#3D352E',
        borderColor: '#EAE3DB',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
        boxPadding: 6,
        displayColors: true,
        callbacks: {
          label: function(context: any) {
            return `Quantidade: ${context.raw}`;
          }
        }
      }
    },
    scales: {
      x: { 
        display: true,
        grid: {
          display: false
        }
      },
      y: { 
        beginAtZero: true,
        ticks: {
          precision: 0
        },
        grid: {
          color: 'rgba(0,0,0,0.05)'
        }
      }
    }
  };
  
  chartPlugins = [];

  constructor(
    private restauranteService: RestauranteService,
    private avaliacaoService: AvaliacaoService,
    private injector: Injector
  ) {}
  // Nova função para processar os dados históricos (pelo menos 12 meses)
  private processarHistoricoMensal(avals: AvaliacaoModel[]): void {
    // Agrupar avaliações por mês para os últimos 12 meses
    const avaliacoesPorMes: { [key: string]: number[] } = {};
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Inicializar os últimos 12 meses
    const hoje = new Date();
    for (let i = 11; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesChave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      avaliacoesPorMes[mesChave] = [];
    }
    
    // Agrupar avaliações por mês
    for (const aval of avals) {
      if (aval.data_avaliacao) {
        const data = new Date(aval.data_avaliacao);
        const mesChave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        // Considerar apenas os últimos 12 meses
        if (avaliacoesPorMes[mesChave] !== undefined) {
          avaliacoesPorMes[mesChave].push(aval.Nota);
        }
      }
    }
    
    // Calcular médias por mês
    const labels: string[] = [];
    const medias: number[] = [];
    const mediasAcumuladas: number[] = []; // Para histórico acumulado
    let somaAcumulada = 0;
    let contadorAcumulado = 0;
    
    Object.keys(avaliacoesPorMes).sort().forEach(mesChave => {
      const [ano, mes] = mesChave.split('-').map(Number);
      const notas = avaliacoesPorMes[mesChave];
      
      // Calcular média do mês
      const media = notas.length > 0 
        ? parseFloat((notas.reduce((sum, nota) => sum + nota, 0) / notas.length).toFixed(1))
        : 0;
      
      // Adicionar ao acumulado
      if (notas.length > 0) {
        somaAcumulada += notas.reduce((sum, nota) => sum + nota, 0);
        contadorAcumulado += notas.length;
      }
      
      // Calcular média acumulada até este mês
      const mediaAcumulada = contadorAcumulado > 0
        ? parseFloat((somaAcumulada / contadorAcumulado).toFixed(1))
        : 0;
      
      labels.push(`${meses[mes-1]}/${String(ano).slice(2)}`);
      medias.push(media);
      mediasAcumuladas.push(mediaAcumulada);
    });
    
    // Atualizar gráfico com médias mensais e acumuladas
    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Média Mensal',
          data: medias,
          backgroundColor: '#6A7B53', // Verde oliva
          borderColor: '#6A7B53',
          fill: false,
          tension: 0.1,
          borderWidth: 3,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: '#6A7B53',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Média Histórica',
          data: mediasAcumuladas,
          backgroundColor: 'rgba(217, 119, 70, 0.2)', // Cor primária com transparência
          borderColor: '#d97746',
          fill: true,
          tension: 0.4,
          borderWidth: 2,
          borderDash: [5, 5],
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: '#d97746',
          pointBorderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5
        }
      ]
    };
    
    // Configurar gráfico para histórico mensal
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          backgroundColor: 'white',
          titleColor: '#3D352E',
          bodyColor: '#3D352E',
          borderColor: '#EAE3DB',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          boxPadding: 6,
          displayColors: true
        }
      },
      scales: {
        x: { 
          display: true,
          grid: {
            display: false
          }
        },
        y: { 
          beginAtZero: true,
          max: 5,
          ticks: {
            stepSize: 1
          },
          grid: {
            color: 'rgba(0,0,0,0.05)'
          }
        }
      }
    } as ChartOptions<'line'>;
    
    // Definir tipo como linha
    this.chartType = 'line';
    
    setTimeout(() => {
      this.updateChartSize();
    }, 50);
  }

  ngOnInit(): void {
    if (this.restauranteID) {
      this.carregarDados();
    }
  }
  
  ngOnDestroy() {
    // Limpeza de recursos
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.updateChartSize();
    }, 100);
  }
  
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['restauranteID'] && this.restauranteID) {
      this.carregarDados();
    }
    
    if (changes['tipoGrafico']) {
      this.carregarDados();
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.updateChartSize();
  }
  
  // Função para atualizar o tamanho do gráfico
  private updateChartSize(): void {
    if (this.chart && this.chart.chart) {
      this.chart.chart.resize();
    }
  }
  
  setChartType(type: ChartType): void {
    this.chartType = type;
    
    const commonOptions = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'white',
          titleColor: '#3D352E',
          bodyColor: '#3D352E',
          borderColor: '#EAE3DB',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          boxPadding: 6,
          displayColors: true,
          callbacks: {
            label: function(context: any) {
              return `Quantidade: ${context.raw}`;
            }
          }
        }
      }
    };
    
    if (type === 'doughnut') {
      this.chartOptions = {
        ...commonOptions,
      } as ChartOptions<'doughnut'>;
      
      // Aplicar a propriedade cutout separadamente para contornar o erro de tipagem
      (this.chartOptions as any).cutout = '70%';
    } else {
      this.chartOptions = {
        ...commonOptions,
        animation: {
          duration: 500,
          easing: 'easeOutQuad'
        },
        scales: {
          x: { 
            display: true,
            grid: {
              display: false
            }
          },
          y: { 
            beginAtZero: true,
            ticks: {
              precision: 0
            },
            grid: {
              color: 'rgba(0,0,0,0.05)'
            }
          }
        }
      } as ChartOptions<'bar'>;
    }
    
    setTimeout(() => {
      this.updateChartSize();
    }, 50);
  }

  onChartClick(event: any) {
    if (event.active && event.active.length > 0) {
      const idx = event.active[0].index;
      const nota = idx + 1;
      this.notaSelecionada.emit(nota);
    }
  }
  
  private carregarDados(): void {
    this.restauranteService.buscarPorId(this.restauranteID).subscribe((r: restauranteModel) => {
      this.restaurante = r;
      this.Nome = r.Nome;
      
      // Selecionar qual tipo de dados carregar com base no tipoGrafico
      switch (this.tipoGrafico) {
        case 'mensal':
          this.carregarDadosMensais();
          break;
        case 'pratos':
          this.carregarDadosPratos();
          break;
        case 'historico':
          this.carregarHistorico();
          break;
        case 'avaliacao':
        default:
          this.carregarAvaliacoes();
          break;
      }
    });
  }

  private carregarHistorico(): void {
    this.avaliacaoService.buscarPorRestaurante(this.restauranteID)
      .subscribe({
        next: (lista: AvaliacaoModel[]) => this.processarHistoricoMensal(lista),
        error: err => console.error('Erro ao buscar histórico mensal:', err)
      });
  }

  private carregarAvaliacoes(): void {
    this.avaliacaoService.buscarPorRestaurante(this.restauranteID)
      .subscribe({
        next: (lista: AvaliacaoModel[]) => this.processarAvaliacoes(lista),
        error: err => console.error('Erro ao buscar avaliações:', err)
      });
  }
  
  // Novo método para carregar dados por mês
  private carregarDadosMensais(): void {
    this.avaliacaoService.buscarPorRestaurante(this.restauranteID)
      .subscribe({
        next: (lista: AvaliacaoModel[]) => this.processarAvaliacoesMensais(lista),
        error: err => console.error('Erro ao buscar avaliações mensais:', err)
      });
  }
  
  // Novo método para carregar dados dos pratos
  // No método carregarDadosPratos() em grafico.component.ts, adicione log para debug

  private carregarDadosPratos(): void {
    console.log('Carregando dados de pratos para restaurante:', this.restauranteID);
    
    // Importar o serviço usando o injector
    const pratoService = this.injector.get(PratoService);

    // Obter os pratos mais bem avaliados
    pratoService.getPratosMaisAvaliados(this.restauranteID, 5)
      .subscribe({
        next: (pratos) => {
          console.log('Pratos recebidos:', pratos);
          
          if (pratos && pratos.length > 0) {
            this.processarPratosMaisAvaliados(pratos);
          } else {
            this.mostrarMensagemSemDados('Nenhum prato com avaliação encontrado.');
          }
        },
        error: (err) => {
          console.error('Erro ao carregar melhores pratos:', err);
          this.mostrarMensagemSemDados('Erro ao carregar dados dos pratos.');
        }
      });
  }


  
  private processarPratosMaisAvaliados(pratos: any[]): void {
    // Ordenar por média de avaliação (decrescente)
    pratos.sort((a, b) => b.mediaAvaliacao - a.mediaAvaliacao);
    
    // Preparar os dados para o gráfico
    const labels = pratos.map(p => this.truncarTexto(p.nomePrato, 20)); // Limitar tamanho do nome
    const medias = pratos.map(p => parseFloat(p.mediaAvaliacao.toFixed(1)));
    const qtdAvaliacoes = pratos.map(p => p.totalAvaliacoes);
    
    // Determinar cores baseadas na média (verde para alta, vermelho para baixa)
    const cores = medias.map(media => this.getCorPorAvaliacao(media));
    
    // Atualizar dados do gráfico
    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Nota Média',
          data: medias,
          backgroundColor: cores,
          borderColor: cores.map(cor => this.ajustarBrilho(cor, -20)), // Bordas mais escuras
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.7,
        },
        {
          label: 'Quantidade de Avaliações',
          data: qtdAvaliacoes,
          backgroundColor: 'rgba(106, 123, 83, 0.5)', // Verde oliva semi-transparente
          borderColor: '#6A7B53',
          borderWidth: 1,
          borderRadius: 6,
          barPercentage: 0.5,
          // Usar um segundo eixo y para quantidade
          yAxisID: 'y1'
        }
      ]
    };
    
    // Configurar opções do gráfico
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      indexAxis: 'y', // Barras horizontais para melhor visualização
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          backgroundColor: 'white',
          titleColor: '#3D352E',
          bodyColor: '#3D352E',
          borderColor: '#EAE3DB',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          boxPadding: 6,
          displayColors: true,
          callbacks: {
            title: (items) => {
              // Mostrar nome completo do prato
              const index = items[0].dataIndex;
              return pratos[index].nomePrato;
            },
            label: (context) => {
              const idx = context.dataIndex;
              const datasetIdx = context.datasetIndex;
              
              if (datasetIdx === 0) {
                return `Nota média: ${context.raw}`;
              } else {
                return `Total de avaliações: ${context.raw}`;
              }
            },
            afterBody: (items) => {
              // Adicionar descrição do prato se disponível
              const index = items[0].dataIndex;
              const prato = pratos[index];
              if (prato.descricao) {
                return [`Descrição: ${this.truncarTexto(prato.descricao, 50)}`, 
                      `Preço: R$ ${prato.preco.toFixed(2)}`];
              }
              return [`Preço: R$ ${prato.preco.toFixed(2)}`];
            }
          }
        }
      },
      scales: {
        x: { 
          display: true,
          grid: {
            display: false
          },
          ticks: {
            precision: 1
          },
          title: {
            display: true,
            text: 'Nota Média'
          }
        },
        y: { 
          display: true,
          grid: {
            color: 'rgba(0,0,0,0.05)'
          },
          title: {
            display: true,
            text: 'Pratos'
          }
        },
        y1: {
          display: false, // Eixo secundário oculto
          position: 'right',
          grid: {
            drawOnChartArea: false
          },
          ticks: {
            precision: 0
          }
        }
      }
    } as ChartOptions<'bar'>;
    
    // Definir tipo como barra
    this.chartType = 'bar';
    
    setTimeout(() => {
      this.updateChartSize();
    }, 50);
  }
  // Função auxiliar para determinar cor baseada na avaliação
  private getCorPorAvaliacao(media: number): string {
    if (media >= 4.5) return '#1A5653'; // Azul-petróleo (excelente)
    if (media >= 4.0) return '#4C9447'; // Verde abacate (muito bom)
    if (media >= 3.5) return '#6A7B53'; // Verde oliva (bom)
    if (media >= 3.0) return '#FFC72C'; // Amarelo mostarda (regular)
    if (media >= 2.0) return '#D62300'; // Vermelho (ruim)
    return '#8E3200'; // Marrom (muito ruim)
  }
  private truncarTexto(texto: string, maxLength: number): string {
    if (!texto) return '';
    return texto.length > maxLength ? texto.substring(0, maxLength) + '...' : texto;
  }
  private ajustarBrilho(cor: string, percentual: number): string {
    // Converte cor hex para RGB
    let r = parseInt(cor.substr(1, 2), 16);
    let g = parseInt(cor.substr(3, 2), 16);
    let b = parseInt(cor.substr(5, 2), 16);
    
    // Ajusta brilho
    r = Math.max(0, Math.min(255, r + percentual));
    g = Math.max(0, Math.min(255, g + percentual));
    b = Math.max(0, Math.min(255, b + percentual));
    
    // Converte de volta para hex
    return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  // Método para processar avaliações mensais
  // Em grafico.component.ts, modificar o método processarAvaliacoesMensais
  private processarAvaliacoesMensais(avals: AvaliacaoModel[]): void {
    // Buscar também os dados de avaliações de pratos
    const pratoService = this.injector.get(PratoService);
    const avalPratoService = this.injector.get(AvaliacaoPratoService);
    
    // Obter estatísticas mensais de pratos
    pratoService.getEstatisticasMensais(this.restauranteID, 6).subscribe({
      next: (estatisticasPratos) => {
        this.construirGraficoComparativo(avals, estatisticasPratos);
      },
      error: (err) => {
        console.error('Erro ao buscar estatísticas de pratos:', err);
        // Se falhar, continuar apenas com dados de restaurante
        this.construirGraficoComparativo(avals, null);
      }
    });
  }

  // Novo método para construir o gráfico comparativo
  private construirGraficoComparativo(avaliacoes: AvaliacaoModel[], estatisticasPratos: any): void {
    // Agrupar avaliações por mês
    const avaliacoesPorMes: { [key: string]: number[] } = {};
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    // Inicializar meses dos últimos 6 meses
    const hoje = new Date();
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesChave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      avaliacoesPorMes[mesChave] = [];
    }
    
    // Agrupar avaliações de restaurante por mês
    for (const aval of avaliacoes) {
      if (aval.data_avaliacao) {
        const data = new Date(aval.data_avaliacao);
        const mesChave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        if (avaliacoesPorMes[mesChave] !== undefined) {
          avaliacoesPorMes[mesChave].push(aval.Nota);
        }
      }
    }
    
    // Preparar arrays para o gráfico
    const labels: string[] = [];
    const mediasRestaurante: number[] = [];
    const mediasPratos: number[] = [];
    const mediasPonderadas: number[] = [];
    
    // Processar mês a mês
    Object.keys(avaliacoesPorMes).sort().forEach(mesChave => {
      const [ano, mes] = mesChave.split('-').map(Number);
      const notasRestaurante = avaliacoesPorMes[mesChave];
      
      // Média do restaurante
      const mediaRestaurante = notasRestaurante.length > 0 
        ? parseFloat((notasRestaurante.reduce((sum, nota) => sum + nota, 0) / notasRestaurante.length).toFixed(1))
        : 0;
      
      // Obter dados de pratos para este mês
      let mediaPratos = 0;
      let totalAvaliacoesPratos = 0;
      
      if (estatisticasPratos && estatisticasPratos.meses && estatisticasPratos.meses[mesChave]) {
        const dadosMes = estatisticasPratos.meses[mesChave];
        mediaPratos = parseFloat(dadosMes.media.toFixed(1));
        totalAvaliacoesPratos = dadosMes.total;
      }
      
      // Calcular média ponderada
      let mediaPonderada = 0;
      const totalAvaliacoesRestaurante = notasRestaurante.length;
      const totalAvaliacoes = totalAvaliacoesRestaurante + totalAvaliacoesPratos;
      
      if (totalAvaliacoes > 0) {
        mediaPonderada = parseFloat(((mediaRestaurante * totalAvaliacoesRestaurante + 
                                      mediaPratos * totalAvaliacoesPratos) / 
                                      totalAvaliacoes).toFixed(1));
      } else {
        mediaPonderada = 0;
      }
      
      // Adicionar aos arrays
      labels.push(`${meses[mes-1]}/${String(ano).slice(2)}`);
      mediasRestaurante.push(mediaRestaurante);
      mediasPratos.push(mediaPratos);
      mediasPonderadas.push(mediaPonderada);
    });
    
    // Atualizar gráfico com as três médias
    this.chartData = {
      labels: labels,
      datasets: [
        {
          label: 'Média Restaurante',
          data: mediasRestaurante,
          backgroundColor: 'rgba(26, 86, 83, 0.2)', // Azul-petróleo com transparência
          borderColor: '#1A5653',
          fill: false,
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: '#1A5653',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Média Pratos',
          data: mediasPratos,
          backgroundColor: 'rgba(217, 119, 70, 0.2)', // Laranja com transparência
          borderColor: '#d97746',
          fill: false,
          tension: 0.3,
          borderWidth: 2,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: '#d97746',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6
        },
        {
          label: 'Média Ponderada',
          data: mediasPonderadas,
          backgroundColor: 'rgba(76, 148, 71, 0.5)', // Verde com transparência
          borderColor: '#4C9447',
          fill: true, // Preencher área sob a linha
          tension: 0.4,
          borderWidth: 3,
          pointBackgroundColor: '#FFFFFF',
          pointBorderColor: '#4C9447',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7
        }
      ]
    };
    
    // Configurar opções do gráfico
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          display: true,
          position: 'top'
        },
        tooltip: {
          backgroundColor: 'white',
          titleColor: '#3D352E',
          bodyColor: '#3D352E',
          borderColor: '#EAE3DB',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          boxPadding: 6,
          displayColors: true,
          callbacks: {
            label: function(context) {
              const datasetIdx = context.datasetIndex;
              let label = context.dataset.label || '';
              
              // Adicionar informações adicionais baseadas no tipo de média
              if (datasetIdx === 0) {
                const avaliacoesRestaurante = avaliacoesPorMes[`${hoje.getFullYear()}-${String(context.dataIndex + hoje.getMonth() - 5 + 1).padStart(2, '0')}`].length;
                return [`${label}: ${context.raw}`, `Avaliações: ${avaliacoesRestaurante}`];
              } else if (datasetIdx === 1) {
                const mesChave = `${hoje.getFullYear()}-${String(context.dataIndex + hoje.getMonth() - 5 + 1).padStart(2, '0')}`;
                const totalPratos = estatisticasPratos && estatisticasPratos.meses && estatisticasPratos.meses[mesChave] 
                  ? estatisticasPratos.meses[mesChave].total : 0;
                return [`${label}: ${context.raw}`, `Avaliações: ${totalPratos}`];
              } else {
                return `${label}: ${context.raw}`;
              }
            }
          }
        }
      },
      scales: {
        x: { 
          display: true,
          grid: {
            display: false
          }
        },
        y: { 
          beginAtZero: true,
          max: 5,
          ticks: {
            stepSize: 1
          },
          grid: {
            color: 'rgba(0,0,0,0.05)'
          }
        }
      }
    } as ChartOptions<'line'>;
    
    // Definir tipo como linha para visualização mensal
    this.chartType = 'line';
    
    setTimeout(() => {
      this.updateChartSize();
    }, 50);
  }
  private mostrarMensagemSemDados(mensagem: string): void {
  this.chartData = {
    labels: ['Sem dados'],
    datasets: [{
      data: [1],
      backgroundColor: '#f0f0f0',
      borderWidth: 0
    }]
  };
  
  // Configurar opções para mostrar mensagem
  this.chartOptions = {
    responsive: true,
    maintainAspectRatio: true,
    aspectRatio: 2,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        enabled: false
      },
      datalabels: {
        color: '#666',
        formatter: () => mensagem,
        font: {
          size: 14
        },
        align: 'center',
        anchor: 'center'
      }
    },
    scales: {
      x: { 
        display: false
      },
      y: { 
        display: false
      }
    }
  } as ChartOptions<'bar'>;
  
  this.chartType = 'bar';
}
  // Método para processar avaliações de pratos
  private processarAvaliacoesPratos(dados: any[]): void {
    // Ordenar por média e pegar os 5 melhores
    const melhoresPratos = dados
      .sort((a, b) => b.mediaAvaliacao - a.mediaAvaliacao)
      .slice(0, 5);
    
    const labels = melhoresPratos.map(p => p.nomePrato);
    const medias = melhoresPratos.map(p => parseFloat(p.mediaAvaliacao.toFixed(1)));
    const quantidades = melhoresPratos.map(p => p.totalAvaliacoes);
    
    // Atualizar gráfico com dados de pratos
    this.chartData = {
      labels: labels,
      datasets: [{
        label: 'Média',
        data: medias,
        backgroundColor: [
          '#8E3200', // Canela/Chocolate
          '#D62300', // Pimentão vermelho
          '#FFC72C', // Mostarda
          '#4C9447', // Abacate
          '#1A5653', // Azul-petróleo/Oceano
        ],
        borderWidth: 0,
        borderRadius: 6,
        hoverOffset: 10
      }]
    };
    
    // Configurar gráfico para pratos
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      indexAxis: 'y',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'white',
          titleColor: '#3D352E',
          bodyColor: '#3D352E',
          borderColor: '#EAE3DB',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          boxPadding: 6,
          displayColors: true,
          callbacks: {
            label: function(context: any) {
              const idx = context.dataIndex;
              return [
                `Nota média: ${context.raw}`,
                `Total avaliações: ${quantidades[idx]}`
              ];
            }
          }
        }
      },
      scales: {
        x: { 
          display: true,
          grid: {
            display: false
          },
          min: 0,
          max: 5,
          ticks: {
            stepSize: 1
          }
        },
        y: { 
          display: true,
          grid: {
            color: 'rgba(0,0,0,0.05)'
          }
        }
      }
    } as ChartOptions<'bar'>;
    
    this.chartType = 'bar';
    
    setTimeout(() => {
      this.updateChartSize();
    }, 50);
  }

  private processarAvaliacoes(avals: AvaliacaoModel[]): void {
    // Contador para cada nota de 1 a 5
    const contagens = [0, 0, 0, 0, 0];
    let somaNotas = 0;
    let totalAvaliacoes = 0;
    
    for (const a of avals) {
      if (a.Nota && a.Nota >= 1 && a.Nota <= 5) {
        contagens[a.Nota - 1] += 1;
        somaNotas += a.Nota;
        totalAvaliacoes++;
      }
    }
    
    // Calcular métricas
    this.calcularMetricas(contagens, somaNotas, totalAvaliacoes);
    
    // Atualizar gráfico
    this.atualizarGrafico(contagens);
  }
  
  private calcularMetricas(contagens: number[], somaNotas: number, totalAvaliacoes: number): void {
    // Média de notas
    this.mediaNotas = totalAvaliacoes > 0 ? somaNotas / totalAvaliacoes : 0;
    
    // Nota mais frequente
    let maxCount = 0;
    this.notaMaisFrequente = 0;
    contagens.forEach((count, idx) => {
      if (count > maxCount) {
        maxCount = count;
        this.notaMaisFrequente = idx + 1;
      }
    });
    
    // Percentual de notas baixas (1 e 2)
    const notasBaixas = contagens[0] + contagens[1];
    this.percentualNotasBaixas = totalAvaliacoes > 0 
      ? Math.round((notasBaixas / totalAvaliacoes) * 100) 
      : 0;
    
    // Percentual de notas altas (4 e 5)
    const notasAltas = contagens[3] + contagens[4];
    this.percentualNotasAltas = totalAvaliacoes > 0 
      ? Math.round((notasAltas / totalAvaliacoes) * 100) 
      : 0;
  }

  private atualizarGrafico(contagens: number[]): void {
    this.chartData = {
      labels: ['Nota 1', 'Nota 2', 'Nota 3', 'Nota 4', 'Nota 5'],
      datasets: [{
        data: contagens,
        backgroundColor: [
          '#8E3200', // Canela/Chocolate
          '#D62300', // Pimentão vermelho
          '#FFC72C', // Mostarda
          '#4C9447', // Abacate
          '#1A5653', // Azul-petróleo/Oceano
        ],
        borderWidth: 0,
        borderRadius: 6,
        hoverOffset: 10
      }]
    };
    
    // Atualizar opções
    this.setChartType(this.chartType);
  }
  // Substituir o método alterarPeriodo

  alterarPeriodo(periodo: string): void {
    this.periodoSelecionado = periodo as any;
    
    const hoje = new Date();
    let dataInicio: Date;
    let dataFim: Date = new Date(hoje);
    
    switch(periodo) {
      case 'ultimos7dias':
        dataInicio = new Date(hoje);
        dataInicio.setDate(hoje.getDate() - 7);
        break;
      case 'ultimo30dias':
        dataInicio = new Date(hoje);
        dataInicio.setDate(hoje.getDate() - 30);
        break;
      case 'ultimos3meses':
        dataInicio = new Date(hoje);
        dataInicio.setMonth(hoje.getMonth() - 3);
        break;
      case 'ultimo6meses':
        dataInicio = new Date(hoje);
        dataInicio.setMonth(hoje.getMonth() - 6);
        break;
      case 'ultimoAno':
        dataInicio = new Date(hoje);
        dataInicio.setFullYear(hoje.getFullYear() - 1);
        break;
      case 'personalizado':
        // Não fazer nada, esperar usuário definir datas
        return;
      default:
        dataInicio = new Date(hoje);
        dataInicio.setMonth(hoje.getMonth() - 3);
    }
    
    this.dateForm.setValue({
      start: dataInicio,
      end: dataFim
    });
    
    // Usar o novo método que considera métricas
    this.carregarDadosComMetricas();
  }
  // Método para carregar dados com base no período selecionado
  carregarDadosParaPeriodo(): void {
    let dataInicio: Date;
    const hoje = new Date();
    
    switch (this.periodoSelecionado) {
      case 'ultimos7dias':
        dataInicio = new Date(hoje);
        dataInicio.setDate(dataInicio.getDate() - 7);
        break;
      case 'ultimo30dias':
        dataInicio = new Date(hoje);
        dataInicio.setDate(dataInicio.getDate() - 30);
        break;
      case 'ultimos3meses':
        dataInicio = new Date(hoje);
        dataInicio.setMonth(dataInicio.getMonth() - 3);
        break;
      case 'ultimo6meses':
        dataInicio = new Date(hoje);
        dataInicio.setMonth(dataInicio.getMonth() - 6);
        break;
      case 'ultimoAno':
        dataInicio = new Date(hoje);
        dataInicio.setFullYear(dataInicio.getFullYear() - 1);
        break;
      case 'personalizado':
        dataInicio = this.dateForm.value.start || new Date(hoje.setMonth(hoje.getMonth() - 3));
        break;
    }
    const dataFim = this.periodoSelecionado === 'personalizado' ? 
      this.dateForm.value.end || hoje : hoje;
    
    // Buscar dados do período selecionado
    this.buscarDadosPorPeriodo(dataInicio, dataFim);
  }
    buscarDadosPorPeriodo(dataInicio: Date, dataFim: Date): void {
      console.log('Buscando dados do período:', dataInicio, dataFim);
      
      // Se for um gráfico de histórico ou evolução
      if (this.tipoGrafico === 'historico' || this.tipoGrafico === 'mensal') {
        this.avaliacaoService.buscarAnaliseNoPeriodo(
          this.restauranteID, 
          dataInicio.toISOString(), 
          dataFim.toISOString()
        ).subscribe({
          next: (dados: any) => {
            console.log('Dados recebidos da API:', dados);
            
            if (dados && dados.avaliacoes_por_data) {
              this.processarDadosDoPeriodo(dados);
            } else {
              console.error('Estrutura de dados inválida recebida:', dados);
              this.mostrarMensagemSemDados('Erro ao processar dados do período');
            }
          },
          error: (err: any) => {
            console.error('Erro ao buscar dados do período:', err);
            this.mostrarMensagemSemDados('Erro ao carregar dados do período');
          }
        });
      }
      // Para outros tipos de gráficos, manter o comportamento existente
      else {
        this.carregarDados();
      }
    }

  processarDadosDoPeriodo(dados: any): void {
    console.log('Dados recebidos do backend:', dados);
    
    // Validar estrutura de dados
    if (!dados || !dados.avaliacoes_por_data || dados.avaliacoes_por_data.length === 0) {
      console.warn('Dados inválidos ou vazios recebidos');
      this.mostrarMensagemSemDados('Nenhum dado disponível para o período selecionado');
      return;
    }
    
    // Extrair labels (datas) dos dados
    const labels = dados.avaliacoes_por_data.map((item: any) => item.data);
    
    // Criar dataset base com médias
    const datasets: ChartDataset<'line'>[] = [];
    
    // Dataset de média do período
    datasets.push({
      label: 'Média de Notas',
      data: dados.avaliacoes_por_data.map((item: any) => item.media),
      backgroundColor: 'rgba(217, 119, 70, 0.2)',
      borderColor: '#d97746',
      borderWidth: 2,
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: '#d97746',
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    });
    
    // Atualizar dados do gráfico
    this.chartData = {
      labels: labels,
      datasets: datasets
    };
    
    // Configurar como gráfico de linha
    this.chartType = 'line';
    
    // Configurar opções do gráfico
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          display: this.exibirLegenda,
          position: 'top'
        },
        tooltip: {
          backgroundColor: 'white',
          titleColor: '#3D352E',
          bodyColor: '#3D352E',
          borderColor: '#EAE3DB',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          boxPadding: 6,
          displayColors: true,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context: any) => {
              const index = context.dataIndex;
              const item = dados.avaliacoes_por_data[index];
              return [
                `Média: ${context.raw}`,
                `Total de avaliações: ${item.total}`
              ];
            }
          }
        }
      },
      scales: {
        x: { 
          display: true,
          grid: {
            display: this.exibirGrade
          }
        },
        y: { 
          beginAtZero: true,
          max: 5,
          ticks: {
            stepSize: 1
          },
          grid: {
            display: this.exibirGrade,
            color: 'rgba(0,0,0,0.05)'
          }
        }
      }
    } as ChartOptions<'line'>;
    
    setTimeout(() => {
      if (this.chart) {
        this.chart.update();
      }
    }, 50);
  }
  criarDatasetParaMetrica(dados: any, idMetrica: string): ChartDataset<'line'> | null {
    console.log('Criando dataset para métrica:', idMetrica, dados);
    
    // Validar dados
    if (!dados || !dados.avaliacoes_por_data) {
      console.error('Dados inválidos para criar dataset');
      return null;
    }
    
    // Configurações visuais para cada métrica
    const configuracoesVisuais: any = {
      'mediaGeral': { 
        label: 'Média Geral',
        backgroundColor: 'rgba(217, 119, 70, 0.2)',
        borderColor: '#d97746',
        data: dados.avaliacoes_por_data.map((item: any) => item.media)
      },
      'totalAvaliacoes': {
        label: 'Total de Avaliações',
        backgroundColor: 'rgba(142, 50, 0, 0.2)',
        borderColor: '#8E3200',
        data: dados.avaliacoes_por_data.map((item: any) => item.total)
      }
    };
    
    const config = configuracoesVisuais[idMetrica];
    
    if (!config) {
      console.warn(`Métrica ${idMetrica} não configurada`);
      return null;
    }
    
    return {
      label: config.label,
      data: config.data,
      backgroundColor: config.backgroundColor,
      borderColor: config.borderColor,
      fill: this.chartType === 'line',
      tension: this.suavizarCurva ? 0.4 : 0,
      borderWidth: 2,
      pointBackgroundColor: '#FFFFFF',
      pointBorderColor: config.borderColor,
      pointBorderWidth: 2,
      pointRadius: 4,
      pointHoverRadius: 6
    };
  }
  
  // Método para atualizar opções do gráfico
  atualizarOpcoesGrafico(): void {
    this.chartOptions = {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 2,
      plugins: {
        legend: {
          display: this.exibirLegenda,
          position: 'top'
        },
        tooltip: {
          backgroundColor: 'white',
          titleColor: '#3D352E',
          bodyColor: '#3D352E',
          borderColor: '#EAE3DB',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          boxPadding: 6,
          displayColors: true,
          mode: 'index',
          intersect: false
        },
        zoom: {
          zoom: {
            wheel: {
              enabled: true,
            },
            pinch: {
              enabled: true
            },
            mode: 'xy',
          },
          pan: {
            enabled: true,
            mode: 'xy',
          }
        }
      },
      scales: {
        x: { 
          display: true,
          grid: {
            display: this.exibirGrade
          }
        },
        y: { 
          beginAtZero: true,
          grid: {
            display: this.exibirGrade,
            color: 'rgba(0,0,0,0.05)'
          }
        }
      }
    } as ChartOptions<'line'>;
    
    setTimeout(() => {
      this.updateChartSize();
    }, 50);
  }
  
  // Método para alternar tipo de visualização
  alternarTipoVisualizacao(tipo: 'linha' | 'barra' | 'area'): void {
    if (tipo === 'linha') {
      this.chartType = 'line';
      // Atualizar datasets para não ter fill
      this.chartData.datasets.forEach((ds: any) => ds.fill = false);
    } else if (tipo === 'barra') {
      this.chartType = 'bar';
    } else if (tipo === 'area') {
      this.chartType = 'line';
      // Atualizar datasets para ter fill
      this.chartData.datasets.forEach((ds: any) => ds.fill = true);
    }
    
    this.atualizarOpcoesGrafico();
  }
  
  // Método para adicionar dados de comparação
  adicionarComparacao(periodo: string | null): void {
    if (!periodo) {
      // Limpar dados de comparação
      this.periodoComparacao = null;
      this.dadosComparacao = null;
      // Recarregar gráfico sem comparação
      this.carregarDadosComMetricas();
      return;
    }
    
    this.periodoComparacao = periodo;
    
    if (periodo === 'periodoAnterior') {
      this.compararComPeriodoAnterior();
    } else if (periodo === 'mesmoPeríodoAnoPassado') {
      this.compararComMesmoPeriodoAnoAnterior();
    }
  }

  // Método para comparar com mesmo período do ano anterior
  compararComMesmoPeriodoAnoAnterior(): void {
    const dataFim = this.dateForm.value.end || new Date();
    const dataInicio = this.dateForm.value.start || new Date(new Date().setMonth(new Date().getMonth() - 3));
    
    // Subtrair 1 ano das datas
    const anoAnteriorInicio = new Date(dataInicio);
    anoAnteriorInicio.setFullYear(anoAnteriorInicio.getFullYear() - 1);
    
    const anoAnteriorFim = new Date(dataFim);
    anoAnteriorFim.setFullYear(anoAnteriorFim.getFullYear() - 1);
    
    // Buscar dados do ano anterior
    this.avaliacaoService.buscarAnaliseNoPeriodo(
      this.restauranteID,
      anoAnteriorInicio.toISOString(),
      anoAnteriorFim.toISOString()
    ).subscribe({
      next: (dadosAnoAnterior: any) => {
        this.adicionarComparacaoAoGrafico(dadosAnoAnterior);
      },
      error: (err: any) => {
        console.error('Erro ao carregar dados do ano anterior:', err);
      }
    });
  }
  
  // Método para adicionar dados de comparação ao gráfico
  adicionarDadosComparacao(): void {
    // Implementar lógica para adicionar datasets de comparação...
  }
  
  // Método para exportar dados
  // Adicionar este método à classe GraficoComponent

  exportarDados(formato: 'csv' | 'excel'): void {
    // Construir objeto de dados
    const dados: any[] = [];
    
    // Obter rótulos e conjuntos de dados
    const labels = this.chartData.labels || [];
    const datasets = this.chartData.datasets || [];
    
    // Construir linhas de dados
    labels.forEach((label: string, index: number) => {
      const linha: any = { Período: label };
      
      // Adicionar valores de cada conjunto de dados
      datasets.forEach((dataset: any) => {
        linha[dataset.label] = dataset.data[index];
      });
      
      dados.push(linha);
    });
    
    if (formato === 'csv') {
      this.exportarCSV(dados);
    } else {
      this.exportarExcel(dados);
    }
  }

  private exportarCSV(dados: any[]): void {
    // Obter cabeçalhos
    const cabecalhos = Object.keys(dados[0]);
    
    // Criar linhas CSV
    const linhasCSV = [
      cabecalhos.join(','), // Cabeçalho
      ...dados.map(linha => cabecalhos.map(cabecalho => linha[cabecalho]).join(',')) // Linhas de dados
    ];
    
    // Criar blob e download
    const csvContent = linhasCSV.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', `grafico_${this.tipoGrafico}_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  private exportarExcel(dados: any[]): void {
    // Implementação básica - na prática, você precisaria de uma biblioteca como xlsx
    alert('Exportação para Excel requer implementação com biblioteca externa como XLSX');
    // Se você quiser implementar realmente, adicione: import * as XLSX from 'xlsx';
    // E use: const worksheet = XLSX.utils.json_to_sheet(dados);
  }
  
  // Método para salvar configuração do gráfico
  salvarConfiguracao(): void {
    // Implementar salvamento de configuração...
  }
  processarComparacao(dadosPeriodo1: any, dadosPeriodo2: any, tipoMetrica: string) {
  // Definir rótulos baseados nas datas do período 1
    const labels = dadosPeriodo1.datas;
    
    // Dados do período 1
    const dadosP1 = dadosPeriodo1[tipoMetrica];
    
    // Criar conjunto de dados com tipagem correta
    const datasets: ChartDataset<'line'>[] = [
      {
        label: 'Período Atual',
        data: dadosP1,
        backgroundColor: 'rgba(106, 156, 137, 0.2)',
        borderColor: '#6a9c89',
        borderWidth: 2,
        fill: true,
        tension: 0.4
      }
    ];
    
    // Adicionar período 2 se disponível
    if (dadosPeriodo2 && dadosPeriodo2[tipoMetrica]) {
      // Usar tipagem explícita para o segundo dataset
      const datasetComparacao: ChartDataset<'line'> = {
        label: 'Período Anterior',
        data: dadosPeriodo2[tipoMetrica],
        backgroundColor: 'rgba(217, 119, 70, 0.1)',
        borderColor: '#d97746',
        borderWidth: 2,
        borderDash: [5, 5], // Esta propriedade agora será reconhecida
        fill: true,
        tension: 0.4
      };
      
      datasets.push(datasetComparacao);
    }
    
    // Atualizar dados do gráfico
    this.chartData = {
      labels: labels,
      datasets: datasets
    };
    
    // Configurar como gráfico de linha
    this.chartType = 'line';
    this.atualizarOpcoesGrafico();
    
    setTimeout(() => {
      if (this.chart) {
        this.chart.update();
      }
    }, 50);
  }

  // Adicione estes métodos à classe GraficoComponent

// Método para carregar dados com base nas métricas selecionadas
carregarDadosComMetricas(): void {
  const dataInicio = this.dateForm.value.start || new Date(new Date().setMonth(new Date().getMonth() - 3));
  const dataFim = this.dateForm.value.end || new Date();
  
  this.avaliacaoService.buscarAnaliseNoPeriodo(
    this.restauranteID,
    dataInicio.toISOString(),
    dataFim.toISOString()
  ).subscribe({
    next: (dados: any) => {
      this.processarDadosComMetricas(dados);
    },
    error: (err: any) => {
      console.error('Erro ao carregar dados:', err);
      this.mostrarMensagemSemDados('Erro ao carregar dados');
    }
  });
}

// Processar dados considerando as métricas selecionadas
processarDadosComMetricas(dados: any): void {
  if (!dados || !dados.avaliacoes_por_data || dados.avaliacoes_por_data.length === 0) {
    this.mostrarMensagemSemDados('Nenhum dado disponível');
    return;
  }

  const labels = dados.avaliacoes_por_data.map((item: any) => item.data);
  const datasets: ChartDataset<'line'>[] = [];

  // Adicionar datasets com base nas métricas selecionadas
  this.metricasDisponiveis.forEach(metrica => {
    if (metrica.selecionado) {
      const dataset = this.criarDatasetPorMetrica(metrica.id, dados);
      if (dataset) {
        datasets.push(dataset);
      }
    }
  });

  this.chartData = {
    labels: labels,
    datasets: datasets
  };

  this.chartType = 'line';
  this.atualizarOpcoesGrafico();

  setTimeout(() => {
    if (this.chart) {
      this.chart.update();
    }
  }, 50);
}

// Criar dataset específico por métrica
private criarDatasetPorMetrica(metricaId: string, dados: any): ChartDataset<'line'> | null {
  const configMetricas: { [key: string]: { 
    label: string, 
    borderColor: string, 
    backgroundColor: string,
    extrator: (item: any) => number 
  }} = {
    'mediaGeral': {
      label: 'Média Geral',
      borderColor: '#6a9c89',
      backgroundColor: 'rgba(106, 156, 137, 0.2)',
      extrator: (item: any) => item.media
    },
    'mediaRestaurante': {
      label: 'Média Restaurante',
      borderColor: '#1A5653',
      backgroundColor: 'rgba(26, 86, 83, 0.2)',
      extrator: (item: any) => item.media // Adaptar conforme estrutura do backend
    },
    'mediaPratos': {
      label: 'Média Pratos',
      borderColor: '#d97746',
      backgroundColor: 'rgba(217, 119, 70, 0.2)',
      extrator: (item: any) => item.media_pratos || 0 // Precisará adicionar no backend
    },
    'totalAvaliacoes': {
      label: 'Total de Avaliações',
      borderColor: '#8E3200',
      backgroundColor: 'rgba(142, 50, 0, 0.2)',
      extrator: (item: any) => item.total
    },
    'percentualPositivas': {
      label: '% Avaliações Positivas',
      borderColor: '#4C9447',
      backgroundColor: 'rgba(76, 148, 71, 0.2)',
      extrator: (item: any) => {
        // Calcular percentual de avaliações >= 4
        const positivas = item.distribuicao?.['4'] + item.distribuicao?.['5'] || 0;
        return item.total > 0 ? (positivas / item.total) * 100 : 0;
      }
    }
  };

  const config = configMetricas[metricaId];
  if (!config) return null;

  return {
    label: config.label,
    data: dados.avaliacoes_por_data.map(config.extrator),
    borderColor: config.borderColor,
    backgroundColor: config.backgroundColor,
    borderWidth: 2,
    fill: this.suavizarCurva,
    tension: this.suavizarCurva ? 0.4 : 0,
    pointBackgroundColor: '#FFFFFF',
    pointBorderColor: config.borderColor,
    pointBorderWidth: 2,
    pointRadius: 4,
    pointHoverRadius: 6
  };
}

// Método para comparar com período anterior
compararComPeriodoAnterior(): void {
  const dataFim = this.dateForm.value.end || new Date();
  const dataInicio = this.dateForm.value.start || new Date(new Date().setMonth(new Date().getMonth() - 3));
  
  // Calcular período anterior com a mesma duração
  const duracao = dataFim.getTime() - dataInicio.getTime();
  const periodoAnteriorFim = new Date(dataInicio.getTime() - 1);
  const periodoAnteriorInicio = new Date(periodoAnteriorFim.getTime() - duracao);
  
  // Buscar dados do período anterior
  this.avaliacaoService.buscarAnaliseNoPeriodo(
    this.restauranteID,
    periodoAnteriorInicio.toISOString(),
    periodoAnteriorFim.toISOString()
  ).subscribe({
    next: (dadosAnteriores: any) => {
      this.adicionarComparacaoAoGrafico(dadosAnteriores);
    },
    error: (err: any) => {
      console.error('Erro ao carregar dados de comparação:', err);
    }
  });
}

// Adicionar dados de comparação ao gráfico existente
private adicionarComparacaoAoGrafico(dadosAnteriores: any): void {
  if (!dadosAnteriores || !dadosAnteriores.avaliacoes_por_data) {
    return;
  }

  // Criar datasets de comparação (com estilo tracejado)
  this.metricasDisponiveis.forEach(metrica => {
    if (metrica.selecionado) {
      const dataset = this.criarDatasetPorMetrica(metrica.id, dadosAnteriores);
      if (dataset) {
        // Modificar estilo para indicar período anterior
        dataset.label = `${dataset.label} (Período Anterior)`;
        dataset.borderDash = [5, 5];
        dataset.borderWidth = 1.5;
        (dataset as any).borderOpacity = 0.6;
        
        this.chartData.datasets.push(dataset);
      }
    }
  });

  setTimeout(() => {
    if (this.chart) {
      this.chart.update();
    }
  }, 50);
}
}