// grafico-comparacao-pratos.component.ts
import { Component, Input, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, FormArray } from '@angular/forms';
import { ChartData, ChartType } from 'chart.js';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { PratoService } from '../../services/prato.service';
import { ThemeService } from '../../services/theme.service';
import { debounceTime, distinctUntilChanged, Subscription } from 'rxjs';

@Component({
  selector: 'app-grafico-comparacao-pratos',
  templateUrl: './grafico-comparacao-pratos.component.html',
  styleUrls: ['./grafico-comparacao-pratos.component.css']
})
export class GraficoComparacaoPratosComponent implements OnInit, OnDestroy {
  @Input() restauranteId!: number;

  filtroForm: FormGroup;
  pratosDisponiveis: any[] = [];
  private subscription: Subscription = new Subscription();
  
  // Cores para modo claro
  private coresClaro = ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF'];
  
  // Cores para modo escuro
  private coresEscuro = ['#FF8A9B', '#4FC3F7', '#FFE082', '#64B5F6', '#BA68C8'];
  
  chartData: ChartData<'line'> = {
    labels: [],
    datasets: []
  };

  chartOptions: any = this.obterOpcoesGrafico();

  chartType: ChartType = 'line';

  metricas = [
    { value: 'media', label: 'Média' },
    { value: 'total', label: 'Total de Avaliações' },
    { value: 'evolucao', label: 'Evolução' }
  ];

  dadosPratos: any[] = [];

  // Getter para cores baseado no tema
  get cores(): string[] {
    return this.themeService.isDarkMode() ? this.coresEscuro : this.coresClaro;
  }

  constructor(
    private fb: FormBuilder,
    private avaliacaoService: AvaliacaoService,
    private pratoService: PratoService,
    private themeService: ThemeService
  ) {
    // Inicializar datas corretamente
    const hoje = new Date();
    const tressMesesAtras = new Date();
    tressMesesAtras.setMonth(hoje.getMonth() - 3);

    this.filtroForm = this.fb.group({
      dataInicio: [this.formatarDataParaInput(tressMesesAtras)],
      dataFim: [this.formatarDataParaInput(hoje)],
      pratosIds: this.fb.array([]),
      metrica: ['media']
    });
    
    // Adicionar listeners para mudanças no form com debounce
    this.subscription.add(
      this.filtroForm.valueChanges
        .pipe(
          debounceTime(500), // Aguarda 500ms após a última mudança
          distinctUntilChanged() // Só executa se os valores realmente mudaram
        )
        .subscribe(() => {
          console.log('📝 Form alterado, carregando dados...');
          if (this.pratosIds.length > 0) {
            this.carregarDados();
          }
        })
    );
    
    // Escutar mudanças de tema
    this.subscription.add(
      this.themeService.theme$.subscribe(() => {
        console.log('🎨 Tema alterado, atualizando gráfico...');
        this.atualizarTemaGrafico();
        if (this.dadosPratos.length > 0) {
          this.processarDados({ pratos: this.dadosPratos });
        }
      })
    );
  }

  ngOnDestroy(): void {
    if (this.subscription) {
      this.subscription.unsubscribe();
      console.log('🧹 Subscriptions do gráfico de comparação limpiadas');
    }
  }

  private formatarDataParaInput(data: Date): string {
    // Formato YYYY-MM-DD para input type="date"
    return data.toISOString().split('T')[0];
  }

  private formatarDataParaAPI(dataString: string): string {
    // Converter string do input para ISO string para API
    return new Date(dataString + 'T00:00:00').toISOString();
  }

  ngOnInit(): void {
    // Debug: verificar se o restauranteId foi passado
    if (!this.restauranteId) {
      console.error('❌ restauranteId não foi fornecido para o gráfico de comparação de pratos');
      return;
    }
    
    console.log('🚀 Inicializando gráfico de comparação de pratos para restaurante:', this.restauranteId);
    this.carregarPratosDisponiveis();
    
    // ✅ NOVO: Adicionar verificação periódica para dados atualizados
    setInterval(() => {
      if (this.pratosIds.length > 0) {
        console.log('🔄 Verificação automática de atualizações...');
        this.carregarDados();
      }
    }, 60000); // Verificar a cada 60 segundos
  }

