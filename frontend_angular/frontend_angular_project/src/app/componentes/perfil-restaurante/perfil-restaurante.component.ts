import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AvaliacaoModel } from '../../model/avaliacao.model';
import { RestauranteService } from '../../services/restaurante.service';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { DenunciaService } from '../../services/denuncia.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { restauranteModel } from '../../model/restaurante.model';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-perfil-restaurante',
  templateUrl: './perfil-restaurante.component.html',
  styleUrls: ['./perfil-restaurante.component.css'],
})
export class PerfilRestauranteComponent implements OnInit {
  id!: number;
  restaurante!: {
    id: number;
    Nome: string;
    tipo_restaurante: string;
    CNPJ: string;
    descricao: string;
    email: string;
    imagem_url?: string;
    mediaAvaliacoes: number;
    totalAvaliacoes: number;
  };
  pendentesDenuncias = 0;
  mediaAval = 0;
  totalAval = 0;
  avaliacoes: Array<{
    clienteNome: string;
    Nota: number;
    Comentario: string;
    data: string;
  }> = [];
  isOwner = false;
  imageLoading = true;
  imageError = false;
  showDropdown = false;
  dropdownTimer: any;
  showDeleteModal = false;
  isDeleting = false;

  constructor(
    private jwtHelper: JwtHelperService,
    private svc: RestauranteService,
    private avalService: AvaliacaoService,
    private route: ActivatedRoute,
    private router: Router,
    private auth: AutenticacaoService,
    private denunciaSvc: DenunciaService
  ) {}

    ngOnInit(): void {
      const idStr = this.route.snapshot.paramMap.get('id_restaurante') || this.route.snapshot.paramMap.get('id');
      this.id = idStr ? +idStr : 0;

      const token = localStorage.getItem('token');
      if (!token || this.jwtHelper.isTokenExpired(token) || this.id <= 0) {
        this.router.navigate(['/login']);
        return;
      }

      this.svc.buscarPorId(this.id).subscribe({
        next: (r: restauranteModel) => {
          console.log('📊 Dados do restaurante recebidos:', r);
          this.imageLoading = true; // Iniciar carregamento da imagem
          this.imageError = false;  // Resetar estado de erro
          const imagemUrl = this.tratarUrlImagem(r.imagem_url);
          console.log('URL de imagem processada:', imagemUrl);
          this.restaurante = {
            id: r.ID,
            Nome: r.Nome,
            tipo_restaurante: r.tipo_restaurante,
            CNPJ: r.CNPJ,
            descricao: r.descricao,
            email: r.email,
            imagem_url: imagemUrl,
            mediaAvaliacoes: Number(r.NotaMedia) || 0,
            totalAvaliacoes: Number(r.totalAvaliacoes) || 0,
          };
          this.mediaAval = Number(r.NotaMedia) || 0;
          this.totalAval = Number(r.totalAvaliacoes) || 0;

          console.log('📊 Métricas iniciais - Média:', this.mediaAval, 'Total:', this.totalAval);

          this.isOwner = Number(this.auth.usuarioAtual?.sub) === r.ID;
          if (this.isOwner) {
            this.carregarIndicadoresDenuncias();
          }

          // Se as métricas estão zeradas, recalcular após carregar avaliações
          if (this.mediaAval === 0 || this.totalAval === 0) {
            console.log('🔄 Métricas zeradas, recalculando após carregar avaliações...');
            this.carregarAvaliacoes();
          }
        },
        error: () => {
          alert('Restaurante não encontrado!');
          this.router.navigate(['/menu']);
        }
      });

      this.carregarAvaliacoes();
    }

