import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { RestauranteService } from '../../services/restaurante.service';
import { FormValidations } from '../../form-validation';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-editar-restaurante',
  templateUrl: './editar-restaurante.component.html',
  styleUrl: './editar-restaurante.component.css',
})
export class EditarRestauranteComponent {
  constructor(
    private jwthelper: JwtHelperService,
    private restaurante: RestauranteService,
    private formbuild: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) {}
  hide = true;
  formulario!: FormGroup;
  email = this.route.snapshot.paramMap.get('id_restaurante');
  ngOnInit(): void {
    if (this.get() != this.email || this.get_tipo() != 'restaurante') {
      this.router.navigate(['/menu']);
    }
    this.restaurante.buscarPorEmail(this.email!).subscribe((restaurantes) => {
      for (let restaurante of restaurantes) {
        this.formulario = this.formbuild.group({
          ID: [restaurante.ID],
          Nome: [
            restaurante.Nome,
            Validators.compose([
              Validators.required,
              Validators.pattern(/(.|\s)*\S(.|\s)*/),
            ]),
          ],
          descricao: [
            restaurante.descricao,
            Validators.compose([Validators.pattern(/(.|\s)*\S(.|\s)*/)]),
          ],
          CNPJ: [
            restaurante.CNPJ,
            Validators.compose([Validators.required, Validators.minLength(14)]),
          ],
          email: [
            restaurante.email,
            Validators.compose([Validators.required, Validators.email]),
          ],
          tipo_restaurante: [
            restaurante.tipo_restaurante,
            Validators.compose([Validators.pattern(/(.|\s)*\S(.|\s)*/)]),
          ],
          senha: [
            restaurante.senha,
            Validators.compose([
              Validators.required,
              Validators.pattern('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$'),
            ]),
          ],
          confirmasenha: [
            '',
            Validators.compose([
              Validators.required,
              Validators.pattern('^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9]).{8,}$'),
              FormValidations.equalTo('senha'),
            ]),
          ],
          Cidade: [
            restaurante.Cidade,
            Validators.compose([
              Validators.required,
              Validators.pattern(/(.|\s)*\S(.|\s)*/),
            ]),
          ],
          telefone: [
            restaurante.telefone,
            Validators.compose([Validators.required, Validators.minLength(11)]),
          ],
          Endereco: [
            restaurante.Endereco,
            Validators.compose([
              Validators.required,
              Validators.pattern(/(.|\s)*\S(.|\s)*/),
            ]),
          ],
        });
      }
    });
  }

  editarRestaurante() {
    this.restaurante
      .editar(this.formulario.value, this.formulario.get('ID')!.value)
      .subscribe(() => {
        localStorage.clear();
        this.router.navigate(['/menu']);
      });
  }
  habilitarBotao(): string {
    if (this.formulario.valid) {
      return 'botao';
    } else {
      return 'botao_desabilitado';
    }
  }
  get() {
    const token = localStorage.getItem('token');
    const decodetoken = this.jwthelper.decodeToken(token!);
    if (decodetoken == null) {
      return null;
    }
    const email = decodetoken.sub;
    return email;
  }
  get_id() {
    return localStorage.getItem('id');
  }
  get_tipo() {
    return localStorage.getItem('tipo');
  }
  getLingua() {
    return this.translate.currentLang;
  }
  ValidaPlaceholderNome() {
    if (this.getLingua() == 'en') {
      return 'Type your Name';
    } else {
      return 'Digite seu Nome';
    }
  }
  ValidaPlaceholderDescricao() {
    if (this.getLingua() == 'en') {
      return 'Type the Description of the Restaurante';
    } else {
      return 'Digite a Descrição do restaurante';
    }
  }
  ValidaPlaceholderCNPJ() {
    if (this.getLingua() == 'en') {
      return 'Type your CNPJ';
    } else {
      return 'Digite seu CNPJ';
    }
  }
  ValidaPlaceholderEmail() {
    if (this.getLingua() == 'en') {
      return 'Type your Email (Ex: Email@gmail.com)';
    } else {
      return 'Digite seu Email (Ex: Email@gmail.com)';
    }
  }
  ValidaPlaceholderTipo() {
    if (this.getLingua() == 'en') {
      return 'Select the Type of the Restaurant';
    } else {
      return 'Selecione o Tipo do Restaurante';
    }
  }
  ValidaPlaceholderSenha() {
    if (this.getLingua() == 'en') {
      return 'Type your Password';
    } else {
      return 'Digite sua Senha';
    }
  }
  ValidaPlaceholderConfirma() {
    if (this.getLingua() == 'en') {
      return 'Confirm your Password';
    } else {
      return 'Confirme sua Senha';
    }
  }
  ValidaPlaceholderCidade() {
    if (this.getLingua() == 'en') {
      return 'Type your City';
    } else {
      return 'Digite sua Cidade';
    }
  }
  ValidaPlaceholderTelefone() {
    if (this.getLingua() == 'en') {
      return 'Type your Phone';
    } else {
      return 'Digite seu Telefone';
    }
  }
  ValidaPlaceholderEndereco() {
    if (this.getLingua() == 'en') {
      return 'Type the Address';
    } else {
      return 'Digite o Endereço';
    }
  }
}
