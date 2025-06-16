import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
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
  hideSenha = true;
  tipos = [
    'Arabe','Brasileira','Carnes','Chinesa','Francesa','Frango',
    'Italiana','Japonesa','Lanches','Mexicana','Peixes',
    'Pizzaria','Saudavel','Vegana','Vegetariana'
  ];


  constructor(
    private fb: FormBuilder,
    private svc: RestauranteService,
    private route: ActivatedRoute,
    private router: Router,
    private jwtHelper: JwtHelperService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    this.formulario = this.fb.group(
      {
        Nome: ['', [Validators.required, Validators.minLength(3)]],
        descricao: ['', [Validators.maxLength(200)]],
        CNPJ: [{ value: '', disabled: true }, []],           // readonly
        email: ['', [Validators.required, Validators.email]],
        tipo_restaurante: ['', Validators.required],
        senha: [
          '',
          [
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$%\^&\*]).{8,}$/
            ),
          ],
        ],
        confirmasenha: [''],
        telefone: ['', [Validators.required, Validators.minLength(15)]],
        Cidade: ['', Validators.required],
        Endereco: ['', Validators.required],
      },
      { validators: [this.senhasIguaisValidator] }
    );

    const id = +this.route.snapshot.paramMap.get('id')!;
    this.svc.buscarPorId(id).subscribe((r) => {
      // popula o form com os dados atuais
      this.formulario.patchValue({
        Nome: r.Nome,
        descricao: r.descricao,
        CNPJ: r.CNPJ,
        email: r.email,
        tipo_restaurante: r.tipo_restaurante,
        telefone: r.telefone,
        Cidade: r.Cidade,
        Endereco: r.Endereco,
      });
    });

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
    this.svc.buscarPorId(this.id).subscribe({
      next: (r: restauranteModel) => {
        this.formulario = this.fb.group({
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

  /** Facilidade para acessar controles no template */
  get f(): { [key: string]: AbstractControl } {
    return this.formulario.controls;
  }
  /** Valida se senha e confirmação batem (só se senha foi alterada) */
  private senhasIguaisValidator(fg: AbstractControl): ValidationErrors | null {
    const s = fg.get('senha')?.value;
    const c = fg.get('confirmasenha')?.value;
    if (s && c && s !== c) {
      fg.get('confirmasenha')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }
  /** Envio do form (inclui CNPJ via getRawValue) */
  onSubmit() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const dados = this.formulario.getRawValue();
    this.svc.editar(this.id, dados).subscribe(() => {
      this.router.navigate(['/dashboard-restaurante', this.id]);
    });
  }
  onCancel() {
    this.router.navigate(['/perfil-restaurante', this.route.snapshot.paramMap.get('id')]);
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
  editarRestaurante(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const data = this.formulario.getRawValue() as restauranteModel;
    this.svc.editar(this.id, data).subscribe({
      next: (restaurante) => {
        if (this.selectedFile) {
          this.svc.uploadImagem(restaurante.ID, this.selectedFile).subscribe(() => {
            this.router.navigate(['/perfilRestaurante', restaurante.ID]);
          });
        } else {
          this.router.navigate(['/perfilRestaurante', restaurante.ID]);
        }
      },
      error: (err) => {
        alert(err.error?.message || 'Falha ao editar. Tente novamente mais tarde.');
      }
    });
  }
  onCancelar(): void {
    this.router.navigate(['/perfil-restaurante', this.route.snapshot.paramMap.get('id')]);
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

