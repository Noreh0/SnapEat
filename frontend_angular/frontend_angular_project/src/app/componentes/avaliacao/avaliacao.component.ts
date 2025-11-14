import { Component, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { trigger, state, style, transition, animate, keyframes } from '@angular/animations';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { ClienteService } from '../../services/cliente.service';
import { RestauranteService } from '../../services/restaurante.service';
import { DenunciaService } from '../../services/denuncia.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { restauranteModel } from '../../model/restaurante.model';

@Component({
  selector: 'app-avaliacao',
  templateUrl: './avaliacao.component.html',
  styleUrl: './avaliacao.component.css',
  animations: [
    // Animação de fade in com slide up
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(20px)' }),
        animate('400ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
      ])
    ]),
    
    // Animação de fade in simples
    trigger('fadeIn', [
      transition(':enter', [
        style({ opacity: 0 }),
        animate('300ms ease-in-out', style({ opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', style({ opacity: 0 }))
      ])
    ]),
    
    // Animação de zoom in para modal
    trigger('zoomIn', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.8)' }),
        animate('350ms cubic-bezier(0.34, 1.56, 0.64, 1)', 
          style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ]),
    
    // Animação para botões
    trigger('buttonHover', [
      state('normal', style({ transform: 'scale(1)' })),
      state('hover', style({ transform: 'scale(1.05)' })),
      transition('normal <=> hover', animate('200ms ease-in-out'))
    ]),
    
    // Animação para mensagens de feedback
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateX(100%)' }),
        animate('400ms cubic-bezier(0.25, 0.8, 0.25, 1)', 
          style({ opacity: 1, transform: 'translateX(0)' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in-out', 
          style({ opacity: 0, transform: 'translateX(100%)' }))
      ])
    ]),
    
    // Animação para carregamento de imagem
    trigger('imageLoad', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'scale(1)' }))
      ])
    ])
  ]
})
export class AvaliacaoComponent implements OnInit {
  @Input() Nome_Restaurante!: string;
  @Input() Nome_Cliente!: string;
  @Input() Email!: string;
  @Input() avaliacao!: AvaliacaoModel;
  @Input() EmailRestaurante!: string;
  @Input() ClienteComponent: boolean = false;
  
  // Estados de interação
  denunciando = false;
  motivoDenuncia = '';
  denunciaEnviada = false;
  imagemModalAberto = false;
  imagemSelecionada: string = '';
  
  // Estados de loading e erro
  carregandoRestaurante = false;
  carregandoCliente = false;
  erroCarregamento = false;
  excluindo = false;
  
  // Estados de feedback
  mostrarSucesso = false;
  mostrarErro = false;
  mensagemFeedback = '';
  constructor(
    private jwthelper: JwtHelperService,
    private service_restaurante: RestauranteService,
    private service_cliente: ClienteService,
    private service_avaliacao: AvaliacaoService,
    private route: ActivatedRoute,
    private denunciaSvc: DenunciaService
  ) {}

  id = this.route.snapshot.paramMap.get('id_cliente');
  ngOnInit(): void {
    this.carregarDadosAvaliacao();
  }

  private carregarDadosAvaliacao(): void {
    // Carregar dados do restaurante
    if (this.avaliacao.ID_Restaurante) {
      this.carregandoRestaurante = true;
      this.service_restaurante
        .buscarPorId(this.avaliacao.ID_Restaurante)
        .subscribe({
          next: (restaurante: restauranteModel) => {
            this.Nome_Restaurante = restaurante.Nome;
            this.EmailRestaurante = restaurante.email;
            this.carregandoRestaurante = false;
          },
          error: (err) => {
            console.error('Erro ao carregar restaurante:', err);
            this.erroCarregamento = true;
            this.carregandoRestaurante = false;
            this.mostrarMensagem('Erro ao carregar dados do restaurante', 'erro');
          }
        });
    }

    // Carregar dados do cliente
    if (this.avaliacao.ID_Cliente) {
      this.carregandoCliente = true;
      this.service_cliente
        .buscarPorId(this.avaliacao.ID_Cliente)
        .subscribe({
          next: (cliente) => {
            this.Nome_Cliente = cliente.Nome;
            this.Email = cliente.email;
            this.carregandoCliente = false;
          },
          error: (err) => {
            console.error('Erro ao carregar cliente:', err);
            this.erroCarregamento = true;
            this.carregandoCliente = false;
            this.mostrarMensagem('Erro ao carregar dados do cliente', 'erro');
          }
        });
    }
  }

  abrirImagemModal(imagemUrl: string): void {
    this.imagemSelecionada = imagemUrl;
    this.imagemModalAberto = true;
    document.body.style.overflow = 'hidden'; // Prevenir scroll da página
  }

  fecharImagemModal(): void {
    this.imagemModalAberto = false;
    this.imagemSelecionada = '';
    document.body.style.overflow = ''; // Restaurar scroll
  }

  larguraAvaliacao(): string {
    if (this.avaliacao.Comentario!.length >= 256) {
      return 'avaliacao-g';
    }
    return 'avaliacao-p';
  }
  get() {
    const token = localStorage.getItem('token');
    const decodetoken = this.jwthelper.decodeToken(token!);
    if (decodetoken == null) {
      return null;
    }
    const email = decodetoken.sub;
    return email;
  }
  // Método para mostrar mensagens de feedback
  private mostrarMensagem(mensagem: string, tipo: 'sucesso' | 'erro'): void {
    this.mensagemFeedback = mensagem;
    if (tipo === 'sucesso') {
      this.mostrarSucesso = true;
      this.mostrarErro = false;
    } else {
      this.mostrarErro = true;
      this.mostrarSucesso = false;
    }
    
    // Auto-ocultar após 4 segundos
    setTimeout(() => {
      this.ocultarMensagem();
    }, 4000);
  }

  private ocultarMensagem(): void {
    this.mostrarSucesso = false;
    this.mostrarErro = false;
    this.mensagemFeedback = '';
  }

  abrirDenuncia() {
    const motivo = prompt('Descreva o motivo da denúncia (mínimo 5 caracteres):');
    if (!motivo || motivo.trim().length < 5) {
      this.mostrarMensagem('Motivo da denúncia deve ter pelo menos 5 caracteres', 'erro');
      return;
    }
    
    this.denunciando = true;
    this.denunciaSvc.criar(this.avaliacao.ID!, motivo.trim()).subscribe({
      next: () => {
        this.denunciaEnviada = true;
        this.denunciando = false;
        this.mostrarMensagem('Denúncia enviada com sucesso!', 'sucesso');
      },
      error: err => {
        this.denunciando = false;
        const mensagem = err.error?.message || 'Erro ao enviar denúncia';
        this.mostrarMensagem(mensagem, 'erro');
      }
    });
  }

  excluirAvaliacao() {
    if (!confirm('Tem certeza que deseja excluir esta avaliação? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    if (this.avaliacao.ID) {
      this.excluindo = true;
      this.service_avaliacao.excluir(this.avaliacao.ID!).subscribe({
        next: () => {
          this.excluindo = false;
          this.mostrarMensagem('Avaliação excluída com sucesso!', 'sucesso');
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        },
        error: err => {
          this.excluindo = false;
          const mensagem = err.error?.message || err.message || 'Erro ao excluir avaliação';
          this.mostrarMensagem(`Erro ao excluir avaliação: ${mensagem}`, 'erro');
        }
      });
    }
  }
}
