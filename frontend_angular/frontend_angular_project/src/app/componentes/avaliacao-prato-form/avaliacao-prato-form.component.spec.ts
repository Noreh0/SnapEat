import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvaliacaoPratoFormComponent } from './avaliacao-prato-form.component';

describe('AvaliacaoPratoFormComponent', () => {
  let component: AvaliacaoPratoFormComponent;
  let fixture: ComponentFixture<AvaliacaoPratoFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AvaliacaoPratoFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AvaliacaoPratoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
