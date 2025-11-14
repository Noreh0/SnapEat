import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { DenunciaService } from '../../services/denuncia.service';
import { Denuncia } from '../../model/denuncia.model';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { RestauranteService } from '../../services/restaurante.service';
import { restauranteModel } from '../../model/restaurante.model';
import { ToastrService } from 'ngx-toastr';
import { ModalConfirmacaoData } from '../shared/modal-confirmacao/modal-confirmacao.component';

// Interface expandida localmente para o componente
interface DenunciaExpandida extends Denuncia {
  avaliacao?: any;
  analise_ia?: any;
  nomeCliente?: string;
  comentarioAvaliacao?: string;
  notaAvaliacao?: number;
  analiseIA?: any;
  carregandoAnalise?: boolean;
}

@Component({
  selector: 'app-denuncias-restaurante',
  templateUrl: './denuncias-restaurante.component.html',
  styleUrls: ['./denuncias-restaurante.component.css']
})
export class DenunciasRestauranteComponent implements OnInit {
  restauranteId!: number;
  restaurante?: restauranteModel;
  indicadores: any = {};
  pendentes: DenunciaExpandida[] = []; // Usando a interface expandida
  carregando = false;
  denunciasFiltradas: DenunciaExpandida[] = []; // Adicionar esta propriedade
  filtroStatus: string = 'todas'; // Adicionar esta propriedade

  // Propriedades do modal de confirmação
  mostrarModal = false;
  dadosModal: ModalConfirmacaoData = {
    titulo: '',
    mensagem: '',
    tipo: 'default'
  };
  acaoPendente: (() => void) | null = null;
  

  constructor(
    private route: ActivatedRoute,
    private denunciaSvc: DenunciaService,
    private avaliacaoSvc: AvaliacaoService,
    private restauranteSvc: RestauranteService,
    private toastr: ToastrService // Adicionar esta injeção
  ) {}

  ngOnInit(): void {
    this.restauranteId = +this.route.snapshot.paramMap.get('id')!;
    this.load();
    this.restauranteSvc.buscarPorId(this.restauranteId).subscribe(data => {
      this.restaurante = data;
    });
  }

  // Implementar o método aplicarFiltro
  aplicarFiltro(): void {
    if (this.filtroStatus === 'todas') {
      this.denunciasFiltradas = this.pendentes;
    } else {
      this.denunciasFiltradas = this.pendentes.filter(
        d => d.status === this.filtroStatus
      );
    }
  }

  load() {
    this.carregando = true;
    this.denunciaSvc.indicadores(this.restauranteId).subscribe(ind => this.indicadores = ind);
    
    // Buscar denúncias pendentes
    this.denunciaSvc.pendentes(this.restauranteId).subscribe({
      next: (lst) => {
        // Para cada denúncia, buscar a avaliação relacionada
        const denuncias = lst as DenunciaExpandida[]; 
        const promises = denuncias.map(d => 
          new Promise<void>((resolve) => {
            this.avaliacaoSvc.buscarPorId(d.avaliacao_id).subscribe({
              next: (avaliacao) => {
                d.avaliacao = avaliacao;
                resolve();
              },
              error: () => {
                d.avaliacao = { 
                  Comentario: 'Avaliação não disponível', 
                  Nome_Cliente: 'Desconhecido'
                };
                resolve();
              }
            });
            
            // Use o método corrigido para analisar a denúncia
            this.denunciaSvc.analisarDenuncia(d.ID!).subscribe({
              next: (analise) => {
                d.analise_ia = analise;
              },
              error: () => {} // Ignorar erros na análise
            });
          })
        );
        
        Promise.all(promises).then(() => {
          this.pendentes = denuncias;
          this.denunciasFiltradas = denuncias; // Inicializar também as denúncias filtradas
          this.carregando = false;
        });
      },
      error: (err) => {
        console.error('Erro ao carregar denúncias:', err);
        this.toastr.error('Erro ao carregar denúncias');
        this.carregando = false;
      }
    });
  }

  // No componente denuncias-restaurante.component.ts
  aprovarDenuncia(denuncia: DenunciaExpandida): void {
    if (!denuncia.ID) return;
    
    const justificativa = denuncia.analise_ia?.justificativa || 
                          'Conteúdo inadequado detectado';
    
    this.denunciaSvc.tomarDecisao(denuncia.ID, 'aprovar', justificativa).subscribe({
      next: (resultado) => {
        console.log('Denúncia aprovada com sucesso:', resultado);
        this.toastr.success('Denúncia aprovada! A avaliação foi ocultada.');
        denuncia.status = 'ACEITA';  // Use o mesmo valor do backend
        this.aplicarFiltro();
      },
      error: (err) => {
        console.error('Erro ao aprovar denúncia:', err);
        if (err.status === 403) {
          this.toastr.error('Sem permissão para aprovar esta denúncia');
        } else {
          this.toastr.error('Erro ao aprovar denúncia');
        }
      }
    });
  }

