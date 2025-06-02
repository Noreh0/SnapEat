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
  carregando = false;
  mensagemErro: string | null = null;

  constructor(
    private fb: FormBuilder,
    private auth: AutenticacaoService,
    private jwtHelper: JwtHelperService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required]],
    });

    // Se já houver token válido, redireciona
    const token = localStorage.getItem('token');
    if (token && !this.jwtHelper.isTokenExpired(token)) {
      // Decide rota por tipo armazenado
      const tipo = localStorage.getItem('tipo');
      this.irParaHome(tipo);
    }
  }

  login(): void {
    if (this.carregando) return;
    this.mensagemErro = null;

    if (this.loginForm.invalid) {
      this.mensagemErro = 'Preencha e-mail e senha corretamente.';
      return;
    }

    const { email, senha } = this.loginForm.value;
    this.carregando = true;

    this.auth.login(email, senha).subscribe({
      next: (res) => {
        // 1) Armazena token
        localStorage.setItem('token', res.access_token);

        // 2) Decodifica payload
        const payload = this.jwtHelper.decodeToken(res.access_token);
        // payload.sub === número de ID
        // payload.tipo === string 'cliente' ou 'restaurante'
        const id = Number(payload.sub);
        const tipo = payload.tipo as string;

        // 3) Salva no localStorage
        localStorage.setItem('id', String(id));
        localStorage.setItem('tipo', tipo);

        // 4) Redireciona conforme tipo
        this.irParaHome(tipo);
        this.carregando = false;
      },
      error: (err) => {
        console.error('Falha na autenticação', err);
        this.mensagemErro = 'E-mail ou senha inválidos.';
        this.carregando = false;
      },
    });
  }

  private irParaHome(tipo: string | null) {
    if (tipo === 'restaurante') {
      this.router.navigate(['/dashboard-restaurante']);
    } else {
      // padrão cliente ou null
      this.router.navigate(['/menu']);
    }
  }
}
