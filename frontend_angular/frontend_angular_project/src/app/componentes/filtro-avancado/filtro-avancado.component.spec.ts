import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FiltroAvancadoComponent } from './filtro-avancado.component';

describe('FiltroAvancadoComponent', () => {
  let component: FiltroAvancadoComponent;
  let fixture: ComponentFixture<FiltroAvancadoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [FiltroAvancadoComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FiltroAvancadoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
