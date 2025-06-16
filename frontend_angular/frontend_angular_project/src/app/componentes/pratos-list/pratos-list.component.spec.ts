import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PratosListComponent } from './pratos-list.component';

describe('PratosListComponent', () => {
  let component: PratosListComponent;
  let fixture: ComponentFixture<PratosListComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PratosListComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(PratosListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
