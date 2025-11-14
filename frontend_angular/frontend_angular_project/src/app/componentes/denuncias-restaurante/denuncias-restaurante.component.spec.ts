import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DenunciasRestauranteComponent } from './denuncias-restaurante.component';

describe('DenunciasRestauranteComponent', () => {
  let component: DenunciasRestauranteComponent;
  let fixture: ComponentFixture<DenunciasRestauranteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DenunciasRestauranteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DenunciasRestauranteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
