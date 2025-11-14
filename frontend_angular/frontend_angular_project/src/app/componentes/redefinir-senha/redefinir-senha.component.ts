import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-redefinir-senha',
  templateUrl: './redefinir-senha.component.html',
  styleUrls: ['./redefinir-senha.component.css']
})
export class RedefinirSenhaComponent implements OnInit {
  form: FormGroup;
  mensagem: string | null = null;
  erro: string | null = null;
  token: string = '';
  tokenValido: boolean = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private auth: AutenticacaoService,
    private router: Router,
    private translate: TranslateService
  ) {
    this.form = this.fb.group({
      nova_senha: ['', [Validators.required, Validators.minLength(6)]],
      confirmar: ['', [Validators.required]]
    }, { validators: this.senhasIguais });
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const tokenFromUrl = params.get('token');
      
      if (tokenFromUrl) {
        this.token = tokenFromUrl;
        this.verificarToken();
      } else {
        this.translate.get('RESET_PASSWORD.TOKEN_NOT_FOUND_ERROR').subscribe((res: string) => {
          this.erro = res;
        });
      }
    });
  }

  verificarToken(): void {
    if (!this.token || this.token.split('.').length < 2) {
      this.translate.get('RESET_PASSWORD.INVALID_TOKEN_ERROR').subscribe((res: string) => {
        this.erro = res;
      });
      this.tokenValido = false;
    } else {
      this.tokenValido = true;
    }
  }

  senhasIguais(group: FormGroup) {
    return group.get('nova_senha')?.value === group.get('confirmar')?.value
      ? null : { senhasDiferentes: true };
  }

  enviar() {
    if (this.form.invalid || !this.tokenValido) return;
    this.mensagem = null;
    this.erro = null;
    
    this.auth.redefinirSenha(this.token, this.form.value.nova_senha).subscribe({
      next: () => {
        this.translate.get('RESET_PASSWORD.SUCCESS_MESSAGE').subscribe((res: string) => {
          this.mensagem = res;
        });
        setTimeout(() => this.router.navigate(['/login']), 2000);
      },
      error: (err) => {
        console.error('Erro ao redefinir senha:', err);
        const errorKey = err.error?.message || 'RESET_PASSWORD.GENERIC_ERROR';
        this.translate.get(errorKey).subscribe((res: string) => {
          this.erro = res;
        });
      }
    });
  }
}