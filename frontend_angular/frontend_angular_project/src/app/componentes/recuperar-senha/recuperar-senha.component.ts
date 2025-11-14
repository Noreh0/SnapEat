import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-recuperar-senha',
  templateUrl: './recuperar-senha.component.html',
  styleUrls: ['./recuperar-senha.component.css']
})
export class RecuperarSenhaComponent {
  form: FormGroup;
  mensagem: string | null = null;
  erro: string | null = null;

  constructor(
    private fb: FormBuilder, 
    private auth: AutenticacaoService,
    private translate: TranslateService
    ) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  enviar() {
    if (this.form.invalid) {
      this.translate.get('RECOVER_PASSWORD.EMAIL_ERROR_INVALID').subscribe((res: string) => {
        this.erro = res;
      });
      return;
    }
    this.mensagem = null;
    this.erro = null;
    this.auth.recuperarSenha(this.form.value.email).subscribe({
      next: () => {
        this.translate.get('RECOVER_PASSWORD.SUCCESS_MESSAGE').subscribe((res: string) => {
          this.mensagem = res;
        });
      },
      error: () => {
        this.translate.get('RECOVER_PASSWORD.ERROR_MESSAGE').subscribe((res: string) => {
          this.erro = res;
        });
      }
    });
  }
}