import { Component, Input, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { RestauranteService } from '../../services/restaurante.service';
import { ClienteService } from '../../services/cliente.service';
import { async, concat, forkJoin, mergeMap } from 'rxjs';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-criar-avaliacao',
  templateUrl: './criar-avaliacao.component.html',
  styleUrl: './criar-avaliacao.component.css',
})
export class CadastroAvaliacaoComponent implements OnInit {
  @Input() Nome!: String;
  formulario!: FormGroup;
  constructor(
    private service: RestauranteService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private avaliacao: AvaliacaoService,
    private serviceCliente: ClienteService,
    private router: Router,
    private translate: TranslateService,
    private jwthelper: JwtHelperService
  ) {
    this.formulario = this.formBuilder.group({
      ID_Cliente: [0],
      ID_Restaurante: [0],
      Nota: new FormControl(
        1,
        Validators.compose([Validators.pattern(/(.|\s)*\S(.|\s)*/)])
      ),
      Comentario: new FormControl(
        '',
        Validators.compose([Validators.pattern(/(.|\s)*\S(.|\s)*/)])
      ),
    });
  }

  email = this.route.snapshot.paramMap.get('id_restaurante');
  id_restaurante!: number;
  id_cliente!: number;
  ngOnInit(): void {
    if (this.get() == null) {
      this.router.navigate(['/login']);
      return;
    } else if (this.get_tipo() == 'restaurante') {
      this.router.navigate(['/perfilRestaurante/' + this.get()]);
      return;
    }

    forkJoin([
      this.service.buscarPorEmail(this.email!),
      this.serviceCliente.buscarPorEmail(this.get()!),
    ]).subscribe(([restaurantes, clientes]) => {
      for (let restaurante of restaurantes) {
        this.Nome = restaurante.Nome;
        this.id_restaurante = restaurante.ID;
      }

      for (let cliente of clientes) {
        this.id_cliente = cliente.ID;
      }

      // Atualizar FormGroup com os valores obtidos
      this.formulario.patchValue({
        ID_Cliente: this.id_cliente,
        ID_Restaurante: this.id_restaurante,
      });
    });
  }

  salvarAvaliacao() {
    this.avaliacao
      .criar(this.formulario.value)
      .subscribe(() => this.router.navigate(['/menu']));
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
