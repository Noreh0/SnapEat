import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ClienteService } from '../../services/cliente.service';
import { FormValidations } from '../../form-validation';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-editar-cliente',
  templateUrl: './editar-cliente.component.html',
  styleUrls: ['./editar-cliente.component.css'],
})
export class EditarClienteComponent implements OnInit {
  formulario!: FormGroup;
  id!: number;
  hide = true; // Usado para mostrar/ocultar senha se necessário

  constructor(
    private jwthelper: JwtHelperService,
    private cliente: ClienteService,
    private formbuild: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id_cliente');
    if (!idParam) return;

    this.id = parseInt(idParam);

    if (this.getIdFromToken() !== this.id || this.get_tipo() !== 'cliente') {
      this.router.navigate(['/menu']);
      return;
    }

    this.cliente.buscarPorId(this.id).subscribe(cliente => {
      this.formulario = this.formbuild.group({
        ID: [cliente.ID],
        Nome: [cliente.Nome, Validators.required],
        CPF: [cliente.CPF, [Validators.required, Validators.minLength(11)]],
        email: [cliente.email, [Validators.required, Validators.email]],
        senha: [
          cliente.senha,
          [Validators.required, Validators.pattern('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$')],
        ],
        confirmasenha: [
          '',
          [Validators.required, FormValidations.equalTo('senha')],
        ],
        Cidade: [cliente.Cidade, Validators.required],
        telefone: [cliente.telefone, [Validators.required, Validators.minLength(11)]],
      });
    });
  }

  editarCliente() {
    if (this.formulario.valid) {
      this.cliente.editar(this.formulario.value).subscribe(() => {
        localStorage.clear();
        this.router.navigate(['/menu']);
      });
    }
  }

  habilitarBotao(): string {
    return this.formulario.valid ? 'botao' : 'botao_desabilitado';
  }

  getIdFromToken(): number | null {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const decoded = this.jwthelper.decodeToken(token);
    return decoded?.sub ? parseInt(decoded.sub) : null;
  }

  get_tipo() {
    return localStorage.getItem('tipo');
  }

  getLingua() {
    return this.translate.currentLang;
  }

  ValidaPlaceholderNome() {
    return this.getLingua() === 'en' ? 'Type your Name' : 'Digite seu Nome';
  }
  ValidaPlaceholderCPF() {
    return this.getLingua() === 'en' ? 'Type your CPF' : 'Digite seu CPF';
  }
  ValidaPlaceholderEmail() {
    return this.getLingua() === 'en' ? 'Type your Email (Ex: Email@gmail.com)' : 'Digite seu Email (Ex: Email@gmail.com)';
  }
  ValidaPlaceholderSenha() {
    return this.getLingua() === 'en' ? 'Type your Password' : 'Digite sua Senha';
  }
  ValidaPlaceholderConfirma() {
    return this.getLingua() === 'en' ? 'Confirm your Password' : 'Confirme sua Senha';
  }
  ValidaPlaceholderCidade() {
    return this.getLingua() === 'en' ? 'Type your City' : 'Digite sua Cidade';
  }
  ValidaPlaceholderTelefone() {
    return this.getLingua() === 'en' ? 'Type your Phone' : 'Digite seu Telefone';
  }
}
