import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormControl,
  AbstractControl,
  FormGroup,
  ValidationErrors,
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
  formulario!: FormGroup;
  hideSenha = true;
  tipos = [
    'Arabe','Brasileira','Carnes','Chinesa','Francesa','Frango',
    'Italiana','Japonesa','Lanches','Mexicana','Peixes',
    'Pizzaria','Saudavel','Vegana','Vegetariana'
  ];
  constructor(
    private restaurante: RestauranteService,
    private formbuild: FormBuilder,
    private router: Router,
    private translate: TranslateService,
    private fb: FormBuilder,
    private svc: RestauranteService
  ) {}

  ngOnInit(): void {
    this.formulario = this.fb.group(
      {
        Nome: ['', [Validators.required, Validators.minLength(3)]],
        descricao: ['', [Validators.maxLength(200)]],
        CNPJ: ['', [Validators.required, this.cnpjValidator]],
        email: ['', [Validators.required, Validators.email]],
        tipo_restaurante: ['', Validators.required],
        senha: [
          '',
          [
            Validators.required,
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$%\^&\*]).{8,}$/
            ),
          ],
        ],
        confirmasenha: ['', Validators.required],
        telefone: ['', [Validators.required, this.telefoneValidator]],
        Cidade: ['', Validators.required],
        Endereco: ['', Validators.required],
      },
      { validators: [this.senhasIguaisValidator] }
    );
  }
  get f(): { [key: string]: AbstractControl } {
    return this.formulario.controls;
  }
  private senhasIguaisValidator(
    fg: AbstractControl
  ): ValidationErrors | null {
    const s = fg.get('senha')?.value;
    const c = fg.get('confirmasenha')?.value;
    if (s && c && s !== c) {
      fg.get('confirmasenha')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  private cnpjValidator(control: AbstractControl): ValidationErrors | null {
    const raw = (control.value as string) || '';
    const cnpj = raw.replace(/\D/g, '');
    console.log('Validador CNPJ:', cnpj);

    if (cnpj.length !== 14) return { cnpjInvalido: true };
    if (/^(\d)\1+$/.test(cnpj)) return { cnpjInvalido: true };

    let tamanho = cnpj.length - 2;
    let numeros = cnpj.substring(0, tamanho);
    let digitos = cnpj.substring(tamanho);
    let soma = 0;
    let pos = tamanho - 7;

    for (let i = tamanho; i >= 1; i--) {
      soma += +numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }
    let resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== +digitos.charAt(0)) return { cnpjInvalido: true };

    tamanho = tamanho + 1;
    numeros = cnpj.substring(0, tamanho);
    soma = 0;
    pos = tamanho - 7;
    for (let i = tamanho; i >= 1; i--) {
      soma += +numeros.charAt(tamanho - i) * pos--;
      if (pos < 2) pos = 9;
    }
    resultado = soma % 11 < 2 ? 0 : 11 - (soma % 11);
    if (resultado !== +digitos.charAt(1)) return { cnpjInvalido: true };

    return null;
  }
  private telefoneValidator(control: AbstractControl): ValidationErrors | null {
    const raw = (control.value as string) || '';
    const digits = raw.replace(/\D/g, '');
    if (digits.length !== 11) return { telefoneInvalido: true };
    return null;
  }

  selectedFile: File | null = null;
  previewImg: string | null = null;

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = e => this.previewImg = reader.result as string;
      reader.readAsDataURL(this.selectedFile);
  }
}




  salvarRestaurante(): void {
  if (this.formulario.invalid) {
    this.formulario.markAllAsTouched();
    return;
  }
  const dados = this.formulario.value;
  this.svc.cadastrar(dados).subscribe(
    (restaurante) => {
      if (this.selectedFile) {
        this.svc.uploadImagem(restaurante.ID, this.selectedFile).subscribe(() => {
          this.router.navigate(['/login']);
        });
      } else {
        this.router.navigate(['/login']);
      }
    },
    (err: any) => {
      alert(err.error?.message || 'Erro no cadastro.');
    }
  );
}
  cancelar(): void {
    this.router.navigate(['/']);
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
