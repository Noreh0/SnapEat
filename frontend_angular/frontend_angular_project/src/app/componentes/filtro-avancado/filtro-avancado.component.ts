import { Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { RestauranteService } from '../../services/restaurante.service';

export interface FiltroAvancadoParams {
  termo?: string;
  tipo_restaurante?: string;
  cidade?: string;
  bairro?: string;
  estado?: string;
  raio_km?: number;
  latitude?: number;
  longitude?: number;
  ordenar_por?: 'distancia' | 'avaliacao' | 'nome';
}

@Component({
  selector: 'app-filtro-avancado',
  templateUrl: './filtro-avancado.component.html',
  styleUrls: ['./filtro-avancado.component.css']
})
export class FiltroAvancadoComponent implements OnInit {
  @Output() filtroAplicado = new EventEmitter<FiltroAvancadoParams>();
  
  filtroForm: FormGroup;
  mostrarFiltroAvancado = false;
  usarLocalizacaoAtual = false;
  tipos: string[] = [];
  estados = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS',
    'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC',
    'SP', 'SE', 'TO'
  ];
  
  constructor(
    private fb: FormBuilder,
    private restauranteService: RestauranteService,
    public translate: TranslateService
  ) {
    this.filtroForm = this.fb.group({
      termo: [''],
      tipo_restaurante: [''],
      estado: [''],
      cidade: [''],
      bairro: [''],
      raio_km: [5],
      ordenar_por: ['distancia']
    });
  }

  ngOnInit(): void {
    this.restauranteService.getTipos().subscribe(tipos => {
      this.tipos = tipos;
    });
  }

  toggleFiltroAvancado(): void {
    this.mostrarFiltroAvancado = !this.mostrarFiltroAvancado;
  }

  async aplicarFiltro(): Promise<void> {
    const filtro: FiltroAvancadoParams = this.filtroForm.value;
    
    if (this.usarLocalizacaoAtual) {
      try {
        const position = await this.restauranteService.obterLocalizacaoAtual();
        filtro.latitude = position.coords.latitude;
        filtro.longitude = position.coords.longitude;
      } catch (error) {
        console.error('Erro ao obter localização:', error);
      }
    }
    
    this.filtroAplicado.emit(filtro);
  }

  limparFiltros(): void {
    this.filtroForm.reset();
    this.filtroForm.patchValue({
      raio_km: 5,
      ordenar_por: 'distancia'
    });
    this.usarLocalizacaoAtual = false;
    this.aplicarFiltro();
  }

  toggleLocalizacaoAtual(): void {
    this.usarLocalizacaoAtual = !this.usarLocalizacaoAtual;
  }
}