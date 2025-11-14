import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface ModalData {
  tipo: 'grafico-evolucao' | 'grafico-mensal' | 'grafico-pratos';
  restauranteId: number;
  titulo: string;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private modalSubject = new Subject<ModalData | null>();
  public modal$ = this.modalSubject.asObservable();

  abrir(data: ModalData): void {
    this.modalSubject.next(data);
  }

  fechar(): void {
    this.modalSubject.next(null);
  }
}