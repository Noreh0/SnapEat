import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AvaliacaoPratoListComponent } from './avaliacao-prato-list.component';

describe('AvaliacaoPratoListComponent', () => {
  let component: AvaliacaoPratoListComponent;
  let fixture: ComponentFixture<AvaliacaoPratoListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AvaliacaoPratoListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AvaliacaoPratoListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
