import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PerfilRestauranteComponent } from './perfil-restaurante.component';

describe('PerfilRestauranteComponent', () => {
  let component: PerfilRestauranteComponent;
  let fixture: ComponentFixture<PerfilRestauranteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PerfilRestauranteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PerfilRestauranteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