  get pratosIds(): FormArray {
    return this.filtroForm.get('pratosIds') as FormArray;
  }

  carregarPratosDisponiveis(): void {
    console.log('🍽️ Carregando pratos para restaurante:', this.restauranteId);
    
    this.pratoService.listarPorRestaurante(this.restauranteId).subscribe({
      next: (pratos) => {
        console.log('✅ Pratos carregados:', pratos);
        console.log('📊 Quantidade de pratos:', pratos.length);
        
        this.pratosDisponiveis = pratos;
        
        // ✅ NOVO: Verificar se os pratos têm avaliações antes de selecioná-los automaticamente
        if (pratos.length > 0) {
          // Verificar quais pratos têm avaliações
          this.verificarAvaliacoesPratos(pratos).then((pratosComAvaliacoes) => {
            console.log('📊 Pratos com avaliações:', pratosComAvaliacoes.map(p => p.Nome));
            
            if (pratosComAvaliacoes.length > 0) {
              const pratosParaSelecionar = pratosComAvaliacoes.slice(0, Math.min(3, pratosComAvaliacoes.length));
              console.log('🎯 Selecionando automaticamente pratos com avaliações:', pratosParaSelecionar.map(p => p.Nome));
              
              pratosParaSelecionar.forEach((prato: any) => {
                this.pratosIds.push(this.fb.control(prato.ID));
              });
              
              console.log('📋 IDs dos pratos selecionados:', this.pratosIds.value);
              console.log('🔄 Iniciando carregamento de dados...');
              this.carregarDados();
            } else {
              console.warn('⚠️ Nenhum prato com avaliações encontrado');
              console.log('💡 Dica: Adicione algumas avaliações de pratos para visualizar o gráfico');
            }
          });
        } else {
          console.warn('⚠️ Nenhum prato encontrado para o restaurante');
        }
      },
      error: (erro) => {
        console.error('❌ Erro ao carregar pratos:', erro);
        console.error('🔍 Detalhes do erro:', {
          status: erro.status,
          message: erro.message,
          error: erro.error
        });
      }
    });
  }

  // ✅ NOVO: Método para verificar quais pratos têm avaliações
  private async verificarAvaliacoesPratos(pratos: any[]): Promise<any[]> {
    const pratosComAvaliacoes: any[] = [];
    
    for (const prato of pratos) {
      try {
        // Fazer uma verificação rápida se o prato tem avaliações
        const temAvaliacoes = await this.verificarSeTemAvaliacoes(prato.ID);
        if (temAvaliacoes) {
          pratosComAvaliacoes.push(prato);
        }
      } catch (error) {
        console.warn(`⚠️ Erro ao verificar avaliações do prato ${prato.Nome}:`, error);
      }
    }
    
    return pratosComAvaliacoes;
  }

  // ✅ NOVO: Verificar se um prato específico tem avaliações
  private verificarSeTemAvaliacoes(pratoId: number): Promise<boolean> {
    return new Promise((resolve) => {
      // Fazer uma busca rápida para ver se há avaliações deste prato
      const dataInicioTeste = new Date();
      dataInicioTeste.setFullYear(dataInicioTeste.getFullYear() - 1); // Último ano
      const dataFimTeste = new Date();
      
      this.avaliacaoService.buscarComparacaoPratos(
        this.restauranteId,
        dataInicioTeste.toISOString(),
        dataFimTeste.toISOString(),
        pratoId.toString(),
        'media'
      ).subscribe({
        next: (dados) => {
          const temDados = dados && dados.pratos && dados.pratos.length > 0 && 
                          dados.pratos[0].serie_temporal && dados.pratos[0].serie_temporal.length > 0;
          resolve(temDados);
        },
        error: () => {
          resolve(false);
        }
      });
    });
  }

  togglePrato(pratoId: number): void {
    const index = this.pratosIds.value.indexOf(pratoId);
    
    if (index > -1) {
      this.pratosIds.removeAt(index);
    } else {
      if (this.pratosIds.length < 5) {
        this.pratosIds.push(this.fb.control(pratoId));
      } else {
        alert('Você pode comparar no máximo 5 pratos por vez');
        return;
      }
    }
    
    if (this.pratosIds.length > 0) {
      this.carregarDados();
    }
  }

