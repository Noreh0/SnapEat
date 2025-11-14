import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraficoComparacaoPratosComponent } from './grafico-comparacao-pratos.component';

describe('GraficoComparacaoPratosComponent', () => {
  let component: GraficoComparacaoPratosComponent;
  let fixture: ComponentFixture<GraficoComparacaoPratosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GraficoComparacaoPratosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GraficoComparacaoPratosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
