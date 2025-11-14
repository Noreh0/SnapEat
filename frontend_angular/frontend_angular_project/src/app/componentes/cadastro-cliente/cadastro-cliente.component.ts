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
    private translate: TranslateService,
    private apiService: ApiService
  ) {}
  hide = true;
  value!: string;
  formulario!: FormGroup;
  // ...dentro da classe CadastroClienteComponent...
  mostrarPopup = false;

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
      rede_social: new FormControl(
        '',
        // Campo opcional com validação de URL quando preenchido
        [this.urlValidator]
      )
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
  cancelarCadastro() {
    this.router.navigate(['/login']);
  }

  // Validador customizado para URLs de rede social
  urlValidator(control: any) {
    if (!control.value) {
      return null; // Campo opcional
    }

    const urlPattern = /^(https?:\/\/)?(www\.)?(instagram\.com|facebook\.com|twitter\.com|x\.com|linkedin\.com|tiktok\.com|youtube\.com|github\.com|snapchat\.com)\/.*$/i;
    
    if (!urlPattern.test(control.value)) {
      return { invalidUrl: true };
    }
    
    return null;
  }
}
