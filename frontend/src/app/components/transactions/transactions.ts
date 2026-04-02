import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { ApiService, Transaction, TransactionCreate, TickerSearchResult } from '../../services/api';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-transactions',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './transactions.html',
  styleUrl: './transactions.css',
})
export class Transactions implements OnInit, OnDestroy {
  transactions: Transaction[] = [];
  filteredTransactions: Transaction[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // Filters
  filterTicker: string = '';
  filterType: string = '';

  // Modal state
  showModal: boolean = false;
  isSaving: boolean = false;

  // Form fields
  ticker: string = '';
  type: 'BUY' | 'SELL' = 'BUY';
  quantity: number | null = null;
  pricePerUnit: number | null = null;
  transactionDate: string = '';
  formError: string = '';

  // Delete confirmation
  showDeleteConfirm: boolean = false;
  deletingId: string | null = null;
  isDeleting: boolean = false;

  // Ticker search
  searchResults: TickerSearchResult[] = [];
  showDropdown: boolean = false;
  isSearching: boolean = false;
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
    this.loadTransactions();
    this.setupTickerSearch();
    // Set default date to today
    this.transactionDate = new Date().toISOString().split('T')[0];
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
        this.isSearching = false;
        this.searchResults = [];
        this.cdr.detectChanges();
      }
    });
  }

  onTickerInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.ticker = value.toUpperCase();
    this.searchSubject.next(value);
  }

  selectTicker(result: TickerSearchResult): void {
    this.ticker = result.symbol;
    this.showDropdown = false;
    this.searchResults = [];
  }

  hideDropdown(): void {
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  loadTransactions(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getTransactions().subscribe({
      next: (data) => {
        this.transactions = data;
        this.applyFilters();
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = 'Failed to load transactions';
        }
        this.cdr.detectChanges();
      }
    });
  }

  applyFilters(): void {
    this.filteredTransactions = this.transactions.filter(tx => {
      const matchesTicker = !this.filterTicker ||
        tx.ticker.toLowerCase().includes(this.filterTicker.toLowerCase());
      const matchesType = !this.filterType || tx.type === this.filterType;
      return matchesTicker && matchesType;
    });
  }

  openModal(): void {
    this.resetForm();
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.ticker = '';
    this.type = 'BUY';
    this.quantity = null;
    this.pricePerUnit = null;
    this.transactionDate = new Date().toISOString().split('T')[0];
    this.formError = '';
    this.searchResults = [];
    this.showDropdown = false;
  }

  saveTransaction(): void {
    // Validate form
    if (!this.ticker || !this.quantity || !this.pricePerUnit || !this.transactionDate) {
      this.formError = 'Please fill in all fields';
      return;
    }

    if (this.quantity <= 0) {
      this.formError = 'Quantity must be greater than 0';
      return;
    }

    if (this.pricePerUnit <= 0) {
      this.formError = 'Price must be greater than 0';
      return;
    }

    this.isSaving = true;
    this.formError = '';

    const transaction: TransactionCreate = {
      ticker: this.ticker.toUpperCase(),
      type: this.type,
      quantity: this.quantity,
      price_per_unit: this.pricePerUnit,
      transaction_date: new Date(this.transactionDate).toISOString()
    };

    this.apiService.createTransaction(transaction).subscribe({
      next: () => {
        this.isSaving = false;
        this.closeModal();
        this.loadTransactions();
        this.toastService.showSuccess('Success', 'Transaction recorded successfully');
      },
      error: (error) => {
        this.isSaving = false;
        this.formError = error.error?.detail || 'Failed to create transaction';
        this.cdr.detectChanges();
      }
    });
  }

  confirmDelete(id: string): void {
    this.deletingId = id;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.deletingId = null;
    this.showDeleteConfirm = false;
  }

  deleteTransaction(): void {
    if (!this.deletingId) return;

    this.isDeleting = true;

    this.apiService.deleteTransaction(this.deletingId).subscribe({
      next: () => {
        this.isDeleting = false;
        this.cancelDelete();
        this.loadTransactions();
        this.toastService.showSuccess('Deleted', 'Transaction removed successfully');
      },
      error: () => {
        this.isDeleting = false;
        this.toastService.showError('Error', 'Failed to delete transaction');
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  }

  getTotalValue(): number {
    return this.filteredTransactions.reduce((sum, tx) => sum + tx.total_value, 0);
  }

  getBuyCount(): number {
    return this.filteredTransactions.filter(tx => tx.type === 'BUY').length;
  }

  getSellCount(): number {
    return this.filteredTransactions.filter(tx => tx.type === 'SELL').length;
  }
}
