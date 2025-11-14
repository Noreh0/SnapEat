import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { PratoService } from '../../services/prato.service';
import { Prato } from '../../model/prato.model';

@Component({
  selector: 'app-prato-form',
  templateUrl: './prato-form.component.html',
  styleUrls: ['./prato-form.component.css'],
})
export class PratoFormComponent implements OnInit {
  formulario!: FormGroup;
  restauranteId!: number;
  selectedFile?: File;
  previewImg?: string;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc: PratoService
  ) {}

  ngOnInit() {
    this.restauranteId = +this.route.snapshot.paramMap.get('id')!;
    this.formulario = this.fb.group({
      nome: ['', Validators.required],
      descricao: [''],
      preco: [null, Validators.required],
    });
  }

  get f() {
    return this.formulario.controls;
  }

  onFileSelected(ev: Event) {
    const input = ev.target as HTMLInputElement;
    if (input.files?.[0]) {
      this.selectedFile = input.files[0];
      const reader = new FileReader();
      reader.onload = () => (this.previewImg = reader.result as string);
      reader.readAsDataURL(this.selectedFile);
    }
  }

onSubmit() {
  if (this.formulario.invalid) {
    this.formulario.markAllAsTouched();
    return;
  }
  const formValue = this.formulario.value;
  const pratoPayload = {
    Nome: formValue.nome, // <-- N maiúsculo
    descricao: formValue.descricao,
    preco: formValue.preco,
    restaurante_id: this.restauranteId,
    // imagem: this.selectedFile, // <-- não é necessário enviar o arquivo aqui
    // imagem_url: será enviado depois via upload, se necessário
  };
  
  
  this.svc.create(pratoPayload).subscribe({
    next: (prato) => {
      // Se houver imagem, faça upload antes de redirecionar
      if (this.selectedFile) {
        this.svc.uploadImage(prato.ID, this.selectedFile).subscribe({
          next: () => this.router.navigate(['/restaurante', this.restauranteId, 'pratos']),
          error: (err) => {
            alert('Erro ao fazer upload da imagem!');
            console.error(err);
            this.router.navigate(['/restaurante', this.restauranteId, 'pratos']);
          }
        });
      } else {
        this.router.navigate(['/restaurante', this.restauranteId, 'pratos']);
      }
    },
    error: (err) => {
      alert('Erro ao cadastrar prato!');
      console.error(err);
    }
  });
}

  cancel() {
    this.router.navigate(['/restaurante', this.restauranteId, 'pratos']);
  }
}
