import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AvaliacaoService } from '../../services/avaliacao.service';
import { JwtHelperService } from '@auth0/angular-jwt';

@Component({
  selector: 'app-editar-avaliacao',
  templateUrl: './editar-avaliacao.component.html',
  styleUrl: './editar-avaliacao.component.css',
})
export class EditarAvaliacaoComponent implements OnInit {
  constructor(
    private jwthelper: JwtHelperService,
    private avaliacao: AvaliacaoService,
    private formbuild: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private translate: TranslateService
  ) {}
  formulario!: FormGroup;

  id_cliente = this.route.snapshot.paramMap.get('id_cliente');
  ngOnInit(): void {
    if (this.get() != this.id_cliente || this.get_tipo() != 'cliente') {
      this.router.navigate(['/menu']);
    }
    console.log(this.id_cliente);
    const id = this.route.snapshot.paramMap.get('id_avaliacao');
    this.avaliacao.buscarPorId(parseInt(id!)).subscribe((avaliacao) => {
      this.formulario = this.formbuild.group({
        ID: [avaliacao.ID],
        ID_Cliente: [avaliacao.ID_Cliente],
        ID_Restaurante: [avaliacao.ID_Restaurante],
        Nota: [avaliacao.Nota],
        Comentario: [avaliacao.Comentario],
      });
      console.log(avaliacao.ID);
    });
  }
  editarAvaliacao() {
    this.avaliacao
      .editar(this.formulario.value)
      .subscribe(() =>
        this.router.navigate([`/perfilCliente/${this.id_cliente}`])
      );
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
  ValidaPlaceholderComentario() {
    if (this.getLingua() == 'en') {
      return 'Type a Commentary';
    } else {
      return 'Digite um Comentario';
    }
  }
}
