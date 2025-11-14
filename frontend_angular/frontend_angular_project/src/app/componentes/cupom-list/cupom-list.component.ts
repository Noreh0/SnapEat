import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CupomService } from '../../services/cupom.service';
import { CupomModel } from '../../model/cupom.model';

@Component({
  selector: 'app-cupom-list',
  templateUrl: './cupom-list.component.html',
  styleUrls: ['./cupom-list.component.css'],
})
export class CupomListComponent implements OnInit {
  restauranteId!: number;
  cupons: CupomModel[] = [];
  loading = true;
  error = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private cupomService: CupomService
  ) {}

  ngOnInit() {
    this.restauranteId = +this.route.snapshot.paramMap.get('id')!;
    this.carregarCupons();
  }

  carregarCupons() {
    this.loading = true;
    this.error = '';

    this.cupomService.buscarPorRestaurante(this.restauranteId).subscribe({
      next: (cupons) => {
        this.cupons = cupons;
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.loading = false;
        console.error('Erro ao carregar cupons:', err);
      }
    });
  }

  novoCupom() {
    this.router.navigate(['/restaurante', this.restauranteId, 'cupons', 'novo']);
  }

  editarCupom(cupomId: number) {
    this.router.navigate(['/restaurante', this.restauranteId, 'cupons', 'editar', cupomId]);
  }

  excluirCupom(cupom: CupomModel) {
    const confirmacao = confirm(
      `Tem certeza que deseja excluir o cupom "${cupom.titulo}"?\n\nEsta ação não pode ser desfeita.`
    );

    if (!confirmacao) return;

    this.cupomService.excluir(cupom.ID!).subscribe({
      next: () => {
        alert('Cupom excluído com sucesso!');
        this.carregarCupons(); // Recarregar lista
      },
      error: (err) => {
        alert('Erro ao excluir cupom: ' + err.message);
        console.error(err);
      }
    });
  }

  toggleAtivoCupom(cupom: CupomModel) {
    const novoStatus = !cupom.ativo;
    const acao = novoStatus ? 'ativar' : 'desativar';

    const confirmacao = confirm(
      `Deseja ${acao} o cupom "${cupom.titulo}"?`
    );

    if (!confirmacao) return;

    this.cupomService.atualizar(cupom.ID!, { ativo: novoStatus }).subscribe({
      next: (cupomAtualizado) => {
        cupom.ativo = cupomAtualizado.ativo;
        alert(`Cupom ${novoStatus ? 'ativado' : 'desativado'} com sucesso!`);
      },
      error: (err) => {
        alert('Erro ao atualizar cupom: ' + err.message);
        console.error(err);
      }
    });
  }

  voltar() {
    this.router.navigate(['/perfil-restaurante', this.restauranteId]);
  }

  // Helpers para formatação
  formatarData(dataIso: string): string {
    return new Date(dataIso).toLocaleDateString('pt-BR');
  }

  formatarDesconto(cupom: CupomModel): string {
    if (cupom.desconto_percentual && cupom.desconto_percentual > 0) {
      return `${cupom.desconto_percentual}% OFF`;
    }
    if (cupom.desconto_valor && cupom.desconto_valor > 0) {
      return `R$ ${cupom.desconto_valor.toFixed(2)} OFF`;
    }
    return 'Desconto não definido';
  }

  getStatusClass(cupom: CupomModel): string {
    if (!cupom.ativo) return 'inativo';
    if (cupom.expirado) return 'expirado';
    if (cupom.usos_restantes === 0) return 'esgotado';
    return 'ativo';
  }

  getStatusLabel(cupom: CupomModel): string {
    if (!cupom.ativo) return 'Inativo';
    if (cupom.expirado) return 'Expirado';
    if (cupom.usos_restantes === 0) return 'Esgotado';
    return 'Ativo';
  }

  isExpiradoOuInativo(cupom: CupomModel): boolean {
    return !cupom.ativo || cupom.expirado || cupom.usos_restantes === 0;
  }

  // Getters para as estatísticas
  get cuponsAtivos(): number {
    if (!this.cupons || this.cupons.length === 0) return 0;
    return this.cupons.filter(c => c && c.ativo && !c.expirado).length;
  }

  get cuponsExpirados(): number {
    if (!this.cupons || this.cupons.length === 0) return 0;
    return this.cupons.filter(c => c && c.expirado).length;
  }

  get totalUsosRealizados(): number {
    if (!this.cupons || this.cupons.length === 0) return 0;
    return this.cupons.reduce((acc, c) => {
      if (!c) return acc;
      const maxUsos = c.max_usos || 0;
      const usosRestantes = c.usos_restantes || 0;
      const usosRealizados = maxUsos - usosRestantes;
      return acc + Math.max(0, usosRealizados);
    }, 0);
  }
}