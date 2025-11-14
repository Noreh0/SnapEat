import { TestBed } from '@angular/core/testing';

import { NlpService } from './nlp.service.service';

describe('NlpService', () => {
  let service: NlpService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NlpService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
