import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  // Se quiser diferenciar cliente x restaurante, pode usar um radio no form
  tipoUsuario: 'cliente' | 'restaurante' = 'cliente';

  constructor(
    private jwtHelper: JwtHelperService,
    private fb: FormBuilder,
    private auth: AutenticacaoService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', Validators.required],
      tipo: ['cliente'],  // default
    });

    // Se já estiver logado, redireciona direto
    if (this.auth.isAuthenticated()) {
      this.router.navigate(['/menu']);
    }
  }

  mensagemErro: string | null = null;
  carregando = false;
  
  login() {
  if (this.carregando) return;

  const { email, senha, tipo } = this.loginForm.value;
  this.carregando = true;

  const login$ =
    tipo === 'cliente'
      ? this.auth.loginCliente(email, senha)
      : this.auth.loginRestaurante(email, senha);

  login$.subscribe({
    next: (res) => {
      const decodedToken = this.jwtHelper.decodeToken(res.access_token);
      const id = decodedToken.sub;

      localStorage.setItem('token', res.access_token);
      localStorage.setItem('tipo', tipo);
      localStorage.setItem('id', id);

      this.carregando = false;
      this.router.navigate(['/menu']);
    },
    error: err => {
      this.carregando = false;
      this.mensagemErro = 'Email ou senha inválidos';
      console.error('Falha na autenticação', err);
    },
  });

}


}
