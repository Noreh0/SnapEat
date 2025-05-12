import { Component, Input, OnInit } from '@angular/core';
import { restauranteModel } from '../../model/restaurante.model';

@Component({
  selector: 'app-restaurante',
  templateUrl: './restaurante.component.html',
  styleUrl: './restaurante.component.css',
})
export class RestauranteComponent implements OnInit {
  @Input() restaurante: restauranteModel = {
    ID: 0,
    Nome: '',
    descricao: '',
    CNPJ: '',
    tipo_restaurante: '',
    email: '',
    senha: '',
    telefone: '',
    Cidade: '',
    Endereco: '',
  };

  constructor() {}

  ngOnInit(): void {}

  larguraRestaurante(): string {
    if (this.restaurante.descricao.length >= 256) {
      return 'restaurante-g';
    }
    return 'restaurante-p';
  }
}
