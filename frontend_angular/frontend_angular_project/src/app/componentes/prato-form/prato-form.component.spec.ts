import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PratoFormComponent } from './prato-form.component';

describe('PratoFormComponent', () => {
  let component: PratoFormComponent;
  let fixture: ComponentFixture<PratoFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PratoFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PratoFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
