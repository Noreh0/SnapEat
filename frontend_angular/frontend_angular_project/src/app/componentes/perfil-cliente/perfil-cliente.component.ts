import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { JwtHelperService } from '@auth0/angular-jwt';
import { TranslateService } from '@ngx-translate/core';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { clienteModel }  from '../../model/cliente.model';
import { AvaliacaoService }  from '../../services/avaliacao.service';
import { ClienteService }    from '../../services/cliente.service';
import { RestauranteService } from '../../services/restaurante.service';
import { restauranteModel } from '../../model/restaurante.model';

@Component({
  selector: 'app-perfil-cliente',
  templateUrl: './perfil-cliente.component.html',
  styleUrls: ['./perfil-cliente.component.css'],
})
export class PerfilClienteComponent implements OnInit {
  // Propriedades usadas pelo template
  Nome = '';
  Email = '';
  id = 0;
  listaAvaliacao: AvaliacaoModel[] = [];
  listaAvaliacaoFiltrada: AvaliacaoModel[] = [];
  
  // Controle do dropdown
  showDropdown = false;
  private dropdownTimeout: any;
  
  // Filtro de busca
  filtroTexto = '';
  
  // Controle do modal de exclusão do perfil
  showDeleteModal = false;
  isDeleting = false;

  // Controle do modal de exclusão de avaliação
  showDeleteAvaliacaoModal = false;
  isDeletingAvaliacao = false;
  avaliacaoParaExcluir: number | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private jwtHelper: JwtHelperService,
    private clienteService: ClienteService,
    private avaliacaoService: AvaliacaoService,
    private authService: AutenticacaoService,
    private restauranteService: RestauranteService,
    public translate: TranslateService
  ) {}

  ngOnInit(): void {
    // 1) Pega ID da rota e do token
    const idParam = this.route.snapshot.paramMap.get('id_cliente');
    const idToken = this.getIdFromToken();

    if (!idParam || idToken === null) {
      // Se não tiver ID na rota ou token inválido, volta pro login
      this.router.navigate(['/login']);
      return;
    }

    this.id = +idParam;

    // 2) Só permite ver seu próprio perfil
    if (this.id !== idToken) {
      this.router.navigate(['/menu']);
      return;
    }

    // 3) Busca informações básicas do cliente
    this.clienteService.buscarPorId(this.id).subscribe({
      next: c => {
        this.Nome  = c.Nome;
        this.Email = c.email;
      },
      error: () => {
        this.router.navigate(['/menu']);
      }
    });

    // 4) Busca avaliações deste cliente
    this.avaliacaoService.buscarPorCliente(this.id).subscribe({
      next: avals => {
        this.listaAvaliacao = avals;
        this.listaAvaliacaoFiltrada = [...avals]; // Inicializar lista filtrada
        // Para cada avaliação, busque o nome do restaurante
        this.listaAvaliacao.forEach(av => {
          // Adicionar verificação para ID_Restaurante
          if (av.ID_Restaurante) {
            this.restauranteService.buscarPorId(av.ID_Restaurante).subscribe((resto: restauranteModel) => {
              av.Nome_Restaurante = resto.Nome;
            });
          }
        });
      },
      error: err  => {
        console.error('Erro ao buscar avaliações:', err);
      }
    });
  }

  
  private getIdFromToken(): number | null {
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) return null;
    
    try {
      const payload: any = this.jwtHelper.decodeToken(token);
      console.log("Token payload no perfil-cliente:", payload);
      console.log("Subject:", payload.sub, "Tipo:", typeof payload.sub);
      
      // Converta para número, mas certifique-se de que é um valor válido
      if (payload.sub) {
        // Se for string numérica, converta para número
        if (typeof payload.sub === 'string' && /^\d+$/.test(payload.sub)) {
          return +payload.sub;
        }
        // Se já for número, use diretamente
        else if (typeof payload.sub === 'number') {
          return payload.sub;
        }
      }
      return null;
    } catch (e) {
      console.error("Erro ao decodificar token:", e);
      return null;
    }
  }

  // Botão "Editar Perfil"
  editarCliente(): void {
    this.router.navigate(['/perfilCliente', this.id, 'editarCliente']);
  }

  // Botão "Meus Cupons"
  verMeusCupons(): void {
    this.router.navigate(['/perfilCliente', this.id, 'meus-cupons']);
  }

  // Botão "Editar Avaliação"
  irParaEditarAvaliacao(idAvaliacao: number): void {
    this.router.navigate([
      '/perfilCliente',
      this.id,
      'editarAvaliacao',
      idAvaliacao
    ]);
  }
  
  // Remover este método pois está duplicando a funcionalidade já implementada no ngOnInit
  // e referenciando propriedades não existentes
  /*
  carregarAvaliacoes(): void {
    this.service
      .buscarAvaliacoesPorCliente(this.id)
      .subscribe({
        next: (avaliacoes: AvaliacaoModel[]) => {
          this.avaliacoes = avaliacoes;
          
          // Para cada avaliação, buscar o nome do restaurante se ID_Restaurante existir
          this.avaliacoes.forEach(av => {
            if (av.ID_Restaurante) {
              this.restauranteService.buscarPorId(av.ID_Restaurante).subscribe((resto: restauranteModel) => {
                // Atualize de forma segura com TypeScript
                av.Nome_Restaurante = resto.Nome;
              });
            }
          });
        },
        error: (err) => {
          console.error('Erro ao carregar avaliações:', err);
        }
      });
  }
  */

  // Abrir modal de exclusão de avaliação
  abrirModalExclusaoAvaliacao(idAvaliacao: number): void {
    this.avaliacaoParaExcluir = idAvaliacao;
    this.showDeleteAvaliacaoModal = true;
  }

  // Cancelar exclusão de avaliação
  cancelarExclusaoAvaliacao(): void {
    this.showDeleteAvaliacaoModal = false;
    this.isDeletingAvaliacao = false;
    this.avaliacaoParaExcluir = null;
  }

  // Confirmar exclusão de avaliação
  confirmarExclusaoAvaliacao(): void {
    if (this.isDeletingAvaliacao || !this.avaliacaoParaExcluir) return;
    
    this.isDeletingAvaliacao = true;
    this.avaliacaoService.excluir(this.avaliacaoParaExcluir).subscribe({
      next: () => {
        console.log('✅ Avaliação excluída com sucesso');
        // Remover localmente para refletir na tela sem recarregar tudo
        this.listaAvaliacao = this.listaAvaliacao.filter(av => av.ID !== this.avaliacaoParaExcluir);
        this.filtrarAvaliacoes(); // Atualizar lista filtrada
        
        // Fechar modal
        this.showDeleteAvaliacaoModal = false;
        this.isDeletingAvaliacao = false;
        this.avaliacaoParaExcluir = null;
      },
      error: (err: any) => {
        console.error('❌ Erro ao excluir avaliação:', err);
        this.isDeletingAvaliacao = false;
        
        // Fechar modal e mostrar erro
        this.showDeleteAvaliacaoModal = false;
        this.avaliacaoParaExcluir = null;
        alert('Não foi possível excluir a avaliação. Tente novamente.');
      }
    });
  }

  // Método legado mantido para compatibilidade (não usado mais)
  removerAvaliacao(idAvaliacao: number): void {
    this.abrirModalExclusaoAvaliacao(idAvaliacao);
  }

  // Método para filtrar avaliações
  filtrarAvaliacoes(): void {
    if (!this.filtroTexto.trim()) {
      this.listaAvaliacaoFiltrada = [...this.listaAvaliacao];
      return;
    }

    const termo = this.filtroTexto.toLowerCase().trim();
    this.listaAvaliacaoFiltrada = this.listaAvaliacao.filter(avaliacao => {
      // Buscar por comentário, nota, ou nome do restaurante
      const comentario = avaliacao.Comentario?.toLowerCase() || '';
      const nota = avaliacao.Nota?.toString() || '';
      const restaurante = avaliacao.Nome_Restaurante?.toLowerCase() || '';
      
      return comentario.includes(termo) || 
             nota.includes(termo) || 
             restaurante.includes(termo);
    });
  }

  // Método para limpar filtro
  limparFiltro(): void {
    this.filtroTexto = '';
    this.listaAvaliacaoFiltrada = [...this.listaAvaliacao];
  }


  // Botão "Excluir Conta" - Abre o modal
  excluirCliente(): void {
    this.showDeleteModal = true;
  }

  // Cancelar exclusão - Fecha o modal
  cancelarExclusao(): void {
    this.showDeleteModal = false;
    this.isDeleting = false;
  }

  // Confirmar exclusão - Executa a exclusão
  confirmarExclusao(): void {
    if (this.isDeleting) return;
    
    this.isDeleting = true;
    const id = this.id || localStorage.getItem('id');
    console.log(`Enviando requisição para excluir cliente ID: ${id}`);
    
    // Adicionar cabeçalho de autenticação manualmente para debug
    const token = localStorage.getItem('token');
    console.log("Token usado na exclusão:", token);
    
    const headers = {
      'Authorization': `Bearer ${token}`
    };
    
    this.clienteService.excluir(Number(id), headers).subscribe({
      next: () => {
        console.log('✅ Perfil excluído com sucesso');
        this.showDeleteModal = false;
        this.isDeleting = false;
        
        // Atualizar estado de autenticação e redirecionar
        this.authService.updateAuthState(false);
        localStorage.clear();
        this.router.navigate(['/login']);
      },
      error: (err) => {
        console.error('❌ Erro ao excluir perfil:', err);
        this.isDeleting = false;
        
        // Fechar modal e mostrar erro
        this.showDeleteModal = false;
        alert('Não foi possível excluir seu perfil. Por favor, tente novamente mais tarde.');
      }
    });
  }

  // Métodos para controle do dropdown
  hideDropdownWithDelay(): void {
    this.dropdownTimeout = setTimeout(() => {
      this.showDropdown = false;
    }, 300); // 300ms de delay para permitir hover no menu
  }

  cancelHideDropdown(): void {
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
    }
  }

  hideDropdown(): void {
    this.showDropdown = false;
    if (this.dropdownTimeout) {
      clearTimeout(this.dropdownTimeout);
    }
  }
}