import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraficoMensalComparativoComponent } from './grafico-mensal-comparativo.component';

describe('GraficoMensalComparativoComponent', () => {
  let component: GraficoMensalComparativoComponent;
  let fixture: ComponentFixture<GraficoMensalComparativoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GraficoMensalComparativoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GraficoMensalComparativoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