  decidir(d: DenunciaExpandida, acao: 'aceitar'|'recusar') {
    const nomeCliente = d.avaliacao?.Nome_Cliente || 'Cliente';
    
    if (acao === 'aceitar') {
      this.dadosModal = {
        titulo: 'Aceitar Denúncia',
        mensagem: `Tem certeza que deseja <strong>aceitar</strong> esta denúncia?<br><br>
                   <strong>Avaliação de:</strong> ${nomeCliente}<br>
                   <strong>Comentário:</strong> "${d.avaliacao?.Comentario || 'N/A'}"<br><br>
                   ⚠️ A avaliação será <strong>ocultada permanentemente</strong> do restaurante.`,
        textoBotaoConfirmar: 'Aceitar e Ocultar',
        textoBotaoCancelar: 'Cancelar',
        tipo: 'aceitar',
        icone: 'fas fa-check-circle'
      };
    } else {
      this.dadosModal = {
        titulo: 'Recusar Denúncia',
        mensagem: `Tem certeza que deseja <strong>recusar</strong> esta denúncia?<br><br>
                   <strong>Motivo da denúncia:</strong> ${d.motivo}<br><br>
                   ℹ️ A avaliação permanecerá visível no restaurante.`,
        textoBotaoConfirmar: 'Recusar Denúncia',
        textoBotaoCancelar: 'Cancelar',
        tipo: 'recusar',
        icone: 'fas fa-times-circle'
      };
    }

    this.acaoPendente = () => {
      this.denunciaSvc.decidir(d.ID!, acao).subscribe({
        next: () => {
          this.toastr.success(`Denúncia ${acao === 'aceitar' ? 'aceita' : 'recusada'} com sucesso`);
          this.load();
        },
        error: (err) => {
          console.error(`Erro ao ${acao} denúncia:`, err);
          this.toastr.error(`Erro ao ${acao} denúncia`);
        }
      });
    };

    this.mostrarModal = true;
  }

  // Adicionar este método à classe
  processarTodas() {
    this.dadosModal = {
      titulo: 'Processar com Inteligência Artificial',
      mensagem: `Deseja processar <strong>${this.indicadores.pendentes} denúncias pendentes</strong> com IA?<br><br>
                 🤖 <strong>Como funciona:</strong><br>
                 • A IA analisará cada denúncia automaticamente<br>
                 • Denúncias com conteúdo claramente ofensivo serão aceitas<br>
                 • Casos duvidosos permanecerão para revisão manual<br><br>
                 ⚡ Este processo pode levar alguns minutos.`,
      textoBotaoConfirmar: 'Processar com IA',
      textoBotaoCancelar: 'Cancelar',
      tipo: 'processar',
      icone: 'fas fa-robot'
    };

    this.acaoPendente = () => {
      this.executarProcessamento();
    };

    this.mostrarModal = true;
  }

  private executarProcessamento() {
    this.carregando = true;
    
    // Mostrar indicador de carregamento
    const loadingMessage = document.createElement('div');
    loadingMessage.className = 'loading-overlay';
    loadingMessage.innerHTML = `
      <div class="loading-spinner"></div>
      <p>Processando ${this.indicadores.pendentes} denúncias...</p>
    `;
    document.body.appendChild(loadingMessage);
    
    this.denunciaSvc.processarPendentesRestaurante(this.restauranteId).subscribe({
      next: (resultado) => {
        document.body.removeChild(loadingMessage);
        this.toastr.success(`Processamento concluído! ${resultado.aceitas} denúncias aceitas automaticamente. ${resultado.para_revisao} denúncias requerem revisão manual.`);
        this.load(); // Recarregar dados
      },
      error: (err) => {
        document.body.removeChild(loadingMessage);
        console.error('Erro ao processar denúncias:', err);
        this.toastr.error('Ocorreu um erro ao processar as denúncias: ' + (err.error?.message || 'Tente novamente mais tarde.'));
        this.carregando = false;
      }
    });
  }

  // Métodos auxiliares para exibição
  getStatusClass(status: string): string {
    switch(status) {
      case 'PENDENTE': return 'status-pendente';
      case 'ACEITA': return 'status-aceita';
      case 'RECUSADA': return 'status-recusada';
      default: return '';
    }
  }

  getStatusLabel(status: string): string {
    switch(status) {
      case 'PENDENTE': return 'Pendente';
      case 'ACEITA': return 'Aceita';
      case 'RECUSADA': return 'Recusada';
      default: return status || 'Desconhecido';
    }
  }

  // Métodos do modal de confirmação
  onModalConfirmado(): void {
    if (this.acaoPendente) {
      this.acaoPendente();
      this.acaoPendente = null;
    }
  }

  onModalCancelado(): void {
    this.acaoPendente = null;
  }

  onModalFechado(): void {
    this.mostrarModal = false;
    this.acaoPendente = null;
  }
}