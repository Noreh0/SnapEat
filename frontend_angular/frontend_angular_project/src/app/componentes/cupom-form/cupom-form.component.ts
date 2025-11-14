import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CupomService } from '../../services/cupom.service';
import { CupomCreateRequest } from '../../model/cupom.model';

@Component({
  selector: 'app-cupom-form',
  templateUrl: './cupom-form.component.html',
  styleUrls: ['./cupom-form.component.css'],
})
export class CupomFormComponent implements OnInit {
  formulario!: FormGroup;
  restauranteId!: number;
  isEditing = false;
  cupomId?: number;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private cupomService: CupomService
  ) {}

  ngOnInit() {
    this.restauranteId = +this.route.snapshot.paramMap.get('id')!;
    this.cupomId = this.route.snapshot.paramMap.get('cupomId') 
      ? +this.route.snapshot.paramMap.get('cupomId')! 
      : undefined;
    
    this.isEditing = !!this.cupomId;
    
    this.criarFormulario();
    
    if (this.isEditing) {
      this.carregarCupom();
    }
  }

  private criarFormulario() {
    // Data mínima: hoje + 1 dia
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const minDate = tomorrow.toISOString().split('T')[0];

    this.formulario = this.fb.group({
      titulo: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(100)]],
      descricao: ['', [Validators.maxLength(500)]],
      pontos_necessarios: [100, [Validators.required, Validators.min(10), Validators.max(10000)]],
      tipo_desconto: ['percentual', Validators.required], // 'percentual' ou 'valor'
      desconto_percentual: [10, [Validators.min(5), Validators.max(100)]],
      desconto_valor: [0, [Validators.min(0)]],
      valor_minimo: [0, [Validators.min(0)]],
      data_validade: [minDate, Validators.required],
      max_usos: [1, [Validators.required, Validators.min(1), Validators.max(1000)]],
      ativo: [true]
    }, { validators: this.validadorDesconto });
  }

  // Validador customizado para garantir que pelo menos um tipo de desconto seja definido
  private validadorDesconto(group: FormGroup) {
    const tipoDesconto = group.get('tipo_desconto')?.value;
    const descontoPercentual = group.get('desconto_percentual')?.value;
    const descontoValor = group.get('desconto_valor')?.value;

    if (tipoDesconto === 'percentual' && (!descontoPercentual || descontoPercentual <= 0)) {
      return { descontoInvalido: 'Desconto percentual deve ser maior que 0' };
    }

    if (tipoDesconto === 'valor' && (!descontoValor || descontoValor <= 0)) {
      return { descontoInvalido: 'Desconto em valor deve ser maior que 0' };
    }

    return null;
  }

  private carregarCupom() {
    if (!this.cupomId) return;

    this.cupomService.buscarPorId(this.cupomId).subscribe({
      next: (cupom) => {
        const dataValidade = cupom.data_validade 
          ? new Date(cupom.data_validade).toISOString().split('T')[0]
          : '';

        const tipoDesconto = cupom.desconto_percentual && cupom.desconto_percentual > 0 
          ? 'percentual' 
          : 'valor';

        this.formulario.patchValue({
          titulo: cupom.titulo,
          descricao: cupom.descricao || '',
          pontos_necessarios: cupom.pontos_necessarios,
          tipo_desconto: tipoDesconto,
          desconto_percentual: cupom.desconto_percentual || 10,
          desconto_valor: cupom.desconto_valor || 0,
          valor_minimo: cupom.valor_minimo || 0,
          data_validade: dataValidade,
          max_usos: cupom.max_usos || 1,
          ativo: cupom.ativo !== false
        });
      },
      error: (err) => {
        alert('Erro ao carregar cupom: ' + err.message);
        this.router.navigate(['/restaurante', this.restauranteId, 'cupons']);
      }
    });
  }

  get f() {
    return this.formulario.controls;
  }

  get tipoDesconto() {
    return this.formulario.get('tipo_desconto')?.value;
  }

  get isPercentual() {
    return this.tipoDesconto === 'percentual';
  }

  onSubmit() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const formValue = this.formulario.value;
    
    // Preparar dados do cupom
    const cupomData: CupomCreateRequest = {
      titulo: formValue.titulo.trim(),
      descricao: formValue.descricao?.trim() || '',
      pontos_necessarios: +formValue.pontos_necessarios,
      restaurante_id: this.restauranteId, // ✅ ADICIONADO: ID do restaurante
      desconto_percentual: this.isPercentual ? +formValue.desconto_percentual : undefined,
      desconto_valor: !this.isPercentual ? +formValue.desconto_valor : undefined,
      valor_minimo: +formValue.valor_minimo || 0,
      data_validade: new Date(formValue.data_validade).toISOString(),
      max_usos: +formValue.max_usos,
      ativo: formValue.ativo
    };

    const operacao = this.isEditing 
      ? this.cupomService.atualizar(this.cupomId!, cupomData)
      : this.cupomService.criar(cupomData);

    operacao.subscribe({
      next: (cupom) => {
        const mensagem = this.isEditing 
          ? 'Cupom atualizado com sucesso!' 
          : `Cupom criado com sucesso! Código: ${cupom.codigo}`;
        
        alert(mensagem);
        this.router.navigate(['/restaurante', this.restauranteId, 'cupons']);
      },
      error: (err) => {
        alert('Erro ao salvar cupom: ' + err.message);
        console.error(err);
      }
    });
  }

  cancel() {
    this.router.navigate(['/restaurante', this.restauranteId, 'cupons']);
  }

  // Helpers para validação visual
  isFieldInvalid(fieldName: string): boolean {
    const field = this.formulario.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  getFieldError(fieldName: string): string {
    const field = this.formulario.get(fieldName);
    if (!field?.errors) return '';

    const errors = field.errors;
    
    if (errors['required']) return `${fieldName} é obrigatório`;
    if (errors['minlength']) return `Mínimo ${errors['minlength'].requiredLength} caracteres`;
    if (errors['maxlength']) return `Máximo ${errors['maxlength'].requiredLength} caracteres`;
    if (errors['min']) return `Valor mínimo: ${errors['min'].min}`;
    if (errors['max']) return `Valor máximo: ${errors['max'].max}`;
    
    return 'Campo inválido';
  }
}