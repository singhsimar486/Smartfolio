import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, PriceAlert, TickerSearchResult } from '../../services/api';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { Navbar } from '../navbar/navbar';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-alerts',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './alerts.html',
  styleUrl: './alerts.css',
})
export class Alerts implements OnInit, OnDestroy {
  alerts: PriceAlert[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // Add modal state
  showAddModal: boolean = false;
  ticker: string = '';
  targetPrice: number | null = null;
  condition: string = 'ABOVE';
  isAdding: boolean = false;
  formError: string = '';

  // Delete confirmation
  showDeleteConfirm: boolean = false;
  deletingId: string | null = null;
  deletingTicker: string = '';
  isDeleting: boolean = false;

  // Ticker search
  searchResults: TickerSearchResult[] = [];
  showDropdown: boolean = false;
  isSearching: boolean = false;
  selectedStockName: string = '';
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

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
    this.loadAlerts();
    this.setupTickerSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupTickerSearch(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(query => {
      if (query.length >= 1) {
        this.performSearch(query);
      } else {
        this.searchResults = [];
        this.showDropdown = false;
      }
    });
  }

  private performSearch(query: string): void {
    this.isSearching = true;
    this.apiService.searchTickers(query).subscribe({
      next: (response) => {
        this.searchResults = response.results;
        this.showDropdown = this.searchResults.length > 0;
        this.isSearching = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.searchResults = [];
        this.showDropdown = false;
        this.isSearching = false;
        this.cdr.detectChanges();
      }
    });
  }

  onTickerInput(): void {
    this.selectedStockName = '';
    this.searchSubject.next(this.ticker);
  }

  selectTicker(result: TickerSearchResult): void {
    this.ticker = result.symbol;
    this.selectedStockName = result.name;
    this.showDropdown = false;
    this.searchResults = [];
  }

  hideDropdown(): void {
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  loadAlerts(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getAlerts().subscribe({
      next: (data) => {
        this.alerts = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = 'Failed to load alerts';
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Modal handlers
  openAddModal(): void {
    this.ticker = '';
    this.targetPrice = null;
    this.condition = 'ABOVE';
    this.formError = '';
    this.isAdding = false;
    this.selectedStockName = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.ticker = '';
    this.targetPrice = null;
    this.condition = 'ABOVE';
    this.formError = '';
    this.searchResults = [];
    this.showDropdown = false;
    this.isSearching = false;
    this.selectedStockName = '';
  }

  createAlert(): void {
    this.formError = '';

    if (!this.ticker.trim()) {
      this.formError = 'Please enter a ticker symbol';
      return;
    }

    if (!this.targetPrice || this.targetPrice <= 0) {
      this.formError = 'Please enter a valid target price';
      return;
    }

    this.isAdding = true;

    this.apiService.createAlert({
      ticker: this.ticker.trim().toUpperCase(),
      condition: this.condition,
      target_price: this.targetPrice
    }).subscribe({
      next: () => {
        this.toastService.showSuccess('Alert Created', `Price alert for ${this.ticker.toUpperCase()} has been created`);
        this.closeAddModal();
        this.loadAlerts();
      },
      error: (error) => {
        this.isAdding = false;
        if (error.status === 400) {
          this.formError = error.error?.detail || 'Invalid ticker symbol or alert data';
        } else {
          this.formError = 'Failed to create alert';
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Toggle active/inactive
  toggleAlert(alert: PriceAlert): void {
    this.apiService.updateAlert(alert.id, { is_active: !alert.is_active }).subscribe({
      next: (updated) => {
        const index = this.alerts.findIndex(a => a.id === alert.id);
        if (index !== -1) {
          this.alerts[index] = updated;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        this.toastService.showError('Error', 'Failed to update alert');
      }
    });
  }

  // Reset triggered alert
  resetAlert(alert: PriceAlert): void {
    this.apiService.resetAlert(alert.id).subscribe({
      next: (updated) => {
        const index = this.alerts.findIndex(a => a.id === alert.id);
        if (index !== -1) {
          this.alerts[index] = updated;
          this.cdr.detectChanges();
        }
        this.toastService.showSuccess('Alert Reset', `${alert.ticker} alert has been reset`);
      },
      error: () => {
        this.toastService.showError('Error', 'Failed to reset alert');
      }
    });
  }

  // Delete handlers
  confirmDelete(alert: PriceAlert): void {
    this.deletingId = alert.id;
    this.deletingTicker = alert.ticker;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.deletingId = null;
    this.deletingTicker = '';
    this.showDeleteConfirm = false;
  }

  deleteAlert(): void {
    if (!this.deletingId) return;

    this.isDeleting = true;

    this.apiService.deleteAlert(this.deletingId).subscribe({
      next: () => {
        this.isDeleting = false;
        this.toastService.showSuccess('Alert Deleted', `${this.deletingTicker} alert has been removed`);
        this.cancelDelete();
        this.loadAlerts();
      },
      error: () => {
        this.isDeleting = false;
        this.toastService.showError('Error', 'Failed to delete alert');
        this.cancelDelete();
        this.cdr.detectChanges();
      }
    });
  }

  // Helpers
  formatCurrency(value: number | null): string {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  formatDateTime(dateString: string | null): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  getConditionText(condition: string): string {
    return condition === 'ABOVE' ? 'goes above' : 'goes below';
  }

  getConditionIcon(condition: string): string {
    return condition === 'ABOVE' ? 'M5 10l7-7m0 0l7 7m-7-7v18' : 'M19 14l-7 7m0 0l-7-7m7 7V3';
  }

  isNearTarget(alert: PriceAlert): boolean {
    if (!alert.current_price || alert.is_triggered) return false;
    const diff = Math.abs(alert.current_price - alert.target_price);
    const percentDiff = (diff / alert.target_price) * 100;
    return percentDiff <= 5;
  }

  getActiveCount(): number {
    return this.alerts.filter(a => a.is_active && !a.is_triggered).length;
  }

  getTriggeredCount(): number {
    return this.alerts.filter(a => a.is_triggered).length;
  }
}
