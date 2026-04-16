import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, RecurringInvestment, RecurringSummary, RecurringCreate } from '../../services/api';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-recurring',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './recurring.html',
})
export class Recurring implements OnInit {
  plans: RecurringInvestment[] = [];
  summary: RecurringSummary | null = null;
  isLoading: boolean = true;
  errorMessage: string = '';

  // Add modal
  showAddModal: boolean = false;
  ticker: string = '';
  amount: number | null = null;
  frequency: string = 'MONTHLY';
  startDate: string = '';
  isAdding: boolean = false;
  formError: string = '';

  // Delete confirmation
  showDeleteConfirm: boolean = false;
  deletingId: string | null = null;
  deletingTicker: string = '';
  isDeleting: boolean = false;

  frequencies = [
    { value: 'DAILY', label: 'Daily' },
    { value: 'WEEKLY', label: 'Weekly' },
    { value: 'BIWEEKLY', label: 'Bi-weekly' },
    { value: 'MONTHLY', label: 'Monthly' }
  ];

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
    this.loadPlans();
    this.loadSummary();
  }

  loadPlans(): void {
    this.isLoading = true;
    this.apiService.getRecurringInvestments().subscribe({
      next: (data) => {
        this.plans = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load investment plans';
        this.cdr.detectChanges();
      }
    });
  }

  loadSummary(): void {
    this.apiService.getRecurringSummary().subscribe({
      next: (data) => {
        this.summary = data;
        this.cdr.detectChanges();
      },
      error: () => {}
    });
  }

  openAddModal(): void {
    this.ticker = '';
    this.amount = null;
    this.frequency = 'MONTHLY';
    this.startDate = new Date().toISOString().split('T')[0];
    this.formError = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  createPlan(): void {
    if (!this.ticker.trim()) {
      this.formError = 'Please enter a ticker symbol';
      return;
    }
    if (!this.amount || this.amount <= 0) {
      this.formError = 'Please enter a valid amount';
      return;
    }
    if (!this.startDate) {
      this.formError = 'Please select a start date';
      return;
    }

    this.isAdding = true;

    const data: RecurringCreate = {
      ticker: this.ticker.toUpperCase(),
      amount: this.amount,
      frequency: this.frequency,
      start_date: this.startDate
    };

    this.apiService.createRecurringInvestment(data).subscribe({
      next: () => {
        this.toastService.showSuccess('Plan Created', `DCA plan for ${this.ticker.toUpperCase()} created`);
        this.closeAddModal();
        this.loadPlans();
        this.loadSummary();
        this.isAdding = false;
      },
      error: (error) => {
        this.isAdding = false;
        this.formError = error.error?.detail || 'Failed to create plan';
        this.cdr.detectChanges();
      }
    });
  }

  toggleActive(plan: RecurringInvestment): void {
    this.apiService.updateRecurringInvestment(plan.id, { is_active: !plan.is_active }).subscribe({
      next: (updated) => {
        const status = updated.is_active ? 'activated' : 'paused';
        this.toastService.showSuccess('Updated', `${plan.ticker} plan ${status}`);
        this.loadPlans();
        this.loadSummary();
      },
      error: () => {
        this.toastService.showError('Error', 'Failed to update plan');
      }
    });
  }

  executePlan(plan: RecurringInvestment): void {
    this.apiService.executeRecurringInvestment(plan.id).subscribe({
      next: (updated) => {
        this.toastService.showSuccess('Executed', `Invested $${plan.amount} in ${plan.ticker}`);
        this.loadPlans();
        this.loadSummary();
      },
      error: () => {
        this.toastService.showError('Error', 'Failed to execute investment');
      }
    });
  }

  confirmDelete(plan: RecurringInvestment): void {
    this.deletingId = plan.id;
    this.deletingTicker = plan.ticker;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingId = null;
  }

  deletePlan(): void {
    if (!this.deletingId) return;

    this.isDeleting = true;
    this.apiService.deleteRecurringInvestment(this.deletingId).subscribe({
      next: () => {
        this.toastService.showSuccess('Deleted', 'Investment plan removed');
        this.cancelDelete();
        this.loadPlans();
        this.loadSummary();
        this.isDeleting = false;
      },
      error: () => {
        this.isDeleting = false;
        this.toastService.showError('Error', 'Failed to delete plan');
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

  getFrequencyLabel(freq: string): string {
    const f = this.frequencies.find(f => f.value === freq);
    return f ? f.label : freq;
  }

  getGainClass(value: number | null): string {
    if (value === null) return 'text-text-secondary';
    return value >= 0 ? 'text-gain' : 'text-loss';
  }

  getDaysUntil(dateString: string): number {
    const date = new Date(dateString);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }
}
