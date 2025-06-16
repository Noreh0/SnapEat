import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AutenticacaoService } from '../../services/autenticacao.service';

@Component({
  selector: 'app-redefinir-senha',
  templateUrl: './redefinir-senha.component.html',
  styleUrls: ['./redefinir-senha.component.css']
})
export class RedefinirSenhaComponent {
  form: FormGroup;
  mensagem: string | null = null;
  erro: string | null = null;
  token: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private auth: AutenticacaoService,
    private router: Router
  ) {
    this.token = this.route.snapshot.paramMap.get('token')!;
    this.form = this.fb.group({
      nova_senha: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', [Validators.required]]
    }, { validators: this.senhasIguais });
  }

  senhasIguais(group: FormGroup) {
    return group.get('nova_senha')?.value === group.get('confirmar')?.value
      ? null : { senhasDiferentes: true };
  }

  enviar() {
    if (this.form.invalid) return;
    this.mensagem = null;
    this.erro = null;
    this.auth.redefinirSenha(this.token, this.form.value.nova_senha).subscribe({
      next: () => {
        this.mensagem = 'Senha redefinida com sucesso!';
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => this.erro = err.error?.message || 'Erro ao redefinir senha.'
    });
  }
}