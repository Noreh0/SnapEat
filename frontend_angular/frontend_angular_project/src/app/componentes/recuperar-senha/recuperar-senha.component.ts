import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AutenticacaoService } from '../../services/autenticacao.service';

@Component({
  selector: 'app-recuperar-senha',
  templateUrl: './recuperar-senha.component.html',
  styleUrls: ['./recuperar-senha.component.css']
})
export class RecuperarSenhaComponent {
  form: FormGroup;
  mensagem: string | null = null;
  erro: string | null = null;

  constructor(private fb: FormBuilder, private auth: AutenticacaoService) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  enviar() {
    if (this.form.invalid) return;
    this.mensagem = null;
    this.erro = null;
    this.auth.recuperarSenha(this.form.value.email).subscribe({
      next: () => this.mensagem = 'Se o e-mail existir, você receberá instruções para redefinir sua senha.',
      error: () => this.erro = 'Erro ao solicitar recuperação. Tente novamente.'
    });
  }
}