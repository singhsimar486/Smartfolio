import { Component, OnInit, ChangeDetectorRef, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService, WeeklyDigest } from '../../services/api';

@Component({
  selector: 'app-weekly-digest',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './weekly-digest.html',
})
export class WeeklyDigestComponent implements OnInit {
  @Input() isOpen: boolean = false;
  @Output() isOpenChange = new EventEmitter<boolean>();

  digest: WeeklyDigest | null = null;
  isLoading: boolean = false;
  isRefreshing: boolean = false;
  errorMessage: string = '';

  constructor(
    private apiService: ApiService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (this.isOpen) {
      this.loadDigest();
    }
  }

  open(): void {
    this.isOpen = true;
    this.isOpenChange.emit(true);
    this.loadDigest();
  }

  close(): void {
    this.isOpen = false;
    this.isOpenChange.emit(false);
  }

  loadDigest(): void {
    this.isLoading = true;
    this.errorMessage = '';

    this.apiService.getWeeklyDigest().subscribe({
      next: (digest) => {
        this.digest = digest;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Failed to load digest';
        this.cdr.detectChanges();
      }
    });
  }

  refreshDigest(): void {
    this.isRefreshing = true;
    this.apiService.refreshWeeklyDigest().subscribe({
      next: (digest) => {
        this.digest = digest;
        this.isRefreshing = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isRefreshing = false;
        this.errorMessage = 'Failed to refresh digest';
        this.cdr.detectChanges();
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

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getHealthColor(score: number): string {
    if (score >= 80) return 'text-gain';
    if (score >= 60) return 'text-accent';
    if (score >= 40) return 'text-warning';
    return 'text-loss';
  }

  getHealthBgColor(score: number): string {
    if (score >= 80) return 'from-gain/20 to-gain/5';
    if (score >= 60) return 'from-accent/20 to-accent/5';
    if (score >= 40) return 'from-warning/20 to-warning/5';
    return 'from-loss/20 to-loss/5';
  }

  getScoreRingColor(score: number): string {
    if (score >= 80) return 'stroke-gain';
    if (score >= 60) return 'stroke-accent';
    if (score >= 40) return 'stroke-warning';
    return 'stroke-loss';
  }

  getScoreDashOffset(score: number): number {
    const circumference = 2 * Math.PI * 45;
    return circumference - (score / 100) * circumference;
  }
}
