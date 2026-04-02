import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { ApiService, GainsSummary, HoldingGains } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-gains',
  standalone: true,
  imports: [CommonModule, Navbar],
  templateUrl: './gains.html',
  styleUrl: './gains.css',
})
export class Gains implements OnInit {
  gains: GainsSummary | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadGains();
  }

  loadGains(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getGainsSummary().subscribe({
      next: (data) => {
        this.gains = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = 'Failed to load gains data';
        }
        this.cdr.detectChanges();
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  formatPercent(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  getGainClass(value: number): string {
    if (value > 0) return 'text-profit';
    if (value < 0) return 'text-loss';
    return 'text-text-secondary';
  }

  getBackgroundClass(value: number): string {
    if (value > 0) return 'bg-profit/10 border-profit/20';
    if (value < 0) return 'bg-loss/10 border-loss/20';
    return 'bg-white/5 border-white/10';
  }

  getTotalGainsBreakdown(): { realized: number; unrealized: number } {
    if (!this.gains) return { realized: 0, unrealized: 0 };
    const total = this.gains.realized_gains + this.gains.unrealized_gains;
    if (total === 0) return { realized: 50, unrealized: 50 };
    return {
      realized: Math.abs(this.gains.realized_gains / total * 100),
      unrealized: Math.abs(this.gains.unrealized_gains / total * 100)
    };
  }
}