  isPratoSelecionado(pratoId: number): boolean {
    return this.pratosIds.value.includes(pratoId);
  }

  carregarDados(): void {
    const valores = this.filtroForm.value;
    
    console.log('🔄 Carregando dados com filtros:', valores);
    console.log('🏪 RestauranteId:', this.restauranteId);
    console.log('📋 Pratos selecionados:', valores.pratosIds);
    console.log('📅 Período:', valores.dataInicio, 'até', valores.dataFim);
    
    if (!this.restauranteId) {
      console.error('❌ RestauranteId não definido');
      return;
    }
    
    if (!valores.pratosIds || valores.pratosIds.length === 0) {
      console.warn('⚠️ Nenhum prato selecionado');
      this.chartData = { labels: [], datasets: [] };
      return;
    }
    
    // Verificar se as datas são válidas
    if (!valores.dataInicio || !valores.dataFim) {
      console.warn('⚠️ Datas não definidas, aguardando...');
      return;
    }
    
    // ✅ NOVO: Validar se data início não é posterior à data fim
    if (new Date(valores.dataInicio) > new Date(valores.dataFim)) {
      console.warn('⚠️ Data início não pode ser posterior à data fim');
      alert('Data inicial não pode ser posterior à data final');
      return;
    }
    
    try {
      const dataInicioFormatada = this.formatarDataParaAPI(valores.dataInicio);
      const dataFimFormatada = this.formatarDataParaAPI(valores.dataFim);
      const idsPratos = valores.pratosIds.join(',');
      
      console.log('📅 Dados formatados para API:', {
        restaurante: this.restauranteId,
        inicio: dataInicioFormatada,
        fim: dataFimFormatada,
        pratos: idsPratos,
        metrica: valores.metrica
      });
      
      console.log('🚀 Iniciando requisição para API...');
      
      this.avaliacaoService.buscarComparacaoPratos(
        this.restauranteId,
        dataInicioFormatada,
        dataFimFormatada,
        idsPratos,
        valores.metrica
      ).subscribe({
        next: (dados) => {
          console.log('✅ Dados recebidos da API:', dados);
          console.log('🔍 Tipo de dados:', typeof dados);
          console.log('📊 Estrutura dos dados:', JSON.stringify(dados, null, 2));
          
          if (dados && dados.pratos) {
            console.log('📈 Número de pratos nos dados:', dados.pratos.length);
            
            // ✅ NOVO: Verificar se há dados reais
            const temDados = dados.pratos.some((prato: any) => 
              prato.serie_temporal && prato.serie_temporal.length > 0
            );
            
            if (!temDados) {
              console.warn('⚠️ Nenhuma avaliação encontrada para os pratos no período selecionado');
              console.log('💡 Sugestão: Verifique se existem avaliações de pratos neste período ou amplie o período de busca');
              this.chartData = { labels: [], datasets: [] };
              // Exibir mensagem para o usuário
              alert('Nenhuma avaliação encontrada para os pratos selecionados no período. Tente ampliar o período de busca.');
            } else {
              this.processarDados(dados);
            }
          } else {
            console.warn('⚠️ Dados recebidos não possuem estrutura esperada');
            console.warn('📋 Estrutura esperada: { pratos: [...] }');
            this.chartData = { labels: [], datasets: [] };
          }
        },
        error: (erro) => {
          console.error('❌ Erro ao carregar dados:', erro);
          console.error('🔍 Detalhes do erro:', {
            status: erro.status,
            message: erro.message,
            error: erro.error
          });
          
          // ✅ NOVO: Mensagem mais específica baseada no tipo de erro
          if (erro.status === 404) {
            console.warn('🔍 Endpoint não encontrado - verifique se o backend está atualizado');
            alert('Erro: Funcionalidade não disponível no backend. Contate o administrador.');
          } else if (erro.status === 500) {
            console.warn('🔧 Erro interno do servidor - verifique os logs do backend');
            alert('Erro interno do servidor. Verifique se há dados suficientes para o período.');
          } else {
            alert('Erro ao carregar dados do gráfico. Tente novamente.');
          }
          
          this.chartData = { labels: [], datasets: [] };
        },
        complete: () => {
          console.log('🏁 Requisição completada');
        }
      });
    } catch (error) {
      console.error('❌ Erro no formato das datas:', error);
    }
  }

