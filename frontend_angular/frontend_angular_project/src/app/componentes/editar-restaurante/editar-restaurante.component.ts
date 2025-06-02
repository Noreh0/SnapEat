import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { RestauranteService } from '../../services/restaurante.service';
import { restauranteModel } from '../../model/restaurante.model';
import { FormValidations } from '../../form-validation';

@Component({
  selector: 'app-editar-restaurante',
  templateUrl: './editar-restaurante.component.html',
  styleUrls: ['./editar-restaurante.component.css'],
})
export class EditarRestauranteComponent implements OnInit {
  formulario!: FormGroup;
  id = 0;
  hide = true; // se você usa para toggle de senha

  constructor(
    private formBuilder: FormBuilder,
    private restauranteService: RestauranteService,
    private route: ActivatedRoute,
    private router: Router,
    private jwtHelper: JwtHelperService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    // 1) Captura ID da rota
    const idParam = this.route.snapshot.paramMap.get('id_restaurante');
    this.id = idParam ? Number(idParam) : 0;

    // 2) Checa autenticação e tipo
    const token = localStorage.getItem('token');
    const payload = token ? this.jwtHelper.decodeToken(token) : null;
    if (!payload || payload.tipo !== 'restaurante' || Number(payload.sub) !== this.id) {
      this.router.navigate(['/menu']);
      return;
    }

    // 3) Busca dados iniciais e preenche o form
    this.restauranteService.buscarPorId(this.id).subscribe({
      next: (r: restauranteModel) => {
        this.formulario = this.formBuilder.group({
          ID: [r.ID],
          Nome: [
            r.Nome,
            [Validators.required, Validators.pattern(/(.|\s)*\S(.|\s)*/)],
          ],
          descricao: [
            r.descricao,
            [Validators.pattern(/(.|\s)*\S(.|\s)*/)],
          ],
          CNPJ: [
            r.CNPJ,
            [Validators.required, Validators.minLength(14)],
          ],
          email: [
            r.email,
            [Validators.required, Validators.email],
          ],
          tipo_restaurante: [
            r.tipo_restaurante,
            [Validators.pattern(/(.|\s)*\S(.|\s)*/)],
          ],
          senha: [
            '',
            [
              Validators.required,
              Validators.pattern('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$'),
            ],
          ],
          confirmasenha: [
            '',
            [
              Validators.required,
              Validators.pattern('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$'),
              FormValidations.equalTo('senha'),
            ],
          ],
          Cidade: [
            r.Cidade,
            [Validators.required, Validators.pattern(/(.|\s)*\S(.|\s)*/)],
          ],
          telefone: [
            r.telefone,
            [Validators.required, Validators.minLength(11)],
          ],
          Endereco: [
            r.Endereco,
            [Validators.required, Validators.pattern(/(.|\s)*\S(.|\s)*/)],
          ],
        });
      },
      error: () => {
        alert('Não foi possível carregar os dados do restaurante.');
        this.router.navigate(['/menu']);
      },
    });
  }

  editarRestaurante(): void {
    if (this.formulario.invalid) {
      return;
    }
    const data = this.formulario.value as restauranteModel;
    this.restauranteService.editar(this.id, data).subscribe({
      next: () => {
        this.router.navigate(['/perfilRestaurante', this.id]);
      },
      error: () => {
        alert('Falha ao editar. Tente novamente mais tarde.');
      },
    });
  }

  habilitarBotao(): string {
    return this.formulario.valid ? 'botao' : 'botao_desabilitado';
  }

  // Métodos de placeholder reutilizáveis
  getLingua(): string {
    return this.translate.currentLang;
  }

  ValidaPlaceholderNome(): string {
    return this.getLingua() === 'en'
      ? 'Type your Name'
      : 'Digite seu Nome';
    }
  ValidaPlaceholderDescricao() {
    if (this.getLingua() == 'en') {
      return 'Type the Description of the Restaurante';
    } else {
      return 'Digite a Descrição do restaurante';
    }
  }
  ValidaPlaceholderCNPJ() {
    if (this.getLingua() == 'en') {
      return 'Type your CNPJ';
    } else {
      return 'Digite seu CNPJ';
    }
  }
  ValidaPlaceholderEmail() {
    if (this.getLingua() == 'en') {
      return 'Type your Email (Ex: Email@gmail.com)';
    } else {
      return 'Digite seu Email (Ex: Email@gmail.com)';
    }
  }
  ValidaPlaceholderTipo() {
    if (this.getLingua() == 'en') {
      return 'Select the Type of the Restaurant';
    } else {
      return 'Selecione o Tipo do Restaurante';
    }
  }
  ValidaPlaceholderSenha() {
    if (this.getLingua() == 'en') {
      return 'Type your Password';
    } else {
      return 'Digite sua Senha';
    }
  }
  ValidaPlaceholderConfirma() {
    if (this.getLingua() == 'en') {
      return 'Confirm your Password';
    } else {
      return 'Confirme sua Senha';
    }
  }
  ValidaPlaceholderCidade() {
    if (this.getLingua() == 'en') {
      return 'Type your City';
    } else {
      return 'Digite sua Cidade';
    }
  }
  ValidaPlaceholderTelefone() {
    if (this.getLingua() == 'en') {
      return 'Type your Phone';
    } else {
      return 'Digite seu Telefone';
    }
  }
  ValidaPlaceholderEndereco() {
    if (this.getLingua() == 'en') {
      return 'Type the Address';
    } else {
      return 'Digite o Endereço';
    }
  }
}

