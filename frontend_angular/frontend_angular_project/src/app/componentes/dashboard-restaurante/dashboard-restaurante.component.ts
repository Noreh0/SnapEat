import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-dashboard-restaurante',
  templateUrl: './dashboard-restaurante.component.html',
  styleUrls: ['./dashboard-restaurante.component.css']
})
export class DashboardRestauranteComponent implements OnInit {
  restauranteId: string | null = null;
  avaliacoes: any[] = [];

  constructor() {}

  ngOnInit(): void {
    this.restauranteId = localStorage.getItem('id'); // ID do restaurante logado
    // Em breve: chamada ao serviço para buscar as avaliações
  }
}
