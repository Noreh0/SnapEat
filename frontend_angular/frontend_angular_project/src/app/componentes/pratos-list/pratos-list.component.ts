import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { PratoService } from '../../services/prato.service';
import { AutenticacaoService } from '../../services/autenticacao.service';
import { Prato } from '../../model/prato.model';

@Component({
  selector: 'app-pratos-list',
  templateUrl: './pratos-list.component.html',
  styleUrls: ['./pratos-list.component.css']
})
export class PratosListComponent implements OnInit {
  restauranteId!: number;
  pratos: Prato[] = [];
  filteredPratos: Prato[] = [];
  searchTerm = '';
  isOwner = false;
  isCliente = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private svc: PratoService,
    private auth: AutenticacaoService
  ) {}

  ngOnInit(): void {
    this.restauranteId = +this.route.snapshot.paramMap.get('id')!;
    this.loadPratos();
    console.log('usuarioAtual:', this.auth.usuarioAtual);
    const usuario = this.auth.usuarioAtual;
    const tipo = usuario?.tipo; // ou 'perfil' se for esse o nome
    const restauranteIdToken = usuario?.sub || usuario?.ID || usuario?.id;
    this.isOwner = tipo === 'restaurante' && +restauranteIdToken === this.restauranteId;
    this.isCliente = tipo === 'cliente';

    this.svc.getByRestaurante(this.restauranteId).subscribe(lst => {
      this.pratos = lst;
      this.filteredPratos = lst;
    });
  }

  onSearch() {
    const term = this.searchTerm.trim().toLowerCase();
    this.filteredPratos = this.pratos.filter(p =>
      p.Nome.toLowerCase().includes(term)
    );
  }

  editPrato(p: Prato) {
    this.router.navigate([
      '/restaurante', this.restauranteId,
      'pratos', p.ID, 'editar'
    ]);
  }
  loadPratos() {
    this.svc.getByRestaurante(this.restauranteId).subscribe(pratos => {
      this.pratos = pratos;
      this.filteredPratos = pratos;
    });
  }

  deletePrato(id: number) {
    if (!confirm('Confirma exclusão?')) return;
    this.svc.delete(id).subscribe(() => {
      this.loadPratos(); // Recarrega a lista após excluir
    });
  }
}
