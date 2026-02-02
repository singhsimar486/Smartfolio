import { Component, OnInit, ChangeDetectorRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Holding, HoldingCreate, TickerSearchResult, HoldingImportItem, HoldingImportPreview } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Navbar } from '../navbar/navbar';
import { Router } from '@angular/router';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';

@Component({
  selector: 'app-holdings',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './holdings.html',
  styleUrl: './holdings.css',
})
export class Holdings implements OnInit, OnDestroy {
  holdings: Holding[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // Modal state
  showModal: boolean = false;
  isEditing: boolean = false;
  editingId: string | null = null;
  isSaving: boolean = false;

  // Form fields
  ticker: string = '';
  quantity: number | null = null;
  avgCostBasis: number | null = null;
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

  // CSV Import
  showImportModal: boolean = false;
  importFile: File | null = null;
  importPreview: HoldingImportPreview | null = null;
  isLoadingPreview: boolean = false;
  isImporting: boolean = false;
  importError: string = '';
  importSuccess: string = '';

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Check if logged in first
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadHoldings();
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

  loadHoldings(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getHoldings().subscribe({
      next: (data) => {
        this.holdings = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401) {
          this.router.navigate(['/login']);
        } else {
          this.errorMessage = 'Failed to load holdings';
        }
        this.cdr.detectChanges();
      }
    });
  }

  // Modal handlers
  openAddModal(): void {
    this.resetForm();
    this.isEditing = false;
    this.showModal = true;
  }

  openEditModal(holding: Holding): void {
    this.resetForm();
    this.isEditing = true;
    this.editingId = holding.id;
    this.ticker = holding.ticker;
    this.quantity = holding.quantity;
    this.avgCostBasis = holding.avg_cost_basis;
    this.showModal = true;
  }

  closeModal(): void {
    this.showModal = false;
    this.resetForm();
  }

  resetForm(): void {
    this.ticker = '';
    this.quantity = null;
    this.avgCostBasis = null;
    this.formError = '';
    this.editingId = null;
    this.isSaving = false;
    this.searchResults = [];
    this.showDropdown = false;
    this.isSearching = false;
  }

  saveHolding(): void {
    this.formError = '';

    if (!this.ticker || !this.quantity || !this.avgCostBasis) {
      this.formError = 'Please fill in all fields';
      return;
    }

    if (this.quantity <= 0 || this.avgCostBasis <= 0) {
      this.formError = 'Quantity and cost must be positive numbers';
      return;
    }

    const holdingData: HoldingCreate = {
      ticker: this.ticker.toUpperCase(),
      quantity: this.quantity,
      avg_cost_basis: this.avgCostBasis
    };

    this.isSaving = true;

    if (this.isEditing && this.editingId) {
      this.apiService.updateHolding(this.editingId, holdingData).subscribe({
        next: () => {
          this.closeModal();
          this.loadHoldings();
        },
        error: (error) => {
          this.isSaving = false;
          this.formError = 'Failed to update holding';
        }
      });
    } else {
      this.apiService.createHolding(holdingData).subscribe({
        next: () => {
          this.closeModal();
          this.loadHoldings();
        },
        error: (error) => {
          this.isSaving = false;
          if (error.status === 400) {
            this.formError = 'Invalid ticker symbol';
          } else {
            this.formError = 'Failed to add holding';
          }
        }
      });
    }
  }

  // Delete handlers
  confirmDelete(id: string): void {
    this.deletingId = id;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.deletingId = null;
    this.showDeleteConfirm = false;
  }

  deleteHolding(): void {
    if (!this.deletingId) return;

    this.isDeleting = true;

    this.apiService.deleteHolding(this.deletingId).subscribe({
      next: () => {
        this.isDeleting = false;
        this.cancelDelete();
        this.loadHoldings();
      },
      error: () => {
        this.isDeleting = false;
        this.errorMessage = 'Failed to delete holding';
        this.cancelDelete();
      }
    });
  }

  formatCurrency(value: number): string {
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

  getTotalInvested(): number {
    return this.holdings.reduce((total, h) => total + (h.quantity * h.avg_cost_basis), 0);
  }

  getUniqueStocks(): number {
    return new Set(this.holdings.map(h => h.ticker)).size;
  }

  // Import handlers
  openImportModal(): void {
    this.importFile = null;
    this.importPreview = null;
    this.importError = '';
    this.importSuccess = '';
    this.isLoadingPreview = false;
    this.isImporting = false;
    this.showImportModal = true;
  }

  closeImportModal(): void {
    this.showImportModal = false;
    this.importFile = null;
    this.importPreview = null;
    this.importError = '';
    this.importSuccess = '';
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.importFile = input.files[0];
      this.importError = '';
      this.importSuccess = '';
      this.importPreview = null;
      this.loadPreview();
    }
  }

  loadPreview(): void {
    if (!this.importFile) return;

    this.isLoadingPreview = true;
    this.importError = '';

    this.apiService.previewImport(this.importFile).subscribe({
      next: (preview) => {
        this.importPreview = preview;
        this.isLoadingPreview = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoadingPreview = false;
        this.importError = error.error?.detail || 'Failed to parse CSV file';
        this.cdr.detectChanges();
      }
    });
  }

  confirmImport(): void {
    if (!this.importFile) return;

    this.isImporting = true;
    this.importError = '';

    this.apiService.importHoldings(this.importFile).subscribe({
      next: (result) => {
        this.isImporting = false;
        this.importSuccess = `Successfully imported ${result.imported} new holdings, updated ${result.updated}, skipped ${result.skipped}`;
        this.importPreview = null;
        this.importFile = null;
        this.loadHoldings();
        this.cdr.detectChanges();
        // Auto-close after success
        setTimeout(() => {
          this.closeImportModal();
        }, 2000);
      },
      error: (error) => {
        this.isImporting = false;
        this.importError = error.error?.detail || 'Failed to import holdings';
        this.cdr.detectChanges();
      }
    });
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'new': return 'text-gain';
      case 'update': return 'text-accent';
      case 'skip': return 'text-text-secondary';
      default: return 'text-white';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'new': return 'New';
      case 'update': return 'Update';
      case 'skip': return 'Skip';
      default: return status;
    }
  }
}
