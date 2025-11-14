import { Injectable } from '@angular/core';
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';
import { Observable, from } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';
import { AutenticacaoService } from './autenticacao.service';

interface FirebaseUserData {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  emailVerified: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class FirebaseAuthService {
  user$: Observable<firebase.User | null>;
  
  constructor(
    private afAuth: AngularFireAuth,
    private http: HttpClient,
    private router: Router,
    private authService: AutenticacaoService  // Injeção do serviço
  ) {
    this.user$ = this.afAuth.authState;
  }

  // Login com Google
  async loginWithGoogle(): Promise<any> {
    try {
      const provider = new firebase.auth.GoogleAuthProvider();
      const credential = await this.afAuth.signInWithPopup(provider);
      
      if (credential.user) {
        // Verificar se o usuário já existe no backend
        const idToken = await credential.user.getIdToken();
        return this.syncUserWithBackend(credential.user, idToken);
      } else {
        throw new Error('Falha na autenticação com Google');
      }
    } catch (error) {
      console.error('Erro ao fazer login com Google:', error);
      throw error;
    }
  }

  // Login com email/senha
  async loginWithEmailPassword(email: string, password: string): Promise<any> {
    try {
      const credential = await this.afAuth.signInWithEmailAndPassword(email, password);
      
      if (credential.user) {
        const idToken = await credential.user.getIdToken();
        return this.syncUserWithBackend(credential.user, idToken);
      } else {
        throw new Error('Falha na autenticação com email/senha');
      }
    } catch (error) {
      console.error('Erro ao fazer login com email/senha:', error);
      throw error;
    }
  }

  // Cadastro com email/senha
  async registerWithEmailPassword(email: string, password: string): Promise<firebase.User> {
    try {
      const credential = await this.afAuth.createUserWithEmailAndPassword(email, password);
      if (!credential.user) {
        throw new Error('Falha ao criar usuário');
      }
      return credential.user;
    } catch (error) {
      console.error('Erro ao registrar com email/senha:', error);
      throw error;
    }
  }

  // Sincroniza usuário do Firebase com o backend
  // Corrigir o método syncUserWithBackend em firebase-auth.service.ts
  private syncUserWithBackend(user: firebase.User, idToken: string): Promise<any> {
    const userObj: FirebaseUserData = {
      uid: user.uid,
      email: user.email || '',
      displayName: user.displayName || '',
      photoURL: user.photoURL || '',
      emailVerified: user.emailVerified
    };

    // Enviar informações para o backend
    return new Promise((resolve, reject) => {
      this.http.post(`${environment.apiUrl}/auth/firebase/login`, 
        { firebaseUser: userObj, idToken }
      ).subscribe({
        next: (response: any) => {
          console.log('Resposta do backend:', response);
          
          // Se precisamos de dados complementares
          if (response.requiresAdditionalInfo) {
            console.log('Redirecionando para formulário complementar');
            
            // Armazenar temporariamente informações do Firebase
            localStorage.setItem('temp_firebase_email', user.email || '');
            localStorage.setItem('temp_firebase_name', user.displayName || '');
            localStorage.setItem('temp_firebase_uid', user.uid);
            localStorage.setItem('temp_firebase_photo', user.photoURL || '');
            
            // CORREÇÃO: Usar o Router para navegação programática em vez de manipular URL
            this.router.navigate(['/complementar-cadastro'], { 
              queryParams: { 
                uid: user.uid, 
                tipo: response.suggestedType || 'cliente',
                email: user.email,
                name: user.displayName
              }
            });
            
            resolve({requiresAdditionalInfo: true});
            return;
          }
          
          // Se já existe um usuário no sistema, login normal
          if (response.access_token) {
            localStorage.setItem('token', response.access_token);
            localStorage.setItem('tipo', response.tipo);
            localStorage.setItem('id', response.id.toString());
            
            this.authService.updateAuthState(true);
            
            // CORREÇÃO: Usar Router em vez de window.location
            if (response.tipo === 'restaurante') {
              this.router.navigate(['/perfil-restaurante', response.id]);
            } else {
              this.router.navigate(['/menu']);
            }
            
            resolve(response);
          } else {
            reject('Resposta inválida do servidor');
          }
        },
        error: (err) => {
          console.error('Erro ao sincronizar com backend:', err);
          reject(err);
        }
      });
    });
  }

  // Logout
  async logout(): Promise<void> {
    try {
      // Logout no Firebase primeiro
      await this.afAuth.signOut();
      
      // Depois usa o serviço compartilhado para logout do backend
      await this.authService.logout().toPromise();
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      
      // Limpa os dados localmente mesmo em caso de erro
      localStorage.clear();
      this.authService.updateAuthState(false);
      
      // Redirecionar para a página inicial
      this.router.navigate(['/']);
    }
  }

  // Verificar se o usuário está autenticado
  isAuthenticated(): boolean {
    return localStorage.getItem('token') !== null;
  }

  // Obter o token atual
  getCurrentToken(): string | null {
    return localStorage.getItem('token');
  }

  // Obter o tipo de usuário atual
  getUserType(): string | null {
    return localStorage.getItem('tipo');
  }

  // Obter ID do usuário atual
  getUserId(): string | null {
    return localStorage.getItem('id');
  }

  // Verifica se o usuário atual é administrador (opcional)
  isAdmin(): boolean {
    return this.getUserType() === 'admin';
  }
  logTokenInfo() {
    const token = localStorage.getItem('token');
    
    if (!token) {
      console.log("Nenhum token encontrado");
      return;
    }
    
    try {
      // Decodificar o token sem verificação
      const parts = token.split('.');
      if (parts.length !== 3) {
        console.log("Token inválido: não tem 3 partes");
        return;
      }
      
      const payload = JSON.parse(atob(parts[1]));
      console.log("Payload do token:", payload);
      console.log("Token expira em:", new Date(payload.exp * 1000).toLocaleString());
      console.log("ID do usuário no token:", payload.sub);
      console.log("Tipo do usuário no token:", payload.tipo);
      
    } catch (e) {
      console.error("Erro ao decodificar token:", e);
    }
  }
}