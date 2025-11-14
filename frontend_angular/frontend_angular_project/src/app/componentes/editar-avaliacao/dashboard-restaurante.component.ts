import { Component, OnInit } from '@angular/core';
import { RestauranteService } from '../../services/restaurante.service';
import { ActivatedRoute, Router } from '@angular/router';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { restauranteModel } from '../../model/restaurante.model';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-dashboard-restaurante',
  templateUrl: './dashboard-restaurante.component.html',
  styleUrls: ['./dashboard-restaurante.component.css']
})
export class DashboardRestauranteComponent implements OnInit {
  restaurante!: restauranteModel;
  mediaAval = 0;
  totalAval = 0;
  avaliacoes: Array<{
    clienteNome: string;
    Nota: number;
    Comentario: string;
    data_avaliacao: string;
    sentimento_auto?: string;
  }> = [];
  
  sentimentStats: any = {};
  hasEnoughReviews: boolean = false;
  processandoAnalise: boolean = false;
  
  filtroTexto = '';
  filtroEstrela = 0;
  filtroDataInicio: string = '';
  filtroDataFim: string = '';

  avaliacoesFiltradas: typeof this.avaliacoes = [];
  avaliacoesPorMes: { [key: string]: any } = {};
  
  hoje: string = new Date().toISOString().slice(0,10);
  isOwner = false;

  constructor(
    private svc: RestauranteService,
    private avalSvc: AvaliacaoService,
    private route: ActivatedRoute,
    private auth: AutenticacaoService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    const idStr = this.route.snapshot.paramMap.get('id');
    if (!idStr) {
      this.toastr.error('ID do restaurante não informado!');
      this.router.navigate(['/menu']);
      return;
    }
    const id = +idStr;
    if (!id || id <= 0) {
      this.toastr.error('ID do restaurante inválido!');
      this.router.navigate(['/menu']);
      return;
    }
    
    // Verificar estado salvo no localStorage
    const savedState = localStorage.getItem(`rest_${id}_processed`);
    if (savedState === 'true') {
      this.hasEnoughReviews = true;
    }
    
    this.svc.buscarPorId(id).subscribe({
      next: (r: any) => {
        this.restaurante = r;
        this.mediaAval = r.mediaAvaliacoes;
        this.totalAval = r.totalAvaliacoes;
        this.isOwner = this.auth.usuarioAtual?.tipo === 'restaurante' &&
                    Number(this.auth.usuarioAtual?.sub) === r.ID;
                    
        // Carregar métricas de sentimento
        this.carregarMetricasSentimento(id);
        
        // Carregar avaliações usando o método separado
        this.carregarAvaliacoes(id);
        
        // Verificar processamento
        this.verificarAvaliacoesProcessadas(id);
      },
      error: (err) => {
        this.toastr.error('Erro ao carregar dados do restaurante');
        console.error(err);
      }
    });
  }
  
  verificarAvaliacoesProcessadas(restauranteId: number): void {
    this.avalSvc.getMetricasSentimento(restauranteId).subscribe({
      next: (metricas) => {
        const totalSentimentos = (metricas.positivo || 0) + (metricas.neutro || 0) + (metricas.negativo || 0);
        this.hasEnoughReviews = totalSentimentos >= 3;
        
        this.sentimentStats = metricas;
        
        localStorage.setItem(`rest_${restauranteId}_processed`, this.hasEnoughReviews ? 'true' : 'false');
      },
      error: (err) => {
        console.error('Erro ao verificar avaliações processadas:', err);
        const savedState = localStorage.getItem(`rest_${restauranteId}_processed`);
        this.hasEnoughReviews = savedState === 'true' || this.avaliacoes.length >= 3;
      }
    });
  }
    
  carregarMetricasSentimento(restauranteId: number): void {
    this.avalSvc.getMetricasSentimento(restauranteId).subscribe({
      next: (metricas) => {
        this.sentimentStats = metricas;
      },
      error: (err) => {
        console.error('Erro ao carregar métricas de sentimento:', err);
        this.sentimentStats = { 
          positivo: 0, 
          neutro: 0, 
          negativo: 0,
          percentuais: { positivo: 0, neutro: 0, negativo: 0 }
        };
      }
    });
  }

  private parseDate(s: string): Date {
    if (!s) return new Date(NaN);
    const iso = s.includes('T') ? s : s.replace(' ', 'T');
    return new Date(iso);
  }

  private endOfDay(date: Date): Date {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  }
  
  filtrarPorNota(nota: number) {
    this.filtroEstrela = nota || 0;
    this.filtrarAvaliacoes();
  }

  formatarData(data: string): string {
    const d = this.parseDate(data);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString();
  }

  filtrarAvaliacoes() {
    const inicio: Date | null = this.filtroDataInicio
      ? new Date(`${this.filtroDataInicio}T00:00:00`)
      : null;

    const fim: Date | null = this.filtroDataFim
      ? this.endOfDay(new Date(`${this.filtroDataFim}T00:00:00`))
      : null;

    this.avaliacoesFiltradas = this.avaliacoes.filter((a) => {
      const dataAval = this.parseDate(a.data_avaliacao);
      // Texto
      const textoOk =
        !this.filtroTexto ||
        a.Comentario?.toLowerCase().includes(this.filtroTexto.toLowerCase()) ||
        a.clienteNome?.toLowerCase().includes(this.filtroTexto.toLowerCase());

      // Nota
      const estrelaOk =
        !this.filtroEstrela || Math.round(a.Nota) === this.filtroEstrela;

      // Datas (aplica só se selecionadas)
      const dataOk =
        (!inicio || (dataAval && dataAval >= inicio)) &&
        (!fim || (dataAval && dataAval <= fim));

      return textoOk && estrelaOk && dataOk;
    });
  }

