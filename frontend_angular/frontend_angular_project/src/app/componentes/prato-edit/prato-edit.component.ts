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

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc: PratoService
  ) {}

  ngOnInit() {
    this.restauranteId = +this.route.snapshot.paramMap.get('restauranteId')!;
    this.pratoId = +this.route.snapshot.paramMap.get('pratoId')!;
    this.formulario = this.fb.group({
      nome: ['', Validators.required],
      descricao: [''],
      preco: [null, Validators.required],
    });

    this.svc.getById(this.pratoId).subscribe((p) => {
      this.prato = p;
      this.formulario.patchValue({
        Nome: p.Nome,
        descricao: p.descricao,
        preco: p.preco,
      });
      this.previewImg = p.imagem_url;
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

  // ...existing code...
onSubmit() {
  if (this.formulario.invalid) {
    this.formulario.markAllAsTouched();
    return;
  }
  const formValue = this.formulario.value;
  const dados = {
    Nome: formValue.nome, // N maiúsculo!
    descricao: formValue.descricao,
    preco: formValue.preco,
    restaurante_id: this.restauranteId
    // não envie imagem_blob aqui, pois é feito via upload separado
  };
  this.svc.update(this.pratoId, dados).subscribe(() => {
    if (this.selectedFile) {
      this.svc.uploadImage(this.pratoId, this.selectedFile).subscribe(() => {
        this.router.navigate(['/restaurante', this.restauranteId, 'pratos']);
      });
    } else {
      this.router.navigate(['/restaurante', this.restauranteId, 'pratos']);
    }
  });
}

  cancel() {
    this.router.navigate(['/restaurante', this.restauranteId, 'pratos']);
  }
}
