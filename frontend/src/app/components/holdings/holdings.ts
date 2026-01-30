import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService, Holding, HoldingCreate } from '../../services/api';
import { AuthService } from '../../services/auth';
import { Navbar } from '../navbar/navbar';
import { Router } from '@angular/router';

@Component({
  selector: 'app-holdings',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './holdings.html',
  styleUrl: './holdings.css',
})
export class Holdings implements OnInit {
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
}