  processarDados(dados: any): void {
    console.log('🔄 Iniciando processamento dos dados:', dados);
    
    if (!dados || !dados.pratos) {
      console.warn('⚠️ Dados inválidos ou sem pratos:', dados);
      this.chartData = { labels: [], datasets: [] };
      return;
    }
    
    if (dados.pratos.length === 0) {
      console.warn('⚠️ Array de pratos vazio');
      this.chartData = { labels: [], datasets: [] };
      return;
    }

    console.log('📊 Processando', dados.pratos.length, 'pratos');
    this.dadosPratos = dados.pratos;

    // Extrair todas as datas únicas
    const datasSet = new Set<string>();
    dados.pratos.forEach((prato: any, index: number) => {
      console.log(`📈 Prato ${index + 1}:`, prato.prato_nome, 'com', prato.serie_temporal?.length || 0, 'pontos temporais');
      
      if (prato.serie_temporal && Array.isArray(prato.serie_temporal)) {
        prato.serie_temporal.forEach((ponto: any) => {
          if (ponto.data) {
            datasSet.add(ponto.data);
          }
        });
      }
    });
    
    const datas = Array.from(datasSet).sort();
    console.log('📅 Datas únicas extraídas:', datas);

    const datasets: any[] = [];

    // Criar dataset para cada prato
    dados.pratos.forEach((prato: any, index: number) => {
      const cor = this.cores[index % this.cores.length];
      
      const dataPoints = datas.map(data => {
        const ponto = prato.serie_temporal?.find((p: any) => p.data === data);
        return ponto ? ponto.media : null;
      });
      
      console.log(`🎨 Dataset para ${prato.prato_nome}:`, {
        cor,
        pontos: dataPoints
      });
      
      datasets.push({
        label: prato.prato_nome,
        data: dataPoints,
        borderColor: cor,
        backgroundColor: `${cor}33`,
        borderWidth: 2,
        fill: false,
        tension: 0.4,
        pointBackgroundColor: this.themeService.isDarkMode() ? '#2d2d2d' : '#FFFFFF',
        pointBorderColor: cor,
        pointBorderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
        spanGaps: true
      });
    });

    console.log('📊 Datasets criados:', datasets.length);
    console.log('📈 Chart data final:', { labels: datas, datasets });

    this.chartData = {
      labels: datas,
      datasets
    };
    
    console.log('✅ Processamento concluído, chartData atualizado');
  }

  obterInfoPrato(datasetIndex: number, dataIndex: number): string[] {
    if (!this.dadosPratos[datasetIndex]) return [];
    
    const prato = this.dadosPratos[datasetIndex];
    const ponto = prato.serie_temporal[dataIndex];
    
    if (!ponto) return [];
    
    return [
      `Total: ${ponto.total} avaliações`,
      `Mínimo: ${ponto.min}`,
      `Máximo: ${ponto.max}`,
      `Média Geral: ${prato.metricas.media_geral}`
    ];
  }

  aplicarFiltros(): void {
    this.carregarDados();
  }

  limparSelecao(): void {
    this.pratosIds.clear();
    this.chartData = { labels: [], datasets: [] };
  }

  private obterOpcoesGrafico(): any {
    const isDark = this.themeService?.isDarkMode() || false;
    const textColor = isDark ? '#ffffff' : '#333333';
    const gridColor = isDark ? '#404040' : '#e0e0e0';
    
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: textColor,
            usePointStyle: true,
            padding: 20
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
          titleColor: textColor,
          bodyColor: textColor,
          borderColor: isDark ? '#555555' : '#cccccc',
          borderWidth: 1,
          callbacks: {
            afterBody: (context: any) => {
              const dataIndex = context[0].dataIndex;
              const datasetIndex = context[0].datasetIndex;
              return this.obterInfoPrato(datasetIndex, dataIndex);
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
            text: 'Média de Avaliações',
            color: textColor
          },
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        },
        x: {
          title: {
            display: true,
            text: 'Data',
            color: textColor
          },
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        }
      }
    };
  }
  
  private atualizarTemaGrafico(): void {
    this.chartOptions = this.obterOpcoesGrafico();
    console.log('🎨 Opções do gráfico atualizadas para o tema:', this.themeService.currentTheme);
  }
}