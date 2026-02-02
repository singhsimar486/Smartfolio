import { Component, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ApiService } from '../../services/api';
import { AuthService } from '../../services/auth';
import { ToastService } from '../../services/toast';
import { Navbar } from '../navbar/navbar';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule, Navbar],
  templateUrl: './settings.html',
})
export class Settings {
  // Password change
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  isChangingPassword: boolean = false;

  // Account deletion
  showDeleteConfirm: boolean = false;
  deletePassword: string = '';
  isDeleting: boolean = false;

  // Export
  isExporting: boolean = false;

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private toastService: ToastService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  changePassword(): void {
    if (!this.currentPassword || !this.newPassword) {
      this.toastService.showError('Error', 'Please fill in all password fields');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.toastService.showError('Error', 'New passwords do not match');
      return;
    }

    if (this.newPassword.length < 6) {
      this.toastService.showError('Error', 'Password must be at least 6 characters');
      return;
    }

    this.isChangingPassword = true;

    this.apiService.changePassword({
      current_password: this.currentPassword,
      new_password: this.newPassword
    }).subscribe({
      next: () => {
        this.toastService.showSuccess('Success', 'Password changed successfully');
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        this.isChangingPassword = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isChangingPassword = false;
        this.toastService.showError('Error', error.error?.detail || 'Failed to change password');
        this.cdr.detectChanges();
      }
    });
  }

  openDeleteConfirm(): void {
    this.deletePassword = '';
    this.showDeleteConfirm = true;
  }

  closeDeleteConfirm(): void {
    this.showDeleteConfirm = false;
    this.deletePassword = '';
  }

  deleteAccount(): void {
    if (!this.deletePassword) {
      this.toastService.showError('Error', 'Please enter your password');
      return;
    }

    this.isDeleting = true;

    this.apiService.deleteAccount(this.deletePassword).subscribe({
      next: () => {
        this.authService.logout();
        this.router.navigate(['/login']);
        this.toastService.showSuccess('Account Deleted', 'Your account has been deleted');
      },
      error: (error) => {
        this.isDeleting = false;
        this.toastService.showError('Error', error.error?.detail || 'Failed to delete account');
        this.cdr.detectChanges();
      }
    });
  }

  exportHoldings(): void {
    this.isExporting = true;
    this.apiService.exportHoldings().subscribe({
      next: (blob) => {
        this.downloadFile(blob, 'holdings.csv');
        this.isExporting = false;
        this.toastService.showSuccess('Exported', 'Holdings exported successfully');
      },
      error: () => {
        this.isExporting = false;
        this.toastService.showError('Error', 'Failed to export holdings');
      }
    });
  }

  exportDividends(): void {
    this.isExporting = true;
    this.apiService.exportDividends().subscribe({
      next: (blob) => {
        this.downloadFile(blob, 'dividends.csv');
        this.isExporting = false;
        this.toastService.showSuccess('Exported', 'Dividends exported successfully');
      },
      error: () => {
        this.isExporting = false;
        this.toastService.showError('Error', 'Failed to export dividends');
      }
    });
  }

  exportPortfolio(): void {
    this.isExporting = true;
    this.apiService.exportPortfolio().subscribe({
      next: (blob) => {
        this.downloadFile(blob, 'portfolio.csv');
        this.isExporting = false;
        this.toastService.showSuccess('Exported', 'Portfolio exported successfully');
      },
      error: () => {
        this.isExporting = false;
        this.toastService.showError('Error', 'Failed to export portfolio');
      }
    });
  }

  private downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  }

  getUserEmail(): string {
    return this.authService.currentUser?.email || '';
  }
}
