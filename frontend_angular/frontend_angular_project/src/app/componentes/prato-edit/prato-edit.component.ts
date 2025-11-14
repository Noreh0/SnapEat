import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PratoService } from '../../services/prato.service';
import { Prato } from '../../model/prato.model';

@Component({
  selector: 'app-prato-edit',
  templateUrl: './prato-edit.component.html',
  styleUrls: ['./prato-edit.component.css'],
})
export class PratoEditComponent implements OnInit {
  formulario!: FormGroup;
  restauranteId!: number;
  pratoId!: number;
  selectedFile?: File;
  previewImg?: string;
  prato!: Prato;
  carregando = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc: PratoService
  ) {}

  ngOnInit() {
    this.restauranteId = +this.route.snapshot.paramMap.get('restauranteId')!;
    this.pratoId = +this.route.snapshot.paramMap.get('pratoId')!;
    
    this.inicializarFormulario();
    this.carregarDadosPrato();
  }
  private inicializarFormulario() {
    this.formulario = this.fb.group({
      nome: ['', Validators.required],
      descricao: [''],
      preco: [null, [Validators.required, Validators.min(0)]],
    });
  }
  private carregarDadosPrato() {
    this.carregando = true;
    
    this.svc.getById(this.pratoId).subscribe({
      next: (p) => {
        this.prato = p;
        
        // Atualiza o formulário com os dados
        this.formulario.patchValue({
          nome: p.Nome,  // Atenção: campo Nome com 'N' maiúsculo no backend
          descricao: p.descricao,
          preco: p.preco,
        });
        
        // Define a imagem de preview se existir
        if (p.imagem_url) {
          this.previewImg = p.imagem_url;
        }
        
        this.carregando = false;
      },
      error: (err) => {
        console.error('Erro ao carregar prato:', err);
        alert('Não foi possível carregar os dados do prato.');
        this.router.navigate(['/restaurante', this.restauranteId, 'pratos']);
      }
    });
  }
  
  get f() {
    return this.formulario.controls;
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.selectedFile = input.files[0];
      
      // Cria preview da imagem selecionada
      const reader = new FileReader();
      reader.onload = () => (this.previewImg = reader.result as string);
      reader.readAsDataURL(this.selectedFile);
    }
  }

  // ...existing code...
onSubmit() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    
    this.carregando = true;
    const formValue = this.formulario.value;
    
    const dados = {
      Nome: formValue.nome, // N maiúsculo conforme backend
      descricao: formValue.descricao,
      preco: formValue.preco,
      restaurante_id: this.restauranteId
    };
    
    this.svc.update(this.pratoId, dados).subscribe({
      next: () => {
        // Se houver nova imagem, faz o upload
        if (this.selectedFile) {
          this.svc.uploadImage(this.pratoId, this.selectedFile).subscribe({
            next: () => {
              this.carregando = false;
              this.router.navigate(['/restaurante', this.restauranteId, 'pratos']);
            },
            error: (err) => {
              console.error('Erro no upload da imagem:', err);
              alert('Dados atualizados, mas houve um problema ao enviar a imagem.');
              this.carregando = false;
              this.router.navigate(['/restaurante', this.restauranteId, 'pratos']);
            }
          });
        } else {
          this.carregando = false;
          this.router.navigate(['/restaurante', this.restauranteId, 'pratos']);
        }
      },
      error: (err) => {
        console.error('Erro ao atualizar prato:', err);
        alert('Ocorreu um erro ao salvar as alterações.');
        this.carregando = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/restaurante', this.restauranteId, 'pratos']);
  }
}
