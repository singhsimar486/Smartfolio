import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, WatchlistItem, TickerSearchResult } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Navbar } from '../navbar/navbar';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-watchlist',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './watchlist.html',
  styleUrl: './watchlist.css',
})
export class Watchlist implements OnInit, OnDestroy {
  watchlist: WatchlistItem[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // Add modal state
  showAddModal: boolean = false;
  ticker: string = '';
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
  private searchSubject = new Subject<string>();
  private destroy$ = new Subject<void>();

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
    this.loadWatchlist();
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
    this.searchSubject.next(this.ticker);
  }

  selectTicker(result: TickerSearchResult): void {
    this.ticker = result.symbol;
    this.showDropdown = false;
    this.searchResults = [];
  }

  hideDropdown(): void {
    // Delay to allow click event to register
    setTimeout(() => {
      this.showDropdown = false;
    }, 200);
  }

  loadWatchlist(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getWatchlist().subscribe({
      next: (data) => {
        this.watchlist = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = 'Failed to load watchlist';
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Modal handlers
  openAddModal(): void {
    this.ticker = '';
    this.formError = '';
    this.isAdding = false;
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
    this.ticker = '';
    this.formError = '';
    this.searchResults = [];
    this.showDropdown = false;
    this.isSearching = false;
  }

  addToWatchlist(): void {
    this.formError = '';

    if (!this.ticker.trim()) {
      this.formError = 'Please enter a ticker symbol';
      return;
    }

    this.isAdding = true;

    this.apiService.addToWatchlist(this.ticker.trim().toUpperCase()).subscribe({
      next: () => {
        this.closeAddModal();
        this.loadWatchlist();
      },
      error: (error) => {
        this.isAdding = false;
        if (error.status === 400) {
          this.formError = error.error?.detail || 'Invalid ticker symbol or already in watchlist';
        } else {
          this.formError = 'Failed to add to watchlist';
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Delete handlers
  confirmDelete(item: WatchlistItem): void {
    this.deletingId = item.id;
    this.deletingTicker = item.ticker;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.deletingId = null;
    this.deletingTicker = '';
    this.showDeleteConfirm = false;
  }

  removeFromWatchlist(): void {
    if (!this.deletingId) return;

    this.isDeleting = true;

    this.apiService.removeFromWatchlist(this.deletingId).subscribe({
      next: () => {
        this.isDeleting = false;
        this.cancelDelete();
        this.loadWatchlist();
      },
      error: () => {
        this.isDeleting = false;
        this.errorMessage = 'Failed to remove from watchlist';
        this.cancelDelete();
        this.cdr.detectChanges();
      }
    });
  }

  formatCurrency(value: number | null): string {
    if (value === null) return 'N/A';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(value);
  }

  formatPercent(value: number | null): string {
    if (value === null) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  }

  formatChange(value: number | null): string {
    if (value === null) return 'N/A';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${this.formatCurrency(value).replace('$', '')}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  isPositive(value: number | null): boolean {
    return value !== null && value >= 0;
  }

  isNegative(value: number | null): boolean {
    return value !== null && value < 0;
  }
}
