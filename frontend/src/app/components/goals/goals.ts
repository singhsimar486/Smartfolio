import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService, PortfolioGoal } from '../../services/api';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-goals',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './goals.html',
})
export class Goals implements OnInit {
  goals: PortfolioGoal[] = [];
  isLoading: boolean = true;
  errorMessage: string = '';

  // Add modal
  showAddModal: boolean = false;
  goalName: string = '';
  targetAmount: number | null = null;
  targetDate: string = '';
  description: string = '';
  isAdding: boolean = false;
  formError: string = '';

  // Delete confirmation
  showDeleteConfirm: boolean = false;
  deletingId: string | null = null;
  deletingName: string = '';
  isDeleting: boolean = false;

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
    this.loadGoals();
  }

  loadGoals(): void {
    this.isLoading = true;
    this.apiService.getGoals().subscribe({
      next: (data) => {
        this.goals = data;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load goals';
        this.cdr.detectChanges();
      }
    });
  }

  openAddModal(): void {
    this.goalName = '';
    this.targetAmount = null;
    this.targetDate = '';
    this.description = '';
    this.formError = '';
    this.showAddModal = true;
  }

  closeAddModal(): void {
    this.showAddModal = false;
  }

  createGoal(): void {
    if (!this.goalName.trim()) {
      this.formError = 'Please enter a goal name';
      return;
    }
    if (!this.targetAmount || this.targetAmount <= 0) {
      this.formError = 'Please enter a valid target amount';
      return;
    }

    this.isAdding = true;

    this.apiService.createGoal({
      name: this.goalName,
      target_amount: this.targetAmount,
      target_date: this.targetDate || undefined,
      description: this.description || undefined
    }).subscribe({
      next: () => {
        this.toastService.showSuccess('Goal Created', 'Your goal has been created');
        this.closeAddModal();
        this.loadGoals();
        this.isAdding = false;
      },
      error: (error) => {
        this.isAdding = false;
        this.formError = error.error?.detail || 'Failed to create goal';
        this.cdr.detectChanges();
      }
    });
  }

  confirmDelete(goal: PortfolioGoal): void {
    this.deletingId = goal.id;
    this.deletingName = goal.name;
    this.showDeleteConfirm = true;
  }

  cancelDelete(): void {
    this.showDeleteConfirm = false;
    this.deletingId = null;
  }

  deleteGoal(): void {
    if (!this.deletingId) return;

    this.isDeleting = true;
    this.apiService.deleteGoal(this.deletingId).subscribe({
      next: () => {
        this.toastService.showSuccess('Deleted', 'Goal has been deleted');
        this.cancelDelete();
        this.loadGoals();
        this.isDeleting = false;
      },
      error: () => {
        this.isDeleting = false;
        this.toastService.showError('Error', 'Failed to delete goal');
      }
    });
  }

  formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return 'No deadline';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getProgressColor(percent: number): string {
    if (percent >= 75) return 'bg-gain';
    if (percent >= 50) return 'bg-accent';
    if (percent >= 25) return 'bg-warning';
    return 'bg-loss';
  }
}
