import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, AbstractControl,
  ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { RestauranteService } from '../../services/restaurante.service';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-editar-avaliacao',
  templateUrl: './editar-avaliacao.component.html',
  styleUrl: './editar-avaliacao.component.css',
})
export class EditarAvaliacaoComponent implements OnInit {
  formulario!: FormGroup;
  restaurante: any;
  avaliacao: any;
  defaultAvatar = 'assets/images/default-restaurant.png';

  constructor(
    private jwthelper: JwtHelperService,
    private avSvc: AvaliacaoService,
    private fb: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService,
    private restSvc: RestauranteService
  ) {}

  id_cliente = this.route.snapshot.paramMap.get('id_cliente');
  ngOnInit(): void {
    const idAvalStr = this.route.snapshot.paramMap.get('id_avaliacao');
    if (!idAvalStr || isNaN(Number(idAvalStr))) {
      alert('ID da avaliação inválido!');
      return;
    }
    const idAval = Number(idAvalStr);
    // Primeiro: busco a avaliação
    this.avSvc.buscarPorId(idAval).subscribe((a) => {
      this.avaliacao = a; // Salve a avaliação aqui
      // Em seguida, busco o restaurante dela
      this.restSvc.buscarPorId(a.ID_Restaurante).subscribe((r) => {
        this.restaurante = r;
      });
      // inicializo o form com os valores atuais
      this.formulario = this.fb.group({
        Nota: [a.Nota, Validators.required],
        Comentario: [
          a.Comentario,
          [Validators.required, Validators.minLength(10)],
        ],
      });
    });
  }
  get f(): { [key: string]: AbstractControl } {
    return this.formulario.controls;
  }
  /** clica na estrela */
  setRating(star: number) {
    this.formulario.get('Nota')!.setValue(star);
  }

  /** salva alterações */
  onSubmit() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const id = +this.route.snapshot.paramMap.get('id_avaliacao')!;
    // Pegue os IDs do cliente e restaurante (você pode já ter esses dados carregados)
    const ID_Cliente = this.get_id(); // ou use o valor carregado da avaliação, se necessário
    const ID_Restaurante = this.restaurante?.ID || null; // ou use o valor carregado da avaliação

    const dados = {
      ...this.formulario.value,
      ID: id,
      ID_Cliente,
      ID_Restaurante
    };

    this.avSvc.editar(dados).subscribe({
      next: () => this.router.navigate(['/perfilCliente', ID_Cliente]),
      error: (err) => {
        alert('Erro ao editar avaliação!');
        console.error(err);
      }
    });
  }
  cancel() {
    this.router.navigate(['/perfilCliente', this.avaliacao.ID_Cliente]);
  }


  editarAvaliacao() {
    this.avSvc
      .editar(this.formulario.value)
      .subscribe(() =>
        this.router.navigate([`/perfilCliente/${this.id_cliente}`])
      );
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
  get_id() {
    return localStorage.getItem('id');
  }
  get_tipo() {
    return localStorage.getItem('tipo');
  }
  getLingua() {
    return this.translate.currentLang;
  }
  ValidaPlaceholderComentario() {
    if (this.getLingua() == 'en') {
      return 'Type a Commentary';
    } else {
      return 'Digite um Comentario';
    }
  }
}
