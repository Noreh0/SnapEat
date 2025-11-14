import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantesProximosComponent } from './restaurantes-proximos.component';

describe('RestaurantesProximosComponent', () => {
  let component: RestaurantesProximosComponent;
  let fixture: ComponentFixture<RestaurantesProximosComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RestaurantesProximosComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RestaurantesProximosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
