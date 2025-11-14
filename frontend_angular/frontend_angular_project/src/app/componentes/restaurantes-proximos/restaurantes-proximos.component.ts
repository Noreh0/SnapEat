import { Component, OnInit } from '@angular/core';
import { BuscaProximosParams, RestauranteService } from '../../services/restaurante.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-restaurantes-proximos',
  templateUrl: './restaurantes-proximos.component.html',
  styleUrls: ['./restaurantes-proximos.component.css']
})
export class RestaurantesProximosComponent implements OnInit {
  restaurantes: any[] = [];
  categorias = [
    'Italiana', 'Japonesa', 'Brasileira', 'Fast Food', 
    'Chinesa', 'Vegetariana', 'Vegana', 'Pizza', 'Árabe'
  ];
  categoriaSelecionada: string = '';
  raioKm: number = 5;
  carregando = false;
  erro: string = '';

  constructor(
    private restauranteService: RestauranteService,
    private translate: TranslateService
  ) {}

  async ngOnInit() {
    await this.buscarProximos();
  }

  async buscarProximos() {
    this.carregando = true;
    this.erro = '';
    this.restaurantes = [];
    
    try {
      const position = await this.restauranteService.obterLocalizacaoAtual();
      
      const params: BuscaProximosParams = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        categoria: this.categoriaSelecionada || undefined,
        raio_km: this.raioKm
      };

      this.restauranteService.buscarProximos(params)
        .subscribe(
          (res) => {
            this.restaurantes = res.map(r => ({
              ...r,
              // Garantir que o nome do restaurante seja exibido corretamente
              nome: r.Nome || r.nome_fantasia || r.nome,

              descricao: r.descricao || r.Descricao || '',
              // Ajustar imagem_url se necessário
              imagem_url: r.imagem_url || null
            }));
            this.carregando = false;
          },
          (err) => {
            console.error('Erro ao buscar restaurantes:', err);
            this.erro = 'NEARBY.ERROR_FETCH';
            this.carregando = false;
          }
        );
    } catch (error) {
      console.error('Erro de localização:', error);
      this.erro = 'NEARBY.ERROR_LOCATION';
      this.carregando = false;
    }
  }
}