import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { JwtHelperService } from '@auth0/angular-jwt';
import { RestauranteService } from '../../services/restaurante.service';
import { restauranteModel } from '../../model/restaurante.model';

@Component({
  selector: 'app-editar-restaurante',
  templateUrl: './editar-restaurante.component.html',
  styleUrls: ['./editar-restaurante.component.css'],
})
export class EditarRestauranteComponent implements OnInit {
  formulario!: FormGroup;
  restaurante!: restauranteModel;
  id: number = 0;
  hideSenha = true;
  tipos = [
    'Arabe','Brasileira','Carnes','Chinesa','Francesa','Frango',
    'Italiana','Japonesa','Lanches','Mexicana','Peixes',
    'Pizzaria','Saudavel','Vegana','Vegetariana'
  ];
  selectedFile: File | null = null;
  previewImg: string | null = null;
  defaultAvatar: string = 'assets/images/default-restaurant.png'; // Adicionada a propriedade aqui

  constructor(
    private fb: FormBuilder,
    private svc: RestauranteService,
    private route: ActivatedRoute,
    private router: Router,
    private jwtHelper: JwtHelperService,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    // Obter ID da rota
    this.route.paramMap.subscribe(params => {
      const idParam = params.get('id');
      
      if (!idParam) {
        console.error('ID não encontrado na rota');
        this.router.navigate(['/menu']);
        return;
      }
      
      this.id = Number(idParam);
      console.log('ID do restaurante:', this.id);
      
      if (isNaN(this.id) || this.id <= 0) {
        console.error('ID inválido:', idParam);
        this.router.navigate(['/menu']);
        return;
      }
      
      // Inicializar formulário e carregar dados
      this.inicializarFormulario();
      this.carregarDadosRestaurante();
    });
  }

  private inicializarFormulario() {
    this.formulario = this.fb.group(
      {
        Nome: ['', [Validators.required, Validators.minLength(3)]],
        nome_fantasia: ['', [Validators.required, Validators.minLength(3)]],
        descricao: ['', [Validators.maxLength(200)]],
        CNPJ: [{ value: '', disabled: true }],
        email: [{ value: '', disabled: true }], // Email não editável
        tipo_restaurante: ['', Validators.required],
        senha: ['', [Validators.pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$%\^&\*]).{8,}$/)]],
        confirmasenha: [''],
        telefone: ['', [Validators.required]],
        Cidade: ['', Validators.required],
        Endereco: ['', Validators.required],
        bairro: ['', Validators.required]
      },
      { validators: [this.senhasIguaisValidator] }
    );
  }

  private carregarDadosRestaurante() {
    const token = localStorage.getItem('token');
    if (!token || this.jwtHelper.isTokenExpired(token)) {
      this.router.navigate(['/login']);
      return;
    }
    const payload = this.jwtHelper.decodeToken(token);
    if (payload.tipo !== 'restaurante' || Number(payload.sub) !== this.id) {
      this.router.navigate(['/menu']);
      return;
    }

    this.svc.buscarPorId(this.id).subscribe({
      next: (r: restauranteModel) => {
        this.restaurante = r; // Armazena o objeto completo
        this.formulario.patchValue(r);
        
        // Define a imagem de preview com a URL do Firebase
        if (r.imagem_url) {
          this.previewImg = r.imagem_url;
        }
      },
      error: (err) => {
        alert('Não foi possível carregar os dados do restaurante.');
        this.router.navigate(['/menu']);
      }
    });
  }

  handleImageError(event: Event) {
    (event.target as HTMLImageElement).src = this.defaultAvatar;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = e => this.previewImg = reader.result as string;
      reader.readAsDataURL(this.selectedFile);
    }
  }

  /** Facilidade para acessar controles no template */
  get f(): { [key: string]: AbstractControl } {
    return this.formulario.controls;
  }

  /** Valida se senha e confirmação batem (só se senha foi alterada) */
  private senhasIguaisValidator(fg: AbstractControl): ValidationErrors | null {
    const s = fg.get('senha')?.value;
    const c = fg.get('confirmasenha')?.value;
    
    // Só validar se ambos estiverem preenchidos
    if (s && c && s !== c) {
      fg.get('confirmasenha')?.setErrors({ mismatch: true });
      return { mismatch: true };
    }
    return null;
  }

  editarRestaurante(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const dadosFormulario = this.formulario.getRawValue();
    const { confirmasenha, ...dadosLimpos } = dadosFormulario;
    if (!dadosLimpos.senha) {
      delete dadosLimpos.senha;
    }

    this.svc.editar(this.id, dadosLimpos).subscribe({
      next: () => {
        if (this.selectedFile) {
          this.svc.uploadImagem(this.id, this.selectedFile).subscribe({
            next: () => this.router.navigate(['/perfil-restaurante', this.id]),
            error: () => alert('Dados atualizados, mas houve um problema ao enviar a imagem.')
          });
        } else {
          this.router.navigate(['/perfil-restaurante', this.id]);
        }
      },
      error: (err) => alert(err.error?.message || 'Falha ao editar.')
    });
  }

  onCancelar(): void {
    this.router.navigate(['/perfil-restaurante', this.id]);
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