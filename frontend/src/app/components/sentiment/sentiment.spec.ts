import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Sentiment } from './sentiment';

describe('Sentiment', () => {
  let component: Sentiment;
  let fixture: ComponentFixture<Sentiment>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Sentiment]
    })
    .compileComponents();

    fixture = TestBed.createComponent(Sentiment);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
