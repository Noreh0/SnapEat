import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators
} from '@angular/forms';
import {
  ActivatedRoute,
  Router
} from '@angular/router';
import { AvaliacaoPratoService } from '../../services/avaliacao-prato.service';
import { AvaliacaoPrato } from '../../model/avaliacao-prato.model';
import { Prato } from '../../model/prato.model';
import { PratoService } from '../../services/prato.service';
import { AutenticacaoService } from '../../services/autenticacao.service';

@Component({
  selector: 'app-avaliacao-prato-form',
  templateUrl: './avaliacao-prato-form.component.html',
  styleUrls: ['./avaliacao-prato-form.component.css'],
})
export class AvaliacaoPratoFormComponent implements OnInit {
  formulario!: FormGroup;
  pratoId!: number;
  avalId?: number;
  prato?: Prato;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private svc: AvaliacaoPratoService,
    private auth: AutenticacaoService,
    private pratoService: PratoService
  ) {}

  ngOnInit() {
  this.pratoId = +this.route.snapshot.paramMap.get('pratoId')!;
  this.avalId   = this.route.snapshot.paramMap.get('id') 
                ? +this.route.snapshot.paramMap.get('id')! 
                : undefined;

  // Pegue o ID do cliente logado
  const usuario = this.auth.getDecodedToken();
  console.log('Token decodificado:', usuario);
  const idCliente = usuario?.sub || usuario?.ID || usuario?.id || usuario?.user_id;

  if (!idCliente) {
    alert('Você precisa estar logado para avaliar um prato.');
    this.router.navigate(['/login']);
    return;
  }

  this.formulario = this.fb.group({
    Nota: ['', Validators.required],
    Comentario: ['', [Validators.required, Validators.minLength(10)]],
    ID_Cliente: [idCliente, Validators.required],
    ID_Prato: [this.pratoId, Validators.required]
  });

  this.pratoService.getById(this.pratoId).subscribe((prato: Prato) => {
    this.prato = prato;
  });

  if (!idCliente) {
    // Mostre uma mensagem de erro ou redirecione para login
    alert('Você precisa estar logado para avaliar um prato.');
    this.router.navigate(['/login']);
    return;
  }

  if (this.avalId) {
    this.svc.getById(this.avalId).subscribe(av => {
      this.formulario.patchValue(av);
    });
  }
}

  get f() {
    return this.formulario.controls;
  }

  onSubmit() {
    console.log(this.formulario.value, this.formulario.valid, this.formulario.errors);
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    const data: Partial<AvaliacaoPrato> = this.formulario.value;
    const obs = this.avalId
      ? this.svc.update(this.avalId, data)
      : this.svc.create(data as AvaliacaoPrato);

    obs.subscribe(() => {
      this.router.navigate(['/prato', this.pratoId, 'avaliacoes']);
    });
  }

  cancel() {
    this.router.navigate(['/prato', this.pratoId, 'avaliacoes']);
  }
}
