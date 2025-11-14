import { Router } from '@angular/router';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { JwtHelperService } from '@auth0/angular-jwt';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { FirebaseAuthService } from '../../services/firebase-auth.service';
import { TranslateService } from '@ngx-translate/core';

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
    private router: Router,
    private firebaseAuth: FirebaseAuthService,
    private translate: TranslateService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      senha: ['', [Validators.required]]
    });
  }

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
  async loginComGoogle() {
    try {
      this.carregando = true;
      this.mensagemErro = '';
      
      console.log('Iniciando login com Google...');
      const result = await this.firebaseAuth.loginWithGoogle();
      console.log('Login com Google resultado:', result);
      
      // Se o login requer informações adicionais
      if (result && result.requiresAdditionalInfo) {
        console.log('Redirecionamento para completar cadastro será feito pelo serviço');
        // O serviço já faz o redirecionamento, não precisamos fazer nada aqui
        return;
      } 
      
      // Se chegou aqui, o login foi bem-sucedido
      const tipo = localStorage.getItem('tipo');
      const id = localStorage.getItem('id');
      console.log(`Redirecionando usuário tipo: ${tipo}, id: ${id}`);
      
      if (tipo && id) {
        this.irParaHome(tipo, Number(id));
      } else {
        console.error('Tipo ou ID não encontrados após login');
        this.translate.get('LOGIN.ERROR_PROCESSING_INFO').subscribe((res: string) => {
          this.mensagemErro = res;
        });
      }
    } catch (error: any) {
      console.error('Erro ao fazer login com Google:', error);
      this.translate.get('LOGIN.ERROR_GOOGLE_LOGIN').subscribe((res: string) => {
        this.mensagemErro = res;
      });
    } finally {
      this.carregando = false;
    }
  }
  abrirRecuperarSenha() {
    this.router.navigate(['/recuperar-senha']);
  }

  login(): void {
    if (this.carregando) return;
    this.mensagemErro = null;

    if (this.loginForm.invalid) {
      this.translate.get('LOGIN.ERROR_FILL_FIELDS').subscribe((res: string) => {
        this.mensagemErro = res;
      });
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
        this.irParaHome(tipo, id);
        this.carregando = false;
      },
      error: (err) => {
        console.error('Falha na autenticação', err);
        this.translate.get('LOGIN.ERROR_INVALID_CREDENTIALS').subscribe((res: string) => {
          this.mensagemErro = res;
        });
        this.carregando = false;
      },
    });
  }
  

  private irParaHome(tipo: string | null, id?: number | string) {
    if (tipo === 'restaurante' && id) {
      this.router.navigate(['/dashboard-restaurante', id]);
    } else {
      // padrão cliente ou null
      this.router.navigate(['/menu']);
    }
  }
}