    private carregarAvaliacoes(): void {
      this.avalService.buscarPorRestaurante(this.id).subscribe({
        next: (lista: AvaliacaoModel[]) => {
          console.log('📝 Avaliações carregadas:', lista.length);
          
          this.avaliacoes = lista
            .map(a => ({
              clienteNome: (a as any).clienteNome || (a as any).Nome_Cliente || 'Cliente',
              Nota: a.Nota || 0,
              Comentario: a.Comentario || '',
              data: a.data_avaliacao || new Date().toISOString(),
            }))
            .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
            .slice(0, 3);

          // Recalcular métricas se necessário
          if (lista.length > 0 && (this.mediaAval === 0 || this.totalAval === 0)) {
            this.totalAval = lista.length;
            const somaNotas = lista.reduce((sum, aval) => sum + (aval.Nota || 0), 0);
            this.mediaAval = somaNotas / lista.length;
            
            console.log('🔄 Métricas recalculadas - Média:', this.mediaAval.toFixed(1), 'Total:', this.totalAval);
          }
        },
        error: (err) => {
          console.error('Erro ao carregar avaliações:', err);
        }
      });
    }
   tratarUrlImagem(url?: string): string {
    if (!url) return 'assets/images/default-restaurant.png';
    
    // Se já é uma URL completa do Firebase Storage
    if (url.startsWith('https://firebasestorage.googleapis.com') || 
        url.startsWith('https://storage.googleapis.com')) {
      return url;
    } 
    
    // Se é uma URL relativa que começa com /uploads (backend próprio)
    if (url.startsWith('/uploads')) {
      return `${environment.apiUrl}${url}`;
    }
    
    // Se parece ser um caminho de arquivo do Firebase Storage
    if (url.includes('/o/') && !url.includes('?alt=media')) {
      // Adiciona o parâmetro alt=media se não existir
      return `${url}?alt=media`;
    }
    
    // Se for apenas o nome do arquivo ou caminho (formato comum no Firebase)
    if (!url.startsWith('http')) {
      // Supondo que seja um caminho relativo no bucket do Firebase
      // O formato correto é: gs://BUCKET_NAME/PATH/TO/FILE
      // Para URL: https://firebasestorage.googleapis.com/v0/b/BUCKET_NAME/o/PATH%2FTO%2FFILE?alt=media
      
      // Removendo "gs://" se presente
      const cleanPath = url.startsWith('gs://') ? url.substring(5) : url;
      
      // Separar bucket e path se estiver no formato BUCKET_NAME/PATH
      let bucketName = 'seu-projeto-firebase.appspot.com'; // Substitua pelo seu bucket
      let objectPath = cleanPath;
      
      const firstSlash = cleanPath.indexOf('/');
      if (firstSlash > 0) {
        bucketName = cleanPath.substring(0, firstSlash);
        objectPath = cleanPath.substring(firstSlash + 1);
      }
      
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(objectPath)}?alt=media`;
    }
    
    return url;
  }

    handleImageError() {
      console.error('Erro ao carregar imagem:', this.restaurante.imagem_url);
      this.imageError = true;
      this.imageLoading = false;
    }

    handleImageLoad() {
      console.log('Imagem carregada com sucesso');
      this.imageLoading = false;
    }

    // Atualizar o método carregarIndicadoresDenuncias()
    private carregarIndicadoresDenuncias() {
      this.denunciaSvc.indicadores(this.id).subscribe({
        next: (ind: any) => {
          console.log('Indicadores de denúncias recebidos:', ind);
          this.pendentesDenuncias = ind?.pendentes || 0;
        },
        error: (err) => {
          console.error('Erro ao carregar indicadores de denúncias:', err);
          this.pendentesDenuncias = 0; // Em caso de erro, assume 0
        }
      });
    }
    renderStars(n: number): string {
      const full = '★'.repeat(Math.round(n));
      const empty = '☆'.repeat(5 - Math.round(n));
      return full + empty;
    }

    editarRestaurante(): void {
      this.router.navigate(['/perfil-restaurante', this.id, 'editarRestaurante']);
    }

    excluirRestaurante(): void {
      this.showDeleteModal = true;
    }

    cancelarExclusao(): void {
      this.showDeleteModal = false;
      this.isDeleting = false;
    }

    confirmarExclusao(): void {
      if (this.isDeleting) return;
      
      this.isDeleting = true;
      this.svc.excluir(this.id).subscribe({
        next: () => {
          console.log('✅ Restaurante excluído com sucesso');
          this.showDeleteModal = false;
          this.isDeleting = false;
          
          // Limpar dados locais e redirecionar
          localStorage.clear();
          this.router.navigate(['/login']);
        },
        error: (err) => {
          console.error('❌ Erro ao excluir restaurante:', err);
          this.isDeleting = false;
          
          // Fechar modal e mostrar erro
          this.showDeleteModal = false;
          alert('Falha ao excluir restaurante. Tente novamente mais tarde.');
        }
      });
    }

    hideDropdownDelayed(): void {
      // Aguardar 500ms antes de fechar o dropdown
      this.dropdownTimer = setTimeout(() => {
        this.showDropdown = false;
      }, 500);
    }

    showDropdownImmediate(): void {
      // Cancelar timer de fechamento se existir
      if (this.dropdownTimer) {
        clearTimeout(this.dropdownTimer);
      }
      this.showDropdown = true;
    }
}