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
import { TIPOS_RESTAURANTE } from '../../model/tipos-restaurante';
import { GeolocalizacaoService } from '../../services/geolocalizacao.service';

@Component({
  selector: 'app-cadastro-restaurante',
  templateUrl: './cadastro-restaurante.component.html',
  styleUrl: './cadastro-restaurante.component.css',
})
export class CadastroRestauranteComponent implements OnInit {
  formulario!: FormGroup;
  hideSenha = true;
  mostrarPopup = false;
  tipos: string[] = [];
  salvandoRestaurante = false;  // ✅ Flag para evitar múltiplos envios 
  constructor(
    private router: Router,
    private translate: TranslateService,
    private fb: FormBuilder,
    private svc: RestauranteService,
    private geoService: GeolocalizacaoService,
  ) {}

  ngOnInit(): void {
    console.log('Tipos de restaurante:', this.tipos); // debug
    this.svc.getTipos().subscribe(
      tipos => {
        this.tipos = tipos;
        console.log('Tipos carregados:', this.tipos);
      },
      error => {
        console.error('Erro ao carregar tipos:', error);
        alert('Erro ao carregar tipos de restaurante!');
      }
    );
    this.formulario = this.fb.group(
      {
        Nome: ['', [Validators.required, Validators.minLength(3)]],
        nome_fantasia: ['', [Validators.required, Validators.minLength(3)]],
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
        bairro: ['', Validators.required],
        latitude: [null],
        longitude: [null],
      },
      { validators: [this.senhasIguaisValidator] }
    );
  }
  async onSubmit() {
    try {
      const geoData = await this.geoService
        .buscarCoordenadas(this.formulario.value.Endereco, this.formulario.value.Cidade)
        .toPromise();

      if (geoData && geoData[0]) {
        this.formulario.patchValue({
          latitude: parseFloat(geoData[0].lat),
          longitude: parseFloat(geoData[0].lon),
          bairro: geoData[0].address?.suburb || this.formulario.value.bairro
        });
      } else {
        console.error('Erro: Coordenadas não encontradas.');
        return; // Não envia o formulário
      }

      // Debug: Verifique os valores do formulário antes de salvar
      console.log('Dados do formulário antes de salvar:', this.formulario.value);

      setTimeout(() => this.salvarRestaurante(), 0);
    } catch (error) {
      console.error('Erro ao obter coordenadas:', error);
      return; // Não envia o formulário
    }
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




// Método salvarRestaurante():
  salvarRestaurante(): void {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    // ✅ Evitar múltiplos envios
    if (this.salvandoRestaurante) {
      console.log('Cadastro já está sendo processado...');
      return;
    }

    this.salvandoRestaurante = true;  // ✅ Bloquear múltiplos envios

    // ✅ NOVA ABORDAGEM: Enviar imagem junto com o cadastro usando FormData
    if (this.selectedFile) {
      console.log('Cadastrando restaurante com imagem...');
      this.cadastrarComImagem();
    } else {
      console.log('Cadastrando restaurante sem imagem...');
      this.cadastrarSemImagem();
    }
  }

  // ✅ Método para cadastrar SEM imagem (método original)
  private cadastrarSemImagem(): void {
    const dados = {
      ...this.formulario.value,
      Nome: this.formulario.value.Nome,
      CNPJ: this.formulario.value.CNPJ,
      Endereco: this.formulario.value.Endereco,
      Cidade: this.formulario.value.Cidade
    };

    console.log('Dados enviados ao backend (sem imagem):', dados);
    
    this.svc.cadastrar(dados).subscribe(
      (restaurante) => {
        console.log('Restaurante cadastrado com sucesso (sem imagem):', restaurante);
        this.salvandoRestaurante = false;
        this.router.navigate(['/login']);
      },
      (err: any) => {
        console.error('Erro no cadastro:', err);
        this.salvandoRestaurante = false;
        alert(err.error?.message || 'Erro no cadastro.');
      }
    );
  }

  // ✅ Método para cadastrar COM imagem usando FormData
  private cadastrarComImagem(): void {
    const formData = new FormData();
    
    // Adicionar todos os campos do formulário
    Object.keys(this.formulario.value).forEach(key => {
      const value = this.formulario.value[key];
      if (value !== null && value !== undefined) {
        formData.append(key, value.toString());
      }
    });
    
    // Adicionar a imagem
    formData.append('imagem', this.selectedFile!, this.selectedFile!.name);
    
    console.log('Enviando cadastro com imagem...');
    console.log('Arquivo selecionado:', this.selectedFile);
    
    // Usar método específico para cadastro com imagem
    this.svc.cadastrarComImagem(formData).subscribe(
      (restaurante) => {
        console.log('Restaurante cadastrado com sucesso (com imagem):', restaurante);
        this.salvandoRestaurante = false;
        this.router.navigate(['/login']);
      },
      (err: any) => {
        console.error('Erro no cadastro com imagem:', err);
        this.salvandoRestaurante = false;
        
        // Se falhar o cadastro com imagem, tentar sem imagem como fallback
        if (err.status === 500 || err.status === 422) {
          console.log('Tentando cadastro sem imagem como fallback...');
          this.cadastrarSemImagem();
        } else {
          alert(err.error?.message || 'Erro no cadastro.');
        }
      }
    );
  }
  cancelar(): void {
    this.router.navigate(['/']);
  }
  verificarTipos() {
    console.log('Tipos disponíveis:', this.tipos);
    console.log('Valor atual do select:', this.formulario.get('tipo_restaurante')?.value);
  }



  habilitarBotao(): string {
    if (this.formulario.valid) {
      return 'botao';
    } else {
      return 'botao_desabilitado';
    }
  }
}
