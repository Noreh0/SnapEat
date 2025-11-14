import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ModalConfirmacaoData {
  titulo: string;
  mensagem: string;
  textoBotaoConfirmar?: string;
  textoBotaoCancelar?: string;
  tipo?: 'aceitar' | 'recusar' | 'processar' | 'default';
  icone?: string;
}

@Component({
  selector: 'app-modal-confirmacao',
  templateUrl: './modal-confirmacao.component.html',
  styleUrls: ['./modal-confirmacao.component.css']
})
export class ModalConfirmacaoComponent {
  @Input() mostrar = false;
  @Input() dados: ModalConfirmacaoData = {
    titulo: 'Confirmar Ação',
    mensagem: 'Deseja continuar?',
    textoBotaoConfirmar: 'Confirmar',
    textoBotaoCancelar: 'Cancelar',
    tipo: 'default'
  };

  @Output() confirmado = new EventEmitter<void>();
  @Output() cancelado = new EventEmitter<void>();
  @Output() fechado = new EventEmitter<void>();

  confirmar(): void {
    this.confirmado.emit();
    this.fechar();
  }

  cancelar(): void {
    this.cancelado.emit();
    this.fechar();
  }

  fechar(): void {
    this.mostrar = false;
    this.fechado.emit();
  }

  // Previne o fechamento quando clica no conteúdo do modal
  pararPropagacao(event: Event): void {
    event.stopPropagation();
  }

  // Obter ícone padrão baseado no tipo
  getIconeDefault(): string {
    switch (this.dados.tipo) {
      case 'aceitar': return 'fas fa-check-circle';
      case 'recusar': return 'fas fa-times-circle';
      case 'processar': return 'fas fa-robot';
      default: return 'fas fa-question-circle';
    }
  }
}