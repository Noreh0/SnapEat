import { Component, OnInit } from '@angular/core';
import { ClienteService } from '../../services/cliente.service';
import { Router } from '@angular/router';
import {
  FormBuilder,
  FormGroup,
  Validators,
  AbstractControl,
  ValidationErrors
} from '@angular/forms';
import { clienteModel } from '../../model/cliente.model';
import { generate } from 'rxjs';

@Component({
  selector: 'app-editar-cliente',
  templateUrl: './editar-cliente.component.html',
  styleUrls: ['./editar-cliente.component.css'],
})
export class EditarClienteComponent implements OnInit {
  formulario!: FormGroup;
  cliente!: clienteModel; // Armazenar o objeto completo do cliente
  hideSenha = true;
  defaultAvatar = 'assets/images/usuario.png';

  constructor(
    private fb: FormBuilder,
    private clienteService: ClienteService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.iniciarFormulario();
    this.carregarDadosCliente();
  }

  /**
   * Inicializa o FormGroup com as validações:
   * - Nome: obrigatório, mínimo 3 caracteres
   * - CPF: obrigatório, tamanho mínimo 14 (com máscara), validador customizado
   * - Email: obrigatório, Validators.email
   * - Senha: obrigatório, regex para senha forte
   * - ConfirmaSenha: obrigatório, verificação de igualdade (mismatch)
   * - Cidade: obrigatório
   * - Telefone: obrigatório, tamanho mínimo 15 (máscara “(00) 0 0000-0000”)
   */
  private iniciarFormulario() {
    this.formulario = this.fb.group(
      {
        Nome: ['', [Validators.required, Validators.minLength(3)]],
        CPF: ['', [Validators.required, this.cpfValidator]],
        email: ['', [Validators.required, Validators.email]],
        senha: ['',
          [
            // A senha não é obrigatória na edição, mas se for preenchida, deve ser forte
            Validators.pattern(
              /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#\$%\^&\*])[A-Za-z\d!@#\$%\^&\*]{8,}$/
            ),
          ],
        ],
        confirmasenha: [''],
        Cidade: ['', [Validators.required]],
        telefone: ['', [Validators.required, this.telefoneValidator]],
        rede_social: ['', [this.urlValidator]] // Campo opcional para link da rede social
      },
      {
        validators: [this.senhasIguaisValidator],
      }
    );
  }

  /**
   * Carrega, por exemplo, via serviço, os dados do cliente logado
   * e faz patchValue no formulário (exemplo ilustrativo).
   */
  private carregarDadosCliente() {
  const id = localStorage.getItem('id');
  if (!id) {
    alert('Usuário não identificado!');
    this.router.navigate(['/login']);
    return;
  }

  this.clienteService.buscarPorId(Number(id)).subscribe({
      next: (cliente) => {
        this.cliente = cliente; // Armazena o objeto cliente
        this.formulario.patchValue({
          Nome: cliente.Nome,
          CPF: cliente.CPF,
          email: cliente.email,
          Cidade: cliente.Cidade,
          telefone: cliente.telefone,
          rede_social: cliente.rede_social || ''
        });
      },
      error: () => {
        alert('Erro ao carregar dados do cliente.');
        this.router.navigate(['/login']);
      }
    });
  }

  /**
   * Valida se a senha e a confirmação são iguais.
   * Se diferentes, marca o erro 'mismatch' em 'confirmasenha'.
   */
  private senhasIguaisValidator(formGroup: AbstractControl): ValidationErrors | null {
    const senha = formGroup.get('senha')?.value;
    const confirmasenha = formGroup.get('confirmasenha')?.value;

    if (senha && confirmasenha && senha !== confirmasenha) {
      formGroup.get('confirmasenha')?.setErrors({ mismatch: true });
      return { mismatch: true };
    } else {
      // Se não houver erro, removemos qualquer marcação anterior.
      if (formGroup.get('confirmasenha')?.hasError('mismatch')) {
        formGroup.get('confirmasenha')?.setErrors(null);
      }
      return null;
    }
  }
  handleImageError(event: Event) {
    (event.target as HTMLImageElement).src = this.defaultAvatar;
  }

  /**
   * Validador customizado de CPF:
   * - Retira pontuação, faz cálculo dos dígitos verificadores,
   *   e devolve erro se inválido.
   */
  cpfValidator(control: AbstractControl): ValidationErrors | null {
    const cpfFormato = control.value as string;
    if (!cpfFormato) {
      return null; // Será tratado pelo Validators.required
    }

    // Remover pontos e traço
    const cpf = cpfFormato.replace(/\D/g, '');

    if (cpf.length !== 11) {
      return { cpfInvalido: true };
    }

    // Elimina CPFs conhecidos inválidos (todos os dígitos iguais)
    if (/^(\d)\1+$/.test(cpf)) {
      return { cpfInvalido: true };
    }

    // Função interna para calcular dígito verificador
    const calcularDigito = (strCpf: string, pos: number): number => {
      let soma = 0;
      let peso = pos;
      for (let i = 0; i < pos - 1; i++) {
        soma += parseInt(strCpf.charAt(i), 10) * peso--;
      }
      const resto = soma % 11;
      return resto < 2 ? 0 : 11 - resto;
    };

    const digito1 = calcularDigito(cpf, 10);
    const digito2 = calcularDigito(cpf, 11);

    if (
      digito1 !== parseInt(cpf.charAt(9), 10) ||
      digito2 !== parseInt(cpf.charAt(10), 10)
    ) {
      return { cpfInvalido: true };
    }

    return null; // CPF válido
  }
  telefoneValidator(control: AbstractControl): ValidationErrors | null {
    const value = control.value ? control.value.replace(/\D/g, '') : '';
    // Telefone brasileiro: 11 dígitos (ex: 11999999999)
    if (value.length !== 11) {
      return { telefoneIncompleto: true };
    }
    return null;
  }

  /**
   * Quando o usuário clica para “Salvar Alterações”.
   * Caso o formulário seja válido, envia para o backend.
   */
  // No método editarCliente():
  editarCliente() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const dadosForm = this.formulario.value;
    
    // Só incluir a senha se ela foi preenchida
    if (!dadosForm.senha) {
      delete dadosForm.senha;
      delete dadosForm.confirmasenha;
    }

    const dadosAtualizados = {
      ...this.cliente, // Mantém ID e outros dados não editáveis
      ...dadosForm, // Sobrescreve com os dados do formulário
    };

    this.clienteService.editar(dadosAtualizados).subscribe({
      next: () => {
        alert('Perfil atualizado com sucesso!');
        this.router.navigate(['/perfilCliente', dadosAtualizados.ID]);
      },
      error: (err) => {
        console.error('Erro ao atualizar perfil:', err);
        alert('Erro ao atualizar perfil. Tente novamente.');
      }
    });
  }

  /**
   * Exemplo de função para trocar avatar (abre modal, etc).
   */
  onTrocarAvatar() {
    // Lógica para upload de imagem
    // Ex: this.router.navigate(['/perfil/upload-foto']);
    alert('Funcionalidade de upload de foto a ser implementada.');
  }

  // Validador customizado para URLs de rede social
  urlValidator(control: AbstractControl): ValidationErrors | null {
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
