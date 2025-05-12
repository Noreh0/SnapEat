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
import { ApiService } from '../../services/api.service';
import { ClienteService } from '../../services/cliente.service';
import { CabecalhoComponent } from '../cabecalho/cabecalho.component';
@Component({
  selector: 'app-cadastro-cliente',
  templateUrl: './cadastro-cliente.component.html',
  styleUrl: './cadastro-cliente.component.css',
})
export class CadastroClienteComponent implements OnInit {
  constructor(
    private cliente: ClienteService,
    private formbuild: FormBuilder,
    private router: Router,
    private lingua: CabecalhoComponent,
    private translate: TranslateService,
    private apiService: ApiService
  ) {}
  hide = true;
  value!: string;
  formulario!: FormGroup;

  ngOnInit(): void {
    this.formulario = this.formbuild.group({
      Nome: new FormControl(
        '',
        Validators.compose([
          Validators.required,
          Validators.pattern(/(.|\s)*\S(.|\s)*/),
        ])
      ),
      CPF: new FormControl(
        '',
        Validators.compose([Validators.required, Validators.minLength(11)])
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
      confirmasenha: [
        '',
        Validators.compose([
          Validators.required,
          Validators.pattern('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$'),
          FormValidations.equalTo('senha'),
        ]),
      ],
      Cidade: new FormControl(
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

  salvarCliente() {
    if (this.formulario.valid) {
      this.cliente
        .criar(this.formulario.value)
        .subscribe(() => this.router.navigate(['/login']));
    }
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
  ValidaPlaceholderCPF() {
    if (this.getLingua() == 'en') {
      return 'Type your CPF';
    } else {
      return 'Digite seu CPF';
    }
  }
  ValidaPlaceholderEmail() {
    if (this.getLingua() == 'en') {
      return 'Type your Email (Ex: Email@gmail.com)';
    } else {
      return 'Digite seu Email (Ex: Email@gmail.com)';
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
}
