import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ComplementarCadastroComponent } from './complementar-cadastro.component';

describe('ComplementarCadastroComponent', () => {
  let component: ComplementarCadastroComponent;
  let fixture: ComponentFixture<ComplementarCadastroComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ComplementarCadastroComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ComplementarCadastroComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
