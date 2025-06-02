import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DashboardRestauranteComponent } from './dashboard-restaurante.component';

describe('DashboardRestauranteComponent', () => {
  let component: DashboardRestauranteComponent;
  let fixture: ComponentFixture<DashboardRestauranteComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [DashboardRestauranteComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(DashboardRestauranteComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
