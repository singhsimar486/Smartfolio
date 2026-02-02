import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, Dividend, DividendSummary } from '../../services/api';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-dividends',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './dividends.html',
})
export class Dividends implements OnInit {
  dividends: Dividend[] = [];
  summary: DividendSummary | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  // Add modal
  showAddModal: boolean = false;
  ticker: string = '';
  amount: number | null = null;
  paymentDate: string = '';
  isAdding: boolean = false;
  formError: string = '';

  // Delete confirmation
  showDeleteConfirm: boolean = false;
  deletingId: string | null = null;
  deletingTicker: string = '';
  isDeleting: boolean = false;

  // Filter
  selectedYear: number | null = null;
  availableYears: number[] = [];

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.generateYearOptions();
    this.loadDividends();
    this.loadSummary();
  }

  generateYearOptions(): void {
    const currentYear = new Date().getFullYear();
    this.availableYears = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      this.availableYears.push(y);
    }
  }

  loadDividends(): void {
    this.isLoading = true;
    this.apiService.getDividends(this.selectedYear || undefined).subscribe({
      next: (data) => {
        this.dividends = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load dividends';
        this.cdr.detectChanges();
      }
    });
  }

  loadSummary(): void {
    this.apiService.getDividendSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.cdr.detectChanges();
      },
      error: () => {
        // Silent fail for summary
      }
    });
  }

  onYearChange(): void {
    this.loadDividends();
  }

  openAddModal(): void {
    this.ticker = '';
    this.amount = null;
    this.paymentDate = '';
    this.formError = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  addDividend(): void {
    if (!this.ticker.trim()) {
      this.formError = 'Please enter a ticker symbol';
      return;
    }
    if (!this.amount || this.amount <= 0) {
      this.formError = 'Please enter a valid amount';
      return;
    }
    if (!this.paymentDate) {
      this.formError = 'Please select a payment date';
      return;
    }

    this.isAdding = true;

    this.apiService.addDividend({
      ticker: this.ticker.toUpperCase(),
      amount: this.amount,
      payment_date: this.paymentDate
    }).subscribe({
      next: () => {
        this.toastService.showSuccess('Dividend Added', `$${this.amount} from ${this.ticker.toUpperCase()}`);
        this.closeAddModal();
        this.loadDividends();
        this.loadSummary();
        this.isAdding = false;
      },
      error: (error) => {
        this.isAdding = false;
        this.formError = error.error?.detail || 'Failed to add dividend';
        this.cdr.detectChanges();
      }
    });
  }

  confirmDelete(dividend: Dividend): void {
    this.deletingId = dividend.id;
    this.deletingTicker = dividend.ticker;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingId = null;
  }

  deleteDividend(): void {
    if (!this.deletingId) return;

    this.isDeleting = true;
    this.apiService.deleteDividend(this.deletingId).subscribe({
      next: () => {
        this.toastService.showSuccess('Deleted', 'Dividend record removed');
        this.cancelDelete();
        this.loadDividends();
        this.loadSummary();
        this.isDeleting = false;
      },
      error: () => {
        this.isDeleting = false;
        this.toastService.showError('Error', 'Failed to delete dividend');
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getMonthlyAverage(): number {
    if (!this.summary) return 0;
    return this.summary.total_dividends / 12;
  }
}
