import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditarAvaliacaoComponent } from './editar-avaliacao.component';

describe('EditarAvaliacaoComponent', () => {
  let component: EditarAvaliacaoComponent;
  let fixture: ComponentFixture<EditarAvaliacaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [EditarAvaliacaoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(EditarAvaliacaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
