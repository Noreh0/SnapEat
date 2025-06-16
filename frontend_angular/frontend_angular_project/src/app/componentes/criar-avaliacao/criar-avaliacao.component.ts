import { Component, OnInit } from '@angular/core';
import { RestauranteService } from '../../services/restaurante.service';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { JwtHelperService } from '@auth0/angular-jwt';
import { AvaliacaoModel } from '../../model/avaliacao.model';

@Component({
  selector: 'app-criar-avaliacao',
  templateUrl: './criar-avaliacao.component.html',
  styleUrls: ['./criar-avaliacao.component.css'],
})
export class CadastroAvaliacaoComponent implements OnInit {
  formulario!: FormGroup;
  idRestaurante!: number;
  idCliente!: number;
  tipoUsuario!: string;
  NomeRestaurante: string = '';
  Categoria: string = '';
  Cidade: string = '';
  AvaliacaoMedia: number = 0;
  TotalAvaliacoes: number = 0;


  constructor(
  private fb: FormBuilder,
  private route: ActivatedRoute,
  private router: Router,
  private jwtHelper: JwtHelperService,
  private serviceAvaliacao: AvaliacaoService,
  private restauranteService: RestauranteService, // <-- adicione aqui
  private translate: TranslateService
) {}

  ngOnInit(): void {
    // 1) Só clientes podem criar avaliação
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) {
      return;
    }
    const payload = this.jwtHelper.decodeToken(token);
    this.tipoUsuario = payload.tipo;
    this.idCliente = Number(payload.sub);
    if (this.tipoUsuario !== 'cliente') {
      return;
    }

    // 2) Pega id_restaurante da rota
    this.idRestaurante = Number(this.route.snapshot.paramMap.get('id_restaurante'));
    this.restauranteService.buscarPorId(this.idRestaurante).subscribe(resto => {
      this.NomeRestaurante = resto.Nome;
      this.Categoria = resto.tipo_restaurante;
      this.Cidade = resto.Cidade;
    });

    if (!this.idRestaurante) {
      return;
    }

    // 3) Monta form apenas com os campos que o usuário preenche
    this.formulario = this.fb.group({
      Nota: ['1', [Validators.required, Validators.min(1), Validators.max(5)]],
      Comentario: ['', [Validators.required, Validators.minLength(5)]],
    });
    this.inicializarFormulario();
    this.restauranteService.buscarPorId(this.idRestaurante).subscribe((resto: any) => {
    this.NomeRestaurante = resto.Nome;
    this.Categoria = resto.tipo_restaurante;
    this.Cidade = resto.Cidade;
  });

  this.serviceAvaliacao.buscarPorRestaurante(this.idRestaurante).subscribe((avals: any[]) => {
    this.TotalAvaliacoes = avals.length;
    if (avals.length > 0) {
      this.AvaliacaoMedia = avals.reduce((acc: number, av: any) => acc + av.Nota, 0) / avals.length;
    } else {
      this.AvaliacaoMedia = 0;
    }
  });
    
  }
  private inicializarFormulario() {
    this.formulario = this.fb.group({
      Nota: ['', [Validators.required]],
      Comentario: ['', [Validators.required, Validators.minLength(10)]],
    });
  }

  salvarAvaliacao(): void {
    if (this.formulario.invalid) return;

    const novaAvaliacao: AvaliacaoModel = {
      ID_Cliente: this.idCliente,
      ID_Restaurante: this.idRestaurante,
      Nota: this.formulario.value.Nota,
      Comentario: this.formulario.value.Comentario,
    };

    this.serviceAvaliacao.criar(novaAvaliacao).subscribe({
      next: () => this.router.navigate(['/menu']),
      error: err => {
        console.error('Erro ao criar avaliação', err);
        alert('Não foi possível salvar, tente novamente.');
      }
    });
  }

  // Placeholders multilíngue
  getLingua(): string {
    return this.translate.currentLang;
  }
  ValidaPlaceholderComentario(): string {
    return this.getLingua() === 'en'
      ? 'Type a Review...'
      : 'Digite seu comentário...';
  }
}


