import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { FormValidations } from '../../form-validation';
import { RestauranteService } from '../../services/restaurante.service';

@Component({
  selector: 'app-cadastro-restaurante',
  templateUrl: './cadastro-restaurante.component.html',
  styleUrl: './cadastro-restaurante.component.css',
})
export class CadastroRestauranteComponent implements OnInit {
  constructor(
    private restaurante: RestauranteService,
    private formbuild: FormBuilder,
    private router: Router,
    private translate: TranslateService
  ) {}

  formulario!: FormGroup;
  hide = true;
  ngOnInit(): void {
    this.formulario = this.formbuild.group({
      Nome: new FormControl(
        '',
        Validators.compose([
          Validators.required,
          Validators.pattern(/(.|\s)*\S(.|\s)*/),
        ])
      ),
      descricao: new FormControl(
        '',
        Validators.compose([Validators.pattern(/(.|\s)*\S(.|\s)*/)])
      ),
      CNPJ: new FormControl(
        '',
        Validators.compose([Validators.required, Validators.minLength(14)])
      ),
      tipo_restaurante: new FormControl(
        'Arabe',
        Validators.compose([Validators.pattern(/(.|\s)*\S(.|\s)*/)])
      ),
      email: new FormControl(
        '',
        Validators.compose([Validators.required, Validators.email])
      ),
      senha: new FormControl(
        '',
        Validators.compose([
          Validators.required,
          Validators.pattern('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$'),
        ])
      ),
      confirmasenha: new FormControl(
        '',
        Validators.compose([
          Validators.required,
          Validators.pattern('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$'),
          FormValidations.equalTo('senha'),
        ])
      ),
      Cidade: new FormControl(
        '',
        Validators.compose([
          Validators.required,
          Validators.pattern(/(.|\s)*\S(.|\s)*/),
        ])
      ),
      Endereco: new FormControl(
        '',
        Validators.compose([
          Validators.required,
          Validators.pattern(/(.|\s)*\S(.|\s)*/),
        ])
      ),
      telefone: new FormControl(
        '',
        Validators.compose([Validators.required, Validators.minLength(11)])
      ),
    });
  }

  salvarRestaurante() {
    this.restaurante
      .criar(this.formulario.value)
      .subscribe(() => this.router.navigate(['/login']));
  }

  habilitarBotao(): string {
    if (this.formulario.valid) {
      return 'botao';
    } else {
      return 'botao_desabilitado';
    }
  }
  getLingua() {
    return this.translate.currentLang;
  }
  ValidaPlaceholderNome() {
    if (this.getLingua() == 'en') {
      return 'Type your Name';
    } else {
      return 'Digite seu Nome';
    }
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