  limparFiltros() {
    this.filtroTexto = '';
    this.filtroEstrela = 0;
    this.filtroDataInicio = '';
    this.filtroDataFim = '';
    this.avaliacoesFiltradas = [...this.avaliacoes];
  }
  
  downloadInsights() {
    if (!this.restaurante) {
      this.toastr.error('Restaurante não disponível');
      return;
    }
    
    this.avalSvc.downloadInsightsReport(this.restaurante.ID)
      .subscribe({
        next: (blob: Blob) => {
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `insights-${this.restaurante.Nome}-${new Date().toISOString().split('T')[0]}.pdf`;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          a.remove();
          this.toastr.success('Relatório baixado com sucesso!');
        },
        error: (err: any) => {
          console.error('Erro ao baixar relatório', err);
          this.toastr.error('Não foi possível gerar o relatório. Tente novamente mais tarde.');
        }
      });
  }

  processarAvaliacoes() {
    // Mostrar feedback enquanto processa
    this.processandoAnalise = true;
    
    this.avalSvc.processarAvaliacoes(this.restaurante.ID).subscribe({
      next: (res) => {
        this.processandoAnalise = false;
        
        if (res.processadas > 0) {
          this.toastr.success(`${res.processadas} avaliações processadas com sucesso!`);
        } else {
          this.toastr.info('Todas as avaliações já foram processadas anteriormente.');
        }
        
        // Recarregar os dados para mostrar a análise atualizada
        this.carregarMetricasSentimento(this.restaurante.ID);
        this.verificarAvaliacoesProcessadas(this.restaurante.ID);
        this.carregarAvaliacoes(this.restaurante.ID);
      },
      error: (err) => {
        this.processandoAnalise = false;
        this.toastr.error('Erro ao processar avaliações.');
        console.error(err);
      }
    });
  }

  private carregarAvaliacoes(id: number): void {
    this.avalSvc.buscarPorRestaurante(id).subscribe({
      next: (list: any[]) => {
        console.log('Avaliações recarregadas:', list);

        this.avaliacoes = list.map((a: any) => ({
          clienteNome: a.Nome_Cliente || a.clienteNome || a.nome_cliente || 'Usuário Anônimo',
          Nota: a.Nota,
          Comentario: a.Comentario,
          data_avaliacao: a.data_avaliacao,
          sentimento_auto: a.sentimento_auto
        }));

        // Processar avaliacoes por mês
        this.processarAvaliacoesPorMes();

        this.avaliacoesFiltradas = [...this.avaliacoes];
        this.filtrarAvaliacoes();
      },
      error: (err) => {
        console.error('Erro ao recarregar avaliações:', err);
        this.toastr.error('Erro ao carregar avaliações');
      }
    });
  }
  
  private processarAvaliacoesPorMes(): void {
    const avaliacoesPorMes: { [key: string]: {
      total: number;
      soma: number;
      avaliacoes: any[];
      nome?: string;  // Adicionar como opcional
      media?: number; // Adicionar como opcional
    }} = {};
    // Inicializar os últimos 6 meses
    const hoje = new Date();
    const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    
    for (let i = 5; i >= 0; i--) {
      const data = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
      const mesChave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
      const nomeMes = `${meses[data.getMonth()]}/${String(data.getFullYear()).slice(2)}`;
      
      avaliacoesPorMes[mesChave] = {
        total: 0,
        soma: 0,
        avaliacoes: [],
        nome: nomeMes
      };
    }
    
    // Agrupar avaliações por mês
    for (const aval of this.avaliacoes) {
      if (aval.data_avaliacao) {
        const data = new Date(aval.data_avaliacao);
        const mesChave = `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`;
        
        if (avaliacoesPorMes[mesChave]) {
          avaliacoesPorMes[mesChave].total += 1;
          avaliacoesPorMes[mesChave].soma += aval.Nota;
          avaliacoesPorMes[mesChave].avaliacoes.push(aval);
        }
      }
    }
    
    // Calcular médias
    Object.keys(avaliacoesPorMes).forEach(key => {
      const mes = avaliacoesPorMes[key];
      mes.media = mes.total > 0 ? mes.soma / mes.total : 0;
    });
    
    this.avaliacoesPorMes = avaliacoesPorMes;
  }
    
  renderStars(n: number): string {
    const full = '★'.repeat(Math.round(n));
    const empty = '☆'.repeat(5 - Math.round(n));
    return full + empty;
  }

  toggleFiltroEstrela(s: number) {
    this.filtroEstrela = this.filtroEstrela === s ? 0 : s;
    this.filtrarAvaliacoes();
  }

  getImageUrl(imageUrl: string | null | undefined): string {
    if (!imageUrl) {
      return 'assets/images/default-restaurant.png';
    }
    
    if (imageUrl.startsWith('http://') || imageUrl.startsWith('https://')) {
      return imageUrl;
    }
    
    return 'http://localhost:5000' + imageUrl;
  }
  
  // Novas métricas para o dashboard
  getAvaliacoesMesAtual(): number {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    
    return this.avaliacoesPorMes[mesAtual]?.total || 0;
  }
  
  getVariacaoMediaMensal(): string {
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    const mesAnterior = `${hoje.getFullYear()}-${String(hoje.getMonth()).padStart(2, '0')}`;
    
    const mediaAtual = this.avaliacoesPorMes[mesAtual]?.media || 0;
    const mediaAnterior = this.avaliacoesPorMes[mesAnterior]?.media || 0;
    
    if (mediaAnterior === 0) return '0';
    
    const variacao = ((mediaAtual - mediaAnterior) / mediaAnterior) * 100;
    return variacao.toFixed(1);
  }
}