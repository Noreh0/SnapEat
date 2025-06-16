import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PratoService } from '../../services/prato.service';
import { Prato } from '../../model/prato.model';


@Component({
  selector: 'app-pratos-list',
  templateUrl: './pratos-list.component.html',
  styleUrls: ['./pratos-list.component.css']
})
export class PratosListComponent implements OnInit {
  restauranteId!: number;
  restauranteNome = '';
  pratos: Prato[] = [];
  searchTerm = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: PratoService
  ) {}

  ngOnInit(): void {
    this.restauranteId = +this.route.snapshot.paramMap.get('id')!;
    // opcional: carregar nome do restaurante via outro service
    this.loadPratos();
  }

  loadPratos() {
    this.svc
      .getByRestaurante(this.restauranteId)
      .subscribe((lst) => (this.pratos = lst));
  }

  onSearch() {
    if (!this.searchTerm) {
      this.loadPratos();
    } else {
      this.svc
        .searchByName(this.searchTerm)
        .subscribe((lst) => (this.pratos = lst));
    }
  }

  editPrato(p: Prato) {
    this.router.navigate([
      '/restaurante',
      this.restauranteId,
      'pratos',
      p.ID, // <-- aqui!
      'editar'
    ]);
  }

  deletePrato(ID: number) {
    if (!confirm('Confirma exclusão?')) return;
    this.svc.delete(ID).subscribe(() => this.loadPratos());
  }
}
