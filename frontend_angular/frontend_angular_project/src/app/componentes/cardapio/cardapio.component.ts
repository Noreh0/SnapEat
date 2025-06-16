import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { RestauranteService } from '../../services/restaurante.service';
import { PratoService } from '../../services/prato.service';
import { restauranteModel } from '../../model/restaurante.model';
import { Prato } from '../../model/prato.model';

@Component({
  selector: 'app-cardapio',
  templateUrl: './cardapio.component.html',
  styleUrls: ['./cardapio.component.css']
})
export class CardapioComponent implements OnInit {
  restauranteId!: number;
  restaurante!: restauranteModel;
  pratos: Prato[] = [];
  filteredPratos: Prato[] = [];
  searchTerm = '';

  constructor(
    private route: ActivatedRoute,
    private restSvc: RestauranteService,
    private pratoSvc: PratoService
  ) {}

  ngOnInit(): void {
    this.restauranteId = +this.route.snapshot.paramMap.get('id')!;
    // carrega dados do restaurante
    this.restSvc.buscarPorId(this.restauranteId).subscribe(r => this.restaurante = r);

    // carrega pratos e inicializa filtro
    this.pratoSvc
      .getByRestaurante(this.restauranteId)
      .subscribe(list => {
        this.pratos = list;
        this.filteredPratos = [...list];
      });
  }

  onSearch(): void {
    const term = this.searchTerm.trim().toLowerCase();
    if (!term) {
      this.filteredPratos = [...this.pratos];
    } else {
      this.filteredPratos = this.pratos.filter(p =>
        p.Nome.toLowerCase().includes(term)
      );
    }
  }
}
