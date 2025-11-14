import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { AngularFireAuth } from '@angular/fire/compat/auth';

@Component({
  selector: 'app-complementar-cadastro',
  templateUrl: './complementar-cadastro.component.html',
  styleUrls: ['./complementar-cadastro.component.css']
})
export class ComplementarCadastroComponent implements OnInit {
  form: FormGroup;
  tipoUsuario: string = 'cliente';
  firebase_uid: string = '';
  email: string = '';
  nome: string = '';
  carregando: boolean = false;
  erro: string | null = null;
  tiposRestaurante: string[] = [
    'Arabe', 'Brasileira', 'Carnes', 'Chinesa', 'Francesa', 'Frango',
    'Italiana', 'Japonesa', 'Lanches', 'Mexicana', 'Peixes',
    'Pizzaria', 'Saudavel', 'Vegana', 'Vegetariana'
  ];

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private afAuth: AngularFireAuth // Adicione esta dependência
  ) {
    // Inicializar com campos vazios - serão populados no ngOnInit
    this.form = this.fb.group({});
  }

  ngOnInit() {
    console.log('ComplementarCadastroComponent iniciado');
    
    // Inicializar o Firebase se ainda não estiver inicializado
    this.initializeFirebaseIfNeeded();
    
    // Verificar se temos os parâmetros necessários
    this.route.queryParams.subscribe(params => {
      console.log('Query params recebidos:', params);
      
      // Obter valores de parâmetros ou localStorage
      this.firebase_uid = params['uid'] || localStorage.getItem('temp_firebase_uid') || '';
      this.tipoUsuario = params['tipo'] || 'cliente';
      this.email = params['email'] || localStorage.getItem('temp_firebase_email') || '';
      this.nome = params['name'] || localStorage.getItem('temp_firebase_name') || '';
      
      console.log(`Firebase UID: ${this.firebase_uid}`);
      console.log(`Tipo: ${this.tipoUsuario}`);
      console.log(`Email: ${this.email}`);
      
      if (!this.firebase_uid || !this.email) {
        console.error('Dados insuficientes para completar o cadastro');
        // Redirecionar para login se faltarem dados essenciais
        this.router.navigate(['/login']);
        return;
      }
      
      console.log('Inicializando formulário com tipo:', this.tipoUsuario);
      this.initForm();
    });
  }

  // Método para garantir que o Firebase esteja inicializado
  private initializeFirebaseIfNeeded() {
    if (!firebase.apps.length) {
      try {
        firebase.initializeApp(environment.firebase);
        console.log('Firebase inicializado com sucesso');
      } catch (err) {
        console.error('Erro ao inicializar Firebase:', err);
      }
    } else {
      console.log('Firebase já está inicializado');
    }
  }

  public initForm() {
    if (this.tipoUsuario === 'cliente') {
      this.form = this.fb.group({
        nome: [this.nome, [Validators.required]],
        email: [this.email, [Validators.required, Validators.email]],
        cpf: ['', [Validators.required, Validators.minLength(11)]],
        telefone: ['', [Validators.required]],
        cidade: ['', [Validators.required]],
        estado: ['', [Validators.required]],
        firebase_uid: [this.firebase_uid]
      });
    } else {
      this.form = this.fb.group({
        nome: [this.nome, [Validators.required]],
        email: [this.email, [Validators.required, Validators.email]],
        nome_fantasia: ['', [Validators.required]],
        cnpj: ['', [Validators.required, Validators.minLength(14)]],
        telefone: ['', [Validators.required]],
        endereco: ['', [Validators.required]],
        cidade: ['', [Validators.required]],
        estado: ['', [Validators.required]],
        bairro: ['', [Validators.required]],
        tipo_restaurante: ['', [Validators.required]],
        descricao: [''],
        latitude: [0],
        longitude: [0],
        firebase_uid: [this.firebase_uid]
      });
    }
  }

  // Método para obter token atualizado
  private async getFirebaseToken(): Promise<string | null> {
    try {
      // Primeiro, tente com o usuário atual do afAuth
      const user = await this.afAuth.currentUser;
      if (user) {
        console.log("Usuário encontrado via AngularFireAuth");
        return user.getIdToken(true);
      }

      // Se não encontrar, tente com o Firebase diretamente
      const firebaseUser = firebase.auth().currentUser;
      if (firebaseUser) {
        console.log("Usuário encontrado via firebase.auth()");
        return firebaseUser.getIdToken(true);
      }

      console.log("Nenhum usuário Firebase encontrado, tentando reautenticar");
      // Se ainda não tivermos usuário, tente reaautenticar com as credenciais guardadas
      const tempEmail = localStorage.getItem('temp_firebase_email');
      if (tempEmail) {
        // Se tivermos o email mas não conseguirmos o token, é melhor redirecionar para o login
        console.error("Não foi possível obter token para", tempEmail);
      }

      return null;
    } catch (error) {
      console.error("Erro ao obter token Firebase:", error);
      return null;
    }
  }

  async submit() {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    this.carregando = true;
    this.erro = null;

    // Obter token de autenticação do Firebase
    const idToken = await this.getFirebaseToken();
    
    if (!idToken) {
      // Se não conseguirmos o token, vamos apenas continuar com o cadastro
      // Usando o firebase_uid que já temos
      console.warn("Prosseguindo sem token de autenticação recente");
    }

    // Para restaurantes, obter coordenadas do endereço
    if (this.tipoUsuario === 'restaurante') {
      const coordenadasOk = await this.obterCoordenadas();
      if (!coordenadasOk) {
        this.carregando = false;
        return;
      }
    }

    // Adaptar os dados para o formato esperado pelo backend
    const dados = this.prepararDadosParaEnvio();
    
    // Enviar dados complementares para o backend
    const endpoint = this.tipoUsuario === 'cliente' 
      ? '/auth/firebase/completar-cliente'
      : '/auth/firebase/completar-restaurante';

    this.http.post(`${environment.apiUrl}${endpoint}`, {
      dados: dados,
      idToken: idToken || 'token-indisponivel' // Usar um placeholder se não tivermos token
    }).subscribe({
      next: (response: any) => {
        console.log('Cadastro complementar realizado com sucesso:', response);
        
        // Limpar dados temporários
        localStorage.removeItem('temp_firebase_email');
        localStorage.removeItem('temp_firebase_name');
        localStorage.removeItem('temp_firebase_uid');
        localStorage.removeItem('temp_firebase_photo');
        
        // Salvar token JWT
        localStorage.setItem('token', response.access_token);
        localStorage.setItem('tipo', response.tipo);
        localStorage.setItem('id', response.id.toString());
        
        // Redirecionar para a página inicial
        if (response.tipo === 'restaurante') {
          this.router.navigate(['/perfil-restaurante', response.id]);
        } else {
          this.router.navigate(['/menu']);
        }
      },
      error: (err) => {
        console.error('Erro ao cadastrar:', err);
        this.erro = err.error?.message || 'Ocorreu um erro ao completar o cadastro. Por favor, tente novamente.';
        this.carregando = false;
      }
    });
  }

  // Método para adaptar campos de acordo com o backend
  private prepararDadosParaEnvio() {
    const formValues = this.form.value;
    
    if (this.tipoUsuario === 'cliente') {
      return {
        ...formValues,
        // Formatando campos para o modelo do backend
        Nome: formValues.nome, // Ajuste de maiúscula
        CPF: formValues.cpf,
        firebase_uid: this.firebase_uid,
        Cidade: `${formValues.cidade}/${formValues.estado}` // Combinando cidade e estado
      };
    } else {
      return {
        ...formValues,
        // Formatando campos para o modelo do backend
        Nome: formValues.nome, // Ajuste de maiúscula
        CNPJ: formValues.cnpj, // Ajuste de maiúscula
        Endereco: formValues.endereco, // Ajuste de maiúscula
        Cidade: `${formValues.cidade}/${formValues.estado}`, // Combinando cidade e estado
        firebase_uid: this.firebase_uid
      };
    }
  }

  async obterCoordenadas() {
    if (this.tipoUsuario === 'restaurante') {
      try {
        const endereco = this.form.get('endereco')?.value;
        const cidade = this.form.get('cidade')?.value;
        const estado = this.form.get('estado')?.value;
        
        if (endereco && cidade && estado) {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${endereco},${cidade},${estado},Brasil`
          );
          
          const data = await response.json();
          if (data && data.length > 0) {
            this.form.patchValue({
              latitude: parseFloat(data[0].lat),
              longitude: parseFloat(data[0].lon)
            });
            return true;
          } else {
            this.erro = "Não foi possível obter as coordenadas para o endereço informado.";
          }
        }
      } catch (error) {
        console.error("Erro ao obter coordenadas:", error);
        this.erro = "Erro ao obter coordenadas geográficas.";
      }
      return false;
    }
    return true;
  }

  alternarTipoUsuario() {
    this.tipoUsuario = this.tipoUsuario === 'cliente' ? 'restaurante' : 'cliente';
    this.initForm();
  }
}