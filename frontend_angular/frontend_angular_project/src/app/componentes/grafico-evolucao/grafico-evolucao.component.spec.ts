import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GraficoEvolucaoComponent } from './grafico-evolucao.component';

describe('GraficoEvolucaoComponent', () => {
  let component: GraficoEvolucaoComponent;
  let fixture: ComponentFixture<GraficoEvolucaoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [GraficoEvolucaoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(GraficoEvolucaoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
