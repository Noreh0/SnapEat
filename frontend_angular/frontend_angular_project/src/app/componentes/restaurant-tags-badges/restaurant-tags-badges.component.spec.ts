import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RestaurantTagsBadgesComponent } from './restaurant-tags-badges.component';

describe('RestaurantTagsBadgesComponent', () => {
  let component: RestaurantTagsBadgesComponent;
  let fixture: ComponentFixture<RestaurantTagsBadgesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [RestaurantTagsBadgesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(RestaurantTagsBadgesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
