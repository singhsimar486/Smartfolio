import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, StockComparison } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-compare',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './compare.html',
})
export class Compare {
  ticker1: string = '';
  ticker2: string = '';
  comparison: StockComparison | null = null;
  isLoading: boolean = false;
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
  }

  compare(): void {
    if (!this.ticker1.trim() || !this.ticker2.trim()) {
      this.errorMessage = 'Please enter both ticker symbols';
      return;
    }

    if (this.ticker1.toUpperCase() === this.ticker2.toUpperCase()) {
      this.errorMessage = 'Please enter two different stocks';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.comparison = null;

    this.apiService.compareStocks(this.ticker1.toUpperCase(), this.ticker2.toUpperCase()).subscribe({
      next: (data) => {
        this.comparison = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.detail || 'Failed to compare stocks';
        this.cdr.detectChanges();
      }
    });
  }

  formatCurrency(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatPercent(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    return value.toFixed(2) + '%';
  }

  formatNumber(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatMarketCap(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'N/A';
    if (value >= 1e12) return '$' + (value / 1e12).toFixed(2) + 'T';
    if (value >= 1e9) return '$' + (value / 1e9).toFixed(2) + 'B';
    if (value >= 1e6) return '$' + (value / 1e6).toFixed(2) + 'M';
    return this.formatCurrency(value);
  }

  getChangeClass(value: number | null | undefined): string {
    if (value === null || value === undefined) return 'text-text-secondary';
    return value >= 0 ? 'text-gain' : 'text-loss';
  }

  getBetterClass(value1: number | null | undefined, value2: number | null | undefined, higherBetter: boolean = true): string {
    if (value1 === null || value1 === undefined || value2 === null || value2 === undefined) return '';
    if (higherBetter) {
      return value1 > value2 ? 'text-gain' : value1 < value2 ? 'text-loss' : '';
    }
    return value1 < value2 ? 'text-gain' : value1 > value2 ? 'text-loss' : '';
  }

  clearComparison(): void {
    this.ticker1 = '';
    this.ticker2 = '';
    this.comparison = null;
    this.errorMessage = '';
  }
}
